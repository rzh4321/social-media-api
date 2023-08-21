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

describe("GET /api/users", () => {
  it("should return a list of all users", async () => {
    const res = await request(app).get("/api/users").expect(200);

    expect(res.body).toHaveLength(users.length);
    expect(res.body[0].name).toBe("Ricky");
    expect(res.body[1].name).toBe("Bob");
    expect(res.body[2].name).toBe("Tom");
  });
});

describe("GET /api/users/:userid", () => {
  it("should return a single user", async () => {
    const res = await request(app)
      .get("/api/users/" + users[0].id)
      .expect(200);

    // Check that the response body contains the test user
    expect(res.body.name).toBe("Ricky");
  });

  it("should return a 404 if the user is not found", async () => {
    const res = await request(app)
      .get("/api/users/" + new mongoose.Types.ObjectId())
      .expect(404);
  });
});

describe("POST /api/users/send-friend-request/:userId", () => {
  let user = users[0]; // Ricky
  let userToSend = users[1]; // Bob

  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    testSession = session(app);
    await testSession
      .post("/api/auth/login")
      .send({
        username: "ricky@example.com",
        password: "password123",
      })
      .expect(200);
    authenticatedSession = testSession;
    console.log("session authenticated");
    // .end((err) => {
    //   if (err) console.error(err);
    //   else {
    //     authenticatedSession = testSession;
    //     console.log('session authenticated');
    //   }
    // });
  });

  it("should return a 401 error if the user is not logged in", async () => {
    await authenticatedSession.post("/api/auth/logout").expect(200);
    // const res = await request(app)
    //   .post(`/api/users/${userToSend._id}/send-friend-request`)
    //   .expect(401);
    await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSend.id}`)
      .expect(401);
  });

  it("should send a friend request from the current user to the specified user", async () => {
    // await request(app)
    //   .post('/api/auth/login')
    //   .send({
    //     username: 'ricky@example.com',
    //     password: 'password123',
    //   });
    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSend.id}`)
      .expect(200);

    // Check that the friend request was sent successfully
    expect(res.body.currentUser.friendRequestsSent).toContainEqual(
      userToSend.id,
    );
    expect(res.body.userToSend.friendRequestsReceived).toContainEqual(user.id);
  });

  it("should return a 404 error if the user to send the friend request to is not found", async () => {
    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/999999999999`)
      .expect(404);

    expect(res.body.message).toBe("User not found");
  });

  it("should return a 400 error if a friend request has already been sent", async () => {
    const currentUser = await User.findById(user.id);
    // Add the user to send the request to to the current user's friend requests sent array
    currentUser.friendRequestsSent.push(userToSend.id);
    await currentUser.save();

    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSend.id}`)
      .expect(400);

    currentUser.friendRequestsSent = [];
    await currentUser.save();
    console.log(currentUser.friendRequestsSent);

    expect(res.body.message).toBe("Friend request already sent");
  });

  it("should return a 400 error if the users are already friends", async () => {
    const currentUser = await User.findById(user.id);
    // currentUser.friendRequestsSent.pop();
    // Add the user to send the request to to the current user's friends array
    currentUser.friends.push(userToSend.id);
    await currentUser.save();

    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSend.id}`)
      .expect(400);

    expect(res.body.message).toBe("Already friends");
  });
});

describe("POST /api/users/accept-friend-request/:userId", () => {
  let user = users[1]; // Bob
  let userFriendRequestFrom = users[0]; // Ricky

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
    // send friend request to Bob
    await testSession.post(`/api/users/send-friend-request/${user.id}`);
    // Now sign in Bob (we can sign in twice, we prevent that in frontend)
    // We will remain signed in Bob's account in our tests below
    await testSession.post("/api/auth/login").send({
      username: "bob@example.com",
      password: "password123",
    });
  });

  it("should return a 401 error if the user is not logged in", async () => {
    await testSession.post("/api/auth/logout").expect(200);
    const res = await testSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom.id}`)
      .expect(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("should accept friend request from the user", async () => {
    const res = await testSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom.id}`)
      .expect(200);

    expect(res.body.message).toBe("Friend request accepted");
    expect(res.body.user.friends).toContainEqual(userFriendRequestFrom.id);
    expect(res.body.user.friendRequestsReceived).not.toContainEqual(
      userFriendRequestFrom.id,
    );
    expect(res.body.otherUser.friends).toContainEqual(user.id);
    expect(res.body.otherUser.friendRequestsSent).not.toContainEqual(user.id);
  });

  it("should return a 404 error if the user is not found", async () => {
    // Delete Bob from DB
    await User.findByIdAndDelete(user.id);
    const res = await testSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom.id}`)
      .expect(404);
    expect(res.body.message).toBe("User not found");
  });

  it("should return a 404 error if the userFriendRequestFrom is not found", async () => {
    // Delete Ricky from DB
    await User.findByIdAndDelete(userFriendRequestFrom.id);
    const res = await testSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom.id}`)
      .expect(404);

    // sign up Ricky again
    let signUpRes = await request(app)
      .post("/api/auth/signup")
      .send(users[0])
      .expect(201);
    users[0].id = signUpRes.body._id;

    // sign up Bob again (idk why he got deleted)
    signUpRes = await request(app)
      .post("/api/auth/signup")
      .send(users[1])
      .expect(201);
    users[1].id = signUpRes.body._id;

    expect(res.body.message).toBe("User not found");
  });

  it("should return a 400 error if the user is already a friend", async () => {
    // Add Ricky to Bob's friends array
    const currentUser = await User.findById(user.id);
    console.log(currentUser);
    currentUser.friends.push(userFriendRequestFrom.id);
    await currentUser.save();

    const res = await testSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom.id}`)
      .expect(400);
    expect(res.body.message).toBe("Already friends");
  });
});

describe("GET /api/users/accept-friend-request/:userId", () => {
  let user = users[0]; // Ricky

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
    expect(res.body).toHaveLength(0);
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
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toBe(bob.id);

    // Add Tom to Ricky's friends array
    const tom = users[2];
    currentUser.friends.push(tom.id);
    await currentUser.save();
    res = await testSession.get(`/api/users/${user.id}/friends`).expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body).toContainEqual(bob.id);
    expect(res.body).toContainEqual(tom.id);
  });
});
