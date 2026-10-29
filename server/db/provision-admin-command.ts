import path from 'path';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from './connection';
import { provisionAdministrator } from './seed';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runProvisionCommand(): Promise<void> {
  await connectDatabase();
  const status = getDatabaseStatus();
  console.log(`[Admin] Target database: '${status.database}'.`);
  const action = await provisionAdministrator();
  console.log(`[Admin] Provisioning succeeded: ${action}.`);
}

runProvisionCommand()
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : 'Unknown administrator provisioning failure';
    console.error('[Admin CLI] Failed:', message);
    await disconnectDatabase();
    process.exit(1);
  })
  .then(async () => {
    if (!process.exitCode) {
      await disconnectDatabase();
      process.exit(0);
    }
  });
