import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DealFlow360 API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[DealFlow360 API] Server running on port ${PORT}`);
});

export default app;
