const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medtrack-dev-secret-change-in-prod';
const TOKEN_TTL = '30d';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const normalised = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalised);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(normalised, hash);
  const userId = result.lastInsertRowid;

  // Seed an empty user_data row
  db.prepare('INSERT INTO user_data (user_id, data) VALUES (?, ?)').run(
    userId,
    JSON.stringify({ email: normalised, pills: [], logs: [], settings: { fontSize: '1.25rem' } })
  );

  const token = jwt.sign({ userId, email: normalised }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, email: normalised });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const normalised = email.toLowerCase().trim();
  const user = db.prepare('SELECT id, password FROM users WHERE email = ?').get(normalised);
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = jwt.sign({ userId: user.id, email: normalised }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, email: normalised });
});

module.exports = router;
