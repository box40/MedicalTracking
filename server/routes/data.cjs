const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medtrack-dev-secret-change-in-prod';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorised.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired.' });
  }
}

// GET /api/data — fetch user's data
router.get('/', requireAuth, (req, res) => {
  const row = db.prepare('SELECT data FROM user_data WHERE user_id = ?').get(req.user.userId);
  if (!row) return res.status(404).json({ error: 'User data not found.' });
  res.json(JSON.parse(row.data));
});

// PUT /api/data — save (replace) user's data
router.put('/', requireAuth, (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload.' });

  // Always keep the canonical email from the JWT
  payload.email = req.user.email;

  db.prepare(`
    INSERT INTO user_data (user_id, data, updated_at) VALUES (?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(req.user.userId, JSON.stringify(payload));

  res.json({ ok: true });
});

module.exports = router;
