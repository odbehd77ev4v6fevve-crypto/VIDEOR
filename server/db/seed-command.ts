import path from 'path';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from './connection';
import { seedApplicationContent } from './seed';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runSeedCommand(): Promise<void> {
  if (process.env.VIDORA_SEED !== 'true') {
    throw new Error('Set VIDORA_SEED=true to explicitly authorize database initialization before running npm run seed.');
  }

  await connectDatabase();
  const status = getDatabaseStatus();
  console.log(`[Seed] Target database: '${status.database}'.`);
  const summary = await seedApplicationContent();
  console.log(`[Seed] Seed command succeeded: ${JSON.stringify(summary)}.`);
}

runSeedCommand()
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : 'Unknown seed failure';
    console.error('[Seed CLI] Failed:', message);
    await disconnectDatabase();
    process.exit(1);
  })
  .then(async () => {
    if (!process.exitCode) {
      await disconnectDatabase();
      process.exit(0);
    }
  });
