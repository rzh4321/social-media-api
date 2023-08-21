const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const session = require('supertest-session');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoTesting.js');
const { use } = require('passport');

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

  describe('POST /api/authuser/posts', () => {
    const user = users[0]; // Ricky
    let testSession = null;
  
    beforeEach(async () => {
      // Log in as Ricky
      testSession = session(app);
      await testSession.post('/api/auth/login').send({
        username: user.username,
        password: user.password,
      })
      .expect(200);
    });

    it('should return 401 error if user is not logged in', async () => {
        // Log out Ricky
        await testSession.post('/api/auth/logout').expect(200);
        const res = await testSession
          .post('/api/authuser/posts')
          .send(mockPost)
          .expect(401);
        expect(res.body.message).toBe('Unauthorized');
      });

      it('should return 404 error if the user is not found in database', async () => {
        // Log in as Bob
        await testSession.post('/api/auth/login').send({
          username: users[1].username,
          password: users[1].password,
        });
        // Delete Bob from the database
        await User.deleteOne({
          _id: users[1].id,
        });
        const res = await testSession
          .post('/api/authuser/posts')
          .send(mockPost)
          .expect(404);
        expect(res.body.message).toBe('User not found');
        // Add Bob back to the database
        const signUpRes = await request(app)
            .post("/api/auth/signup")
            .send(users[1])
            .expect(201);
        users[1].id = signUpRes.body._id;
      });

      it('should create and return a new post', async () => {
        const res = await testSession
          .post('/api/authuser/posts')
          .send(mockPost)
          .expect(201);
        expect(res.body.post.content).toBe(mockPost.content);
        expect(res.body.post.user).toBe(user.id.toString());
      });
    
      it('should reject posts with invalid content', async () => {
        const res = await testSession
          .post('/api/authuser/posts')
          .send({
            content: ' ',
          })
          .expect(400);
        expect(res.body.errors[0].path).toBe('content');
        expect(res.body.errors[0].msg).toBe('Content is required');
      });

});

describe('GET /api/authuser/posts', () => {
    const user = users[0]; // Ricky
    let testSession = null;
  
    beforeEach(async () => {
      // Clear Post collection
      await Post.deleteMany({});
      // Log in as Ricky
      testSession = session(app);
      await testSession.post('/api/auth/login').send({
        username: user.username,
        password: user.password,
      })
      .expect(200);
    });

    it('should return 401 error if user is not logged in', async () => {
        await testSession.post('/api/auth/logout').expect(200);
        const res = await testSession
          .get('/api/authuser/posts')
          .expect(401);
        expect(res.body.message).toBe('Unauthorized');
      });

      it('should return 404 error if the user is not found in database', async () => {
        // Log in as Bob
        await testSession.post('/api/auth/login').send({
          username: users[1].username,
          password: users[1].password,
        });
        // Delete Bob from the database
        await User.deleteOne({
          _id: users[1].id,
        });
        const res = await testSession
          .get('/api/authuser/posts')
          .expect(404);
        expect(res.body.message).toBe('User not found');
        // Add Bob back to the database
        const signUpRes = await request(app)
            .post("/api/auth/signup")
            .send(users[1])
            .expect(201);
        users[1].id = signUpRes.body._id;
      });

      it('should return a list of posts', async () => {
        // Create a post for Ricky
        await testSession
          .post('/api/authuser/posts')
          .send(mockPost)
          .expect(201);
        let res = await testSession
          .get('/api/authuser/posts')
          .expect(200);
        expect(res.body.posts.length).toBe(1);
        expect(res.body.posts[0].content).toBe(mockPost.content);
    
        // Create another post for Ricky
        await testSession
          .post('/api/authuser/posts')
          .send({ content: 'This is a test post 2' })
          .expect(201);
        res = await testSession
          .get('/api/authuser/posts')
          .expect(200);
        expect(res.body.posts.length).toBe(2);
        expect(res.body.posts[1].content).toBe('This is a test post 2');
      });

});