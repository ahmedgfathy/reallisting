const crypto = require('crypto');

module.exports = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';
  const password = req.query.password || 'admin';
  
  const hash = crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
  
  return res.json({
    password,
    jwt_secret_set: !!process.env.JWT_SECRET,
    jwt_secret_value: JWT_SECRET,
    hash
  });
};
