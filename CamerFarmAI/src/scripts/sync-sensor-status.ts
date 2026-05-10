import { AppDataSource } from '../config/database';
import { updateAllPlantationsSensorStatuses } from '../services/sensor-status.service';

const DEFAULT_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

function parseArgs() {
  const args = process.argv.slice(2);
  const once = args.includes('--once');
  const refreshMsArg = args.find((a) => a.startsWith('--refreshMs='));
  const refreshMs =
    refreshMsArg && refreshMsArg.split('=')[1]
      ? Number(refreshMsArg.split('=')[1])
      : DEFAULT_REFRESH_MS;

  return { once, refreshMs };
}

async function main() {
  const { once, refreshMs } = parseArgs();

  await AppDataSource.initialize();

  // Best-effort update initial.
  await updateAllPlantationsSensorStatuses();

  if (once) {
    await AppDataSource.destroy?.();
    return;
  }

  console.log(
    `[Sensor status sync] Daemon mode: refresh every ${refreshMs}ms (set --once pour exécuter une seule fois).`
  );

  // Périodique (indépendant de la connexion d'un utilisateur).
  setInterval(async () => {
    try {
      await updateAllPlantationsSensorStatuses();
    } catch (err) {
      console.error('[Sensor status sync] Interval update failed:', err);
    }
  }, refreshMs);
}

main().catch((err) => {
  console.error('[Sensor status sync] Fatal error:', err);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

