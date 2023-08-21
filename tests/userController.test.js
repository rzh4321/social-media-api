const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const session = require('supertest-session');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoTesting.js');
const { use } = require('passport');

// Create some test users
let users = [
  new User({
    name: 'Ricky',
    username: 'ricky@example.com',
    password: 'password123'
  }),
  new User({
    name: 'Bob',
    username: 'bob@example.com',
    password: 'password123'
  }),
  new User({
    name: 'Tom',
    username: 'tom@example.com',
    password: 'password123'
  }),
];

beforeAll(async () => {
  await initializeMongoServer();
  // Save test users to database
  for (let user of users) {
    try {
      const hashed = await bcrypt.hash(user.password, 10);
      user.password = hashed;
      await user.save();
    }
    catch(err) {
      console.error(err);
    }
  }
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

describe('GET /api/users', () => {
  it('should return a list of all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .expect(200);

    expect(res.body).toHaveLength(users.length);
    expect(res.body[0].name).toBe('Ricky');
    expect(res.body[1].name).toBe('Bob');
    expect(res.body[2].name).toBe('Tom');
  });
});

describe('GET /api/users/:userid', () => {
  it('should return a single user', async () => {
    const res = await request(app)
      .get('/api/users/' + users[0]._id)
      .expect(200);

    // Check that the response body contains the test user
    expect(res.body.name).toBe('Ricky');
  });

  it('should return a 404 if the user is not found', async () => {
    const res = await request(app)
      .get('/api/users/' + new mongoose.Types.ObjectId())
      .expect(404);
  });
});

describe('POST /users/:userId/send-friend-request', () => {
  let user = users[0];    // Ricky
  let userToSend = users[1]   // Bob

  let testSession = null;
  let authenticatedSession;
 
  beforeEach(async () => {
    testSession = session(app);
    await testSession
      .post('/api/auth/login')
      .send({
        username: 'ricky@example.com',
        password: 'password123',
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

  it('should return a 401 error if the user is not logged in', async () => {
    await authenticatedSession.post('/api/auth/logout').expect(200);
    // const res = await request(app)
    //   .post(`/api/users/${userToSend._id}/send-friend-request`)
    //   .expect(401);
    const res = await authenticatedSession
      .post(`/api/users/${userToSend._id}/send-friend-request`)
      .expect(401);
  });

  it('should send a friend request from the current user to the specified user', async () => {
    // await request(app)
    //   .post('/api/auth/login')
    //   .send({
    //     username: 'ricky@example.com',
    //     password: 'password123',
    //   });
    // const res = await request(app)
    //   .post(`/api/users/${userToSend._id}/send-friend-request`)
    //   .expect(200);

    // // Check that the friend request was sent successfully
    // expect(res.body.currentUser.friend_requests_sent).toContainEqual(userToSend._id);
    // expect(res.body.userToSend.friend_requests_received).toContainEqual(currentUser._id);
    const res = await authenticatedSession
      .post(`/api/users/${userToSend._id}/send-friend-request`)
      .expect(200);
  });

  it('should return a 404 error if the user to send the friend request to is not found', async () => {
    const res = await authenticatedSession
      .post(`/api/users/999999999999/send-friend-request`)
      .expect(404);

    expect(res.body.message).toBe('User not found');
  });

  it('should return a 400 error if a friend request has already been sent', async () => {
    // Add the user to send the request to to the current user's friend requests sent array
    user.friendRequestsSent.push(userToSend.id);
    await user.save();

    const res = await authenticatedSession
      .post(`/api/users/${userToSend.id}/send-friend-request`)
      .expect(400);
      
    expect(res.body.message).toBe('Friend request already sent');
  });

  it('should return a 400 error if the users are already friends', async () => {
    // Add the user to send the request to to the current user's friends array
    user.friends.push(userToSend.id);
    await user.save();

    const res = await authenticatedSession
      .post(`/api/users/${userToSend.id}/send-friend-request`)
      .expect(400);

    expect(res.body.message).toBe('Already friends');
  });

});