const request = require("supertest");
const app = require("../app");
const User = require("../models/user");
const session = require("supertest-session");
const {
  initializeMongoServer,
  closeMongoServer,
  clearMongoServer,
} = require("./mongoTesting.js");

beforeAll(async () => {
  await initializeMongoServer();
  await request(app)
    .post("/api/auth/signup")
    .send({
      name: "Alice",
      username: "alice@example.com",
      password: "password123",
    })
    .expect(201);
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

let testSession = null;

beforeEach(async () => {
  testSession = session(app);
});

describe("POST /api/auth/signup", () => {
  it("should create a new user and log in", async () => {
    await testSession.get("/protected").expect(401);
    await testSession
      .post("/api/auth/signup")
      .send({
        name: "Dave",
        username: "dave@example.com",
        password: "password123",
      })
      .expect(201);

    const user = await User.findOne({ username: "dave@example.com" });
    expect(user.name).toBe("Dave");
    await testSession
      .post("/api/auth/login")
      .send({
        username: "dave@example.com",
        password: "password123",
      })
      .expect(200);
    await testSession.get("/protected").expect(200);
  });

  it("should reject users with duplicate usernames", async () => {
    const res = await testSession
      .post("/api/auth/signup")
      .send({
        name: "Dave",
        username: "dave@example.com",
        password: "password123",
      })
      .expect(400);
  });
});

describe("POST /api/auth/login", () => {
  it("should log in existing user and be able to access protected route", async () => {
    await testSession.get("/protected").expect(401);
    const res = await testSession
      .post("/api/auth/login")
      .send({
        username: "alice@example.com",
        password: "password123",
      })
      .expect(200);
    await testSession.get("/protected").expect(200);
  });

  it("should reject users with incorrect password", async () => {
    const res = await testSession
      .post("/api/auth/login")
      .send({
        username: "alice@example.com",
        password: "incorrectPassword",
      })
      .expect(401);
    await testSession.get("/protected").expect(401);
  });

  it("should reject users with incorrect username", async () => {
    const res = await testSession
      .post("/api/auth/login")
      .send({
        username: "incorrectUsername",
        password: "password123",
      })
      .expect(401);
    await testSession.get("/protected").expect(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("should log out existing user", async () => {
    const res = await testSession
      .post("/api/auth/login")
      .send({
        username: "alice@example.com",
        password: "password123",
      })
      .expect(200);
    await testSession.get("/protected").expect(200);
    await testSession.post("/api/auth/logout").expect(200);
    await testSession.get("/protected").expect(401);
  });
});
