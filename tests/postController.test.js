const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const Post = require('../models/post');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const session = require('supertest-session');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoTesting.js');

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

  describe('GET /api/posts/:postid', () => {
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


    it('should return 404 error if the post is not found', async () => {
        const res = await testSession
          .get(`/api/posts/${new mongoose.Types.ObjectId()}`)
          .expect(404);
        expect(res.body.message).toBe('Post not found');
      });

      it('should return the post with postid', async () => {
        let res = await testSession
          .post('/api/authuser/posts').send(mockPost).expect(201);
        mockPost.id = res.body.post._id;
        // Post another post
        await testSession
          .post('/api/authuser/posts').send({ content: 'stuff'}).expect(201);
        // Get the first post
        res = await testSession
          .get(`/api/posts/${mockPost.id}`)
          .expect(200);
        expect(res.body.post.content).toBe(mockPost.content);
        expect(res.body.post.user._id).toBe(user.id.toString());
      });

  });

  describe.only('GET /api/posts', () => {
    let user = users[0]; // Ricky
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
  
    it('should return a empty array if no posts are found', async () => {
      const res = await testSession
        .get('/api/posts')
        .expect(200);
      expect(res.body.posts).toHaveLength(0);
    });

    it('should return a list of posts in correct order', async () => {
      // Ricky makes some posts
      let res = await testSession
        .post('/api/authuser/posts').send(mockPost).expect(201);
      await testSession
        .post('/api/authuser/posts').send({ content: 'Second post'}).expect(201);
      await testSession
        .post('/api/authuser/posts').send({ content: 'Third post'}).expect(201);
      // Get the post
      res = await testSession
        .get('/api/posts')
        .expect(200);
      expect(res.body.posts).toHaveLength(3);
      expect(res.body.posts[2].content).toBe(mockPost.content);
      expect(res.body.posts[1].content).toBe('Second post');
      expect(res.body.posts[0].content).toBe('Third post');
    })

  });