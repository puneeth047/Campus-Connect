const express = require('express');
const crypto = require('crypto');
const router = express.Router();

function isConfigured() {
  return Boolean(process.env.ORGANIZER_EMAIL && process.env.ORGANIZER_PASSWORD && process.env.JWT_SECRET);
}

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !process.env.JWT_SECRET) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Check whether organizer login is configured
router.get('/status', (req, res) => {
  if (!isConfigured()) {
    return res.json({
      configured: false,
      message: 'Organizer login is not configured. Set ORGANIZER_EMAIL, ORGANIZER_PASSWORD and JWT_SECRET in the root .env file.'
    });
  }
  res.json({ configured: true });
});

// Organizer login
router.post('/organizer-login', (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      error: 'Organizer login is not configured. Set ORGANIZER_EMAIL, ORGANIZER_PASSWORD and JWT_SECRET in the root .env file.'
    });
  }
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const expectedEmail = String(process.env.ORGANIZER_EMAIL).trim().toLowerCase();
  const expectedPassword = String(process.env.ORGANIZER_PASSWORD);
  if (email !== expectedEmail || password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const token = signToken({
    role: 'organizer',
    email,
    exp: Date.now() + 12 * 60 * 60 * 1000 // 12 hours
  });
  res.json({
    token,
    organizer: { email, name: 'Organizer' },
    message: 'Login successful'
  });
});

// Middleware helper (exported for other routes if needed)
function requireOrganizer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'organizer') {
    return res.status(401).json({ error: 'Organizer authentication required.' });
  }
  req.organizer = payload;
  next();
}

module.exports = router;
module.exports.requireOrganizer = requireOrganizer;
module.exports.verifyToken = verifyToken;
