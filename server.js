const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiHandler = require('./api/index');
const { initDatabase, DB_FILE } = require('./lib/database');

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'RealListing local API server is running',
    apiBase: '/api',
    dbFile: DB_FILE
  });
});

app.use('/api', (req, res) => {
  req.url = req.originalUrl;
  return apiHandler(req, res);
});

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Local API server listening on http://localhost:${PORT}`);
      console.log(`Local data file: ${DB_FILE}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize local database:', error);
    process.exit(1);
  });
