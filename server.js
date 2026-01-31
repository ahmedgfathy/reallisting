// Local Express server (Legacy)
// Note: This project is optimized for Vercel/Supabase deployment.
// This server code is kept for reference but should not be used for production.
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'legacy', message: 'Use Vercel for the API' });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Legacy server listening on port ${PORT}`);
});
