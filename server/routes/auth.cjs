const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db.cjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medtrack-dev-secret-change-in-prod';
const TOKEN_TTL = '30d';

// ─── Register ─────────────────────────────────────────────────────────────────

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

  db.prepare('INSERT INTO user_data (user_id, data) VALUES (?, ?)').run(
    userId,
    JSON.stringify({ email: normalised, pills: [], logs: [], settings: { fontSize: '1.25rem' } })
  );

  const token = jwt.sign({ userId, email: normalised }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, email: normalised });
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const normalised = email.toLowerCase().trim();
  const user = db.prepare('SELECT id, password FROM users WHERE email = ?').get(normalised);
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  // OAuth-only accounts have no password
  if (user.password === '__oauth__') {
    return res.status(401).json({ error: 'This account uses social sign-in. Please use the Google, Apple, or Yahoo button.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = jwt.sign({ userId: user.id, email: normalised }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, email: normalised });
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const normalised = email.toLowerCase().trim();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalised);

  // Always respond the same way to prevent email enumeration
  const genericOk = { message: 'If that email exists, a reset link has been sent.' };

  if (!user) return res.json(genericOk);

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

  db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?')
    .run(resetToken, expiry, user.id);

  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const resetLink = `${APP_URL}/?reset_token=${resetToken}`;

  // Send email if SMTP is configured
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: normalised,
        subject: 'MedTrack AI — Reset your password',
        text: `Click the link below to reset your password. It expires in 1 hour.\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
        html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, ignore this email.</p>`,
      });
    } catch (err) {
      console.error('Failed to send reset email:', err.message);
      return res.status(500).json({ error: 'Failed to send reset email. Please contact your administrator.' });
    }
  } else {
    // No SMTP — return the link directly (admin-only / dev mode)
    return res.json({ ...genericOk, resetLink, _dev: 'SMTP not configured — link returned for admin use only.' });
  }

  res.json(genericOk);
});

// ─── Reset Password ───────────────────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const now = Math.floor(Date.now() / 1000);
  const user = db.prepare(
    'SELECT id, email FROM users WHERE reset_token = ? AND reset_token_expiry > ?'
  ).get(token, now);

  if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?')
    .run(hash, user.id);

  const jwtToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ message: 'Password updated successfully.', token: jwtToken, email: user.email });
});

module.exports = router;
