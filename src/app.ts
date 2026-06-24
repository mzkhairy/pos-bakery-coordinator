import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import transferRoutes from './routes/transfer.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'coordinator',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', transferRoutes);

// Error handler (harus paling akhir)
app.use(errorHandler);

export default app;
