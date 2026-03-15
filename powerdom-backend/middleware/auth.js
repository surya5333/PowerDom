const crypto = require('crypto');

// Secret for signing tokens (In production, use env variable)
const SECRET = 'powerdom_secret_key_123';

/**
 * Simple manual JWT verification (Header.Payload.Signature)
 * Base64Url decoding and HMAC-SHA256 verification
 */
function verifyToken(token) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Verify Signature
    const data = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signatureB64 !== expectedSignature) return null;

    // Decode Payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    
    // Check Expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return payload;
  } catch (err) {
    return null;
  }
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

module.exports = authMiddleware;
