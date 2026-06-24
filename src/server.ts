import app from './app';
import { connectDatabase } from './config/database';
import { runCoordinatorRecovery } from './recovery/coordinatorRecovery';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // Jalankan recovery sebelum mulai menerima request
  await runCoordinatorRecovery();

  app.listen(PORT, () => {
    console.log(`[Coordinator] Running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Coordinator] Fatal startup error:', err);
  process.exit(1);
});
