require('dotenv').config();

const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'API key requerida o inválida', code: 401 });
  }

  next();
};

module.exports = { requireApiKey };
