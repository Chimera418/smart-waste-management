import 'dotenv/config';
import app from './app.js';
import { connectDB } from './shared/config/db.js';
import { maybeAutoSimulateStep } from './shared/services/vehicleSimulationService.js';

const PORT = Number(process.env.PORT || 4000);
const SIM_INTERVAL_MS = Number(process.env.SIMULATION_INTERVAL_MS || 1200);

app.listen(PORT, async () => {
  console.log(`[CivicClean Full API] Running at http://127.0.0.1:${PORT}`);
  try {
    await connectDB();
    console.log(`[CivicClean Fleet Simulator] Always-on live simulation active (${SIM_INTERVAL_MS}ms tick)`);
    setInterval(() => {
      maybeAutoSimulateStep(SIM_INTERVAL_MS - 200);
    }, SIM_INTERVAL_MS);
  } catch (err) {
    console.warn('[CivicClean Fleet Simulator] Deferred startup:', err?.message || err);
  }
});
