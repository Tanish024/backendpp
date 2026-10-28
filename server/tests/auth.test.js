import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Auth routes', () => {
  it('POST /api/auth/register creates user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'dup@test.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'B', email: 'dup@test.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/login returns token', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@test.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'C', email: 'c@test.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'c@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns user with valid token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Me', email: 'me@test.com', password: 'password123' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });

  it('GET /api/auth/me rejects without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid body with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'bad', password: '1' });
    expect(res.status).toBe(400);
  });
});
