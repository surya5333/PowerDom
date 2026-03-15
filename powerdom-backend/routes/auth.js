const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Secret for signing tokens (Must match middleware/auth.js)
const SECRET = 'powerdom_secret_key_123';

/**
 * Simple manual JWT generation (Header.Payload.Signature)
 */
function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  })).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const data = `${headerB64}.${payloadB64}`;
  const signatureB64 = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${data}.${signatureB64}`;
}

// Simple login endpoint for the prototype
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Prototype logic: allow any login for now or check against a dummy user
  if (username === 'admin' && password === 'admin') {
    const token = generateToken({ id: 1, username: 'admin' });
    return res.json({ token });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

module.exports = router;
