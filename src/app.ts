import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';

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

// Routes — akan diimport di Phase 05
// import transferRoutes from './routes/transfer.routes';
// app.use('/api', transferRoutes);

export default app;
