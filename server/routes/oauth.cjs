/**
 * OAuth routes — Google, Apple, Yahoo (via OIDC)
 *
 * Required env vars per provider:
 *
 * Google:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   Authorized redirect URI: <your-domain>/api/auth/google/callback
 *   Setup: https://console.cloud.google.com → APIs & Services → Credentials
 *
 * Apple:
 *   APPLE_CLIENT_ID   (your Services ID, e.g. com.example.medtrack)
 *   APPLE_TEAM_ID     (10-char Team ID from developer.apple.com)
 *   APPLE_KEY_ID      (Key ID of your Sign In with Apple key)
 *   APPLE_PRIVATE_KEY (contents of the .p8 file, newlines as \n)
 *   Authorized redirect URI: <your-domain>/api/auth/apple/callback
 *   Setup: developer.apple.com → Certificates → Identifiers → Services IDs
 *
 * Yahoo:
 *   YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET
 *   Authorized redirect URI: <your-domain>/api/auth/yahoo/callback
 *   Setup: developer.yahoo.com → My Apps → Create App
 */

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medtrack-dev-secret-change-in-prod';
const TOKEN_TTL = '30d';

// ─── Helpers ────────────────────────────────────────────────────────────────

function issueJWT(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function findOrCreateOAuthUser(email, provider, oauthId) {
  const normalised = email.toLowerCase().trim();

  // 1. Existing user matched by provider+id
  let user = db.prepare(
    'SELECT id, email FROM users WHERE oauth_provider = ? AND oauth_id = ?'
  ).get(provider, oauthId);
  if (user) return { userId: user.id, email: user.email };

  // 2. Existing user matched by email — link the OAuth account
  user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalised);
  if (user) {
    db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?')
      .run(provider, oauthId, user.id);
    return { userId: user.id, email: normalised };
  }

  // 3. Brand-new user
  const result = db.prepare(
    'INSERT INTO users (email, password, oauth_provider, oauth_id) VALUES (?, ?, ?, ?)'
  ).run(normalised, '__oauth__', provider, oauthId);
  const userId = result.lastInsertRowid;
  db.prepare('INSERT INTO user_data (user_id, data) VALUES (?, ?)').run(
    userId,
    JSON.stringify({ email: normalised, pills: [], logs: [], settings: { fontSize: '1.25rem' } })
  );
  return { userId, email: normalised };
}

function oauthSuccess(res, userId, email) {
  const token = issueJWT(userId, email);
  res.redirect(`/?token=${token}&email=${encodeURIComponent(email)}`);
}

function oauthError(res, msg) {
  res.redirect(`/?oauth_error=${encodeURIComponent(msg)}`);
}

// ─── Which providers are configured ─────────────────────────────────────────

router.get('/providers', (req, res) => {
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple:  !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
    yahoo:  !!(process.env.YAHOO_CLIENT_ID && process.env.YAHOO_CLIENT_SECRET),
  });
});

// ─── Google ──────────────────────────────────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  '/api/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email returned from Google'));
      try {
        const user = findOrCreateOAuthUser(email, 'google', profile.id);
        done(null, user);
      } catch (e) { done(e); }
    }
  ));

  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );
  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/?oauth_error=google_failed' }),
    (req, res) => oauthSuccess(res, req.user.userId, req.user.email)
  );
}

// ─── Apple ───────────────────────────────────────────────────────────────────

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
  const AppleStrategy = require('passport-apple');
  passport.use(new AppleStrategy(
    {
      clientID:    process.env.APPLE_CLIENT_ID,
      teamID:      process.env.APPLE_TEAM_ID,
      keyID:       process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      callbackURL: '/api/auth/apple/callback',
      passReqToCallback: false,
    },
    (accessToken, refreshToken, idToken, profile, done) => {
      const email = idToken?.email || profile?.email;
      const sub   = idToken?.sub   || profile?.id;
      if (!email || !sub) return done(new Error('No email returned from Apple'));
      try {
        const user = findOrCreateOAuthUser(email, 'apple', sub);
        done(null, user);
      } catch (e) { done(e); }
    }
  ));

  router.get('/apple',
    passport.authenticate('apple', { session: false })
  );
  router.post('/apple/callback',
    passport.authenticate('apple', { session: false, failureRedirect: '/?oauth_error=apple_failed' }),
    (req, res) => oauthSuccess(res, req.user.userId, req.user.email)
  );
}

// ─── Yahoo (OIDC) ────────────────────────────────────────────────────────────

if (process.env.YAHOO_CLIENT_ID && process.env.YAHOO_CLIENT_SECRET) {
  const { Issuer } = require('openid-client');
  const APP_URL = process.env.APP_URL || 'http://localhost:3001';

  Issuer.discover('https://login.yahoo.com').then(yahooIssuer => {
    const client = new yahooIssuer.Client({
      client_id:     process.env.YAHOO_CLIENT_ID,
      client_secret: process.env.YAHOO_CLIENT_SECRET,
      redirect_uris: [`${APP_URL}/api/auth/yahoo/callback`],
      response_types: ['code'],
    });

    router.get('/yahoo', (req, res) => {
      const authUrl = client.authorizationUrl({
        scope: 'openid email profile',
        state: 'yahoo_state',
      });
      res.redirect(authUrl);
    });

    router.get('/yahoo/callback', async (req, res) => {
      try {
        const params   = client.callbackParams(req);
        const tokens   = await client.callback(`${APP_URL}/api/auth/yahoo/callback`, params, { state: 'yahoo_state' });
        const userinfo = await client.userinfo(tokens.access_token);
        const email    = userinfo.email;
        const sub      = userinfo.sub;
        if (!email || !sub) return oauthError(res, 'No email returned from Yahoo');
        const user = findOrCreateOAuthUser(email, 'yahoo', sub);
        oauthSuccess(res, user.userId, user.email);
      } catch (e) {
        oauthError(res, 'yahoo_failed');
      }
    });
  }).catch(err => {
    console.warn('Yahoo OIDC discovery failed:', err.message);
  });
}

module.exports = router;
