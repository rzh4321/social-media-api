const request = require("supertest");
const app = require("../app");
const User = require("../models/user");
const Post = require("../models/post");
// const Like = require("../models/like");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const session = require("supertest-session");
const {
  initializeMongoServer,
  closeMongoServer,
  clearMongoServer,
} = require("./mongoTesting.js");

// Create some test users
const users = [
  {
    name: "Ricky",
    username: "ricky@example.com",
    password: "password123",
  },
  {
    name: "Bob",
    username: "bob@example.com",
    password: "password123",
  },
];

const mockPost = {
  content: "test post",
};

const mockComment = {
  content: "test comment",
};

beforeAll(async () => {
  await initializeMongoServer();
  // Save test users to database
  for (let user of users) {
    const res = await request(app)
      .post("/api/auth/signup")
      .send(user)
      .expect(201);
    user.id = res.body._id;
  }
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

describe("GET /api/posts/:postid", () => {
  const user = users[0]; // Ricky
  let testSession = null;

  beforeEach(async () => {
    // Log in as Ricky
    testSession = session(app);
    await testSession
      .post("/api/auth/login")
      .send({
        username: user.username,
        password: user.password,
      })
      .expect(200);
  });

  afterAll(async () => {
    // Clear all posts made in tests
    await Post.deleteMany({});
  });

  it("should return 404 error if the post is not found", async () => {
    const res = await testSession
      .get(`/api/posts/${new mongoose.Types.ObjectId()}`)
      .expect(404);
    expect(res.body.message).toBe("Post not found");
  });

  it("should return the post with postid", async () => {
    // Ricky makes a post
    let res = await testSession
      .post("/api/authuser/posts")
      .send(mockPost)
      .expect(201);
    mockPost.id = res.body.post._id;
    // Post another post
    await testSession
      .post("/api/authuser/posts")
      .send({ content: "stuff" })
      .expect(201);
    // Get the first post
    res = await testSession.get(`/api/posts/${mockPost.id}`).expect(200);
    expect(res.body.post.content).toBe(mockPost.content);
    expect(res.body.post.user._id).toBe(user.id.toString());
  });
});

describe("GET /api/posts", () => {
  let user = users[0]; // Ricky
  let testSession = null;

  beforeEach(async () => {
    // Log in as Ricky
    testSession = session(app);
    await testSession
      .post("/api/auth/login")
      .send({
        username: user.username,
        password: user.password,
      })
      .expect(200);
  });

  it("should return a empty array if no posts are found", async () => {
    const res = await testSession.get("/api/posts").expect(200);
    expect(res.body.posts).toHaveLength(0);
  });

  it("should return a list of posts in correct order", async () => {
    // Ricky makes some posts
    let res = await testSession
      .post("/api/authuser/posts")
      .send(mockPost)
      .expect(201);
    await testSession
      .post("/api/authuser/posts")
      .send({ content: "Second post" })
      .expect(201);
    await testSession
      .post("/api/authuser/posts")
      .send({ content: "Third post" })
      .expect(201);
    // Get the post
    res = await testSession.get("/api/posts").expect(200);
    expect(res.body.posts).toHaveLength(3);
    expect(res.body.posts[2].content).toBe(mockPost.content);
    expect(res.body.posts[1].content).toBe("Second post");
    expect(res.body.posts[0].content).toBe("Third post");
  });
});

describe("GET /api/posts/:postid/comments", () => {
  let user = users[0]; // Ricky
  let testSession = null;

  beforeEach(async () => {
    // Log in as Ricky
    testSession = session(app);
    await testSession
      .post("/api/auth/login")
      .send({
        username: user.username,
        password: user.password,
      })
      .expect(200);
    // Ricky makes a post
    const res = await testSession
      .post("/api/authuser/posts")
      .send(mockPost)
      .expect(201);
    mockPost.id = res.body.post._id;
  });

  it("should return an empty array if no comments are found", async () => {
    const res = await testSession
      .get(`/api/posts/${mockPost.id}/comments`)
      .expect(200);
    expect(res.body.comments).toHaveLength(0);
  });

  it("should return a 404 error if the post is not found", async () => {
    // Delete the posts
    await Post.deleteMany({});
    const res = await testSession
      .get(`/api/posts/${mockPost.id}/comments`)
      .expect(404);
    expect(res.body.message).toBe("Post not found");
  });

  it("should return a list of comments", async () => {
    // Ricky makes a comment
    let res = await testSession
      .post(`/api/authuser/posts/${mockPost.id}/comments`)
      .send(mockComment)
      .expect(201);
    mockComment.id = res.body.comment._id;
    res = await testSession
      .get(`/api/posts/${mockPost.id}/comments`)
      .expect(200);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({ content: mockComment.content }),
    );
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({
        user: expect.objectContaining({ name: user.name }),
      }),
    );
    // Sign in as Bob and post a comment
    await testSession
      .post("/api/auth/login")
      .send({
        username: users[1].username,
        password: users[1].password,
      })
      .expect(200);
    res = await testSession
      .post(`/api/authuser/posts/${mockPost.id}/comments`)
      .send({ content: "Comment from Bob" })
      .expect(201);
    res = await testSession
      .get(`/api/posts/${mockPost.id}/comments`)
      .expect(200);
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({ content: "Comment from Bob" }),
    );
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({
        user: expect.objectContaining({ username: users[1].username }),
      }),
    );
  });
});

describe("GET /api/posts/:postid/likes", () => {
  let user = users[0]; // Ricky
  let testSession = null;

  beforeEach(async () => {
    // Log in as Ricky
    testSession = session(app);
    await testSession
      .post("/api/auth/login")
      .send({
        username: user.username,
        password: user.password,
      })
      .expect(200);
    // Ricky makes a post
    const res = await testSession
      .post("/api/authuser/posts")
      .send(mockPost)
      .expect(201);
    mockPost.id = res.body.post._id;
  });

  it("should return a list of likes", async () => {
    // Ricky likes his own post
    let res = await testSession
      .post(`/api/authuser/posts/${mockPost.id}/give-like`)
      .expect(200);
    res = await testSession.get(`/api/posts/${mockPost.id}/likes`).expect(200);
    expect(res.body.likes).toHaveLength(1);
    expect(res.body.likes[0].post._id.toString()).toBe(mockPost.id.toString());
    expect(res.body.likes[0].user).toBe(user.id.toString());
    // Log in as Bob and give a like
    await testSession
      .post("/api/auth/login")
      .send({
        username: users[1].username,
        password: users[1].password,
      })
      .expect(200);
    res = await testSession
      .post(`/api/authuser/posts/${mockPost.id}/give-like`)
      .expect(200);
    res = await testSession.get(`/api/posts/${mockPost.id}/likes`).expect(200);
    expect(res.body.likes).toHaveLength(2);
    expect(res.body.likes[1].post._id.toString()).toBe(mockPost.id.toString());
    expect(res.body.likes[1].user).toBe(users[1].id.toString());
  });

  it("should return an empty array if no likes are found", async () => {
    const res = await testSession
      .get(`/api/posts/${mockPost.id}/likes`)
      .expect(200);
    expect(res.body.likes).toHaveLength(0);
  });

  it("should return a 404 error if the post is not found", async () => {
    // Delete the posts
    await Post.deleteMany({});
    const res = await testSession
      .get(`/api/posts/${mockPost.id}/likes`)
      .expect(404);
    expect(res.body.message).toBe("Post not found");
  });
});
