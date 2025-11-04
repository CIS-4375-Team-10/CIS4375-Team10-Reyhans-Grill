import './config/env.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import inventoryRoutes from './routes/inventoryRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/inventory', inventoryRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Unexpected error',
  });
});

export default app;
