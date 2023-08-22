const request = require("supertest");
const app = require("../app");
const User = require("../models/user");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const session = require("supertest-session");
const {
  initializeMongoServer,
  closeMongoServer,
  clearMongoServer,
} = require("./mongoTesting.js");
const { use } = require("passport");

// Create some test users
let users = [
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
  {
    name: "Tom",
    username: "tom@example.com",
    password: "password123",
  },
];

async function addMockUsersToDB() {
  // Save test users to database
  for (let user of users) {
    const res = await request(app).post("/api/auth/signup").send(user);
    user.id = res.body._id;
  }
}

beforeAll(async () => {
  await initializeMongoServer();
  await addMockUsersToDB();
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

describe("GET /api/users", () => {
  it("should return a list of all users", async () => {
    const res = await request(app).get("/api/users").expect(200);

    expect(res.body.users).toHaveLength(users.length);
    expect(res.body.users[0].name).toBe("Ricky");
    expect(res.body.users[1].name).toBe("Bob");
    expect(res.body.users[2].name).toBe("Tom");
  });

  it("should return an empty list if no users are found", async () => {
    // Delete all users
    await User.deleteMany({});
    const res = await request(app).get("/api/users").expect(200);
    expect(res.body.users).toHaveLength(0);
    // Add users back to DB
    await addMockUsersToDB();
  });
});

describe("GET /api/users/:userid", () => {
  it("should return a single user", async () => {
    const res = await request(app)
      .get("/api/users/" + users[0].id)
      .expect(200);

    // Check that the response body contains the test user
    expect(res.body.user.name).toBe("Ricky");
  });

  it("should return a 404 if the user is not found", async () => {
    const res = await request(app)
      .get("/api/users/" + new mongoose.Types.ObjectId())
      .expect(404);
    expect(res.body.message).toBe("User not found");
  });
});

describe("GET /api/user/:userId/friends", () => {
  const user = users[0]; // Ricky

  let testSession = null;

  beforeEach(async () => {
    testSession = session(app);
    await testSession
      .post("/api/auth/login")
      .send({
        username: "ricky@example.com",
        password: "password123",
      })
      .expect(200);
  });

  it("should return empty array if the user friends array is empty", async () => {
    const res = await testSession
      .get(`/api/users/${user.id}/friends`)
      .expect(200);
    expect(res.body.friends).toHaveLength(0);
  });

  it("should return a 404 error if the user is not found", async () => {
    const res = await testSession
      .get(`/api/users/${new mongoose.Types.ObjectId()}/friends`)
      .expect(404);
    expect(res.body.message).toBe("User not found");
  });

  it("should return a list of friends", async () => {
    // Add Bob to Ricky's friends array
    const bob = users[1];
    const currentUser = await User.findById(user.id);
    currentUser.friends.push(bob.id);
    await currentUser.save();
    let res = await testSession
      .get(`/api/users/${user.id}/friends`)
      .expect(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends[0]._id).toBe(bob.id);

    // Add Tom to Ricky's friends array
    const tom = users[2];
    currentUser.friends.push(tom.id);
    await currentUser.save();
    res = await testSession.get(`/api/users/${user.id}/friends`).expect(200);
    expect(res.body.friends).toHaveLength(2);
    expect(res.body.friends[0]._id).toBe(bob.id);
    expect(res.body.friends[1]._id).toBe(tom.id);
  });
});

describe("GET /api/users/:userid/posts", () => {
  const user = users[0]; // Ricky

  let testSession = null;

  beforeEach(async () => {
    testSession = session(app);
    await testSession
      .post("/api/auth/login")
      .send({
        username: "ricky@example.com",
        password: "password123",
      })
      .expect(200);
  });

  it("should return empty array if the user posts array is empty", async () => {
    const res = await testSession
      .get(`/api/users/${user.id}/posts`)
      .expect(200);
    expect(res.body.posts).toHaveLength(0);
  });

  it("should return 404 error if the user is not found", async () => {
    const res = await testSession
      .get(`/api/users/${new mongoose.Types.ObjectId()}/posts`)
      .expect(404);
    expect(res.body.message).toBe("User not found");
  });

  it("should return a list of posts", async () => {
    // Ricky makes a post
    await testSession
      .post("/api/authuser/posts")
      .send({ content: "This is a test post" })
      .expect(201);
    let res = await testSession.get(`/api/users/${user.id}/posts`).expect(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts).toContainEqual(
      expect.objectContaining({
        user: expect.objectContaining({ name: user.name }),
      }),
    );
    expect(res.body.posts).toContainEqual(
      expect.objectContaining({ content: "This is a test post" }),
    );
    // Post another post to database
    await testSession
      .post("/api/authuser/posts")
      .send({ content: "This is another test post" })
      .expect(201);
    res = await testSession.get(`/api/users/${user.id}/posts`).expect(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.posts).toContainEqual(
      expect.objectContaining({ content: "This is another test post" }),
    );
  });
});
