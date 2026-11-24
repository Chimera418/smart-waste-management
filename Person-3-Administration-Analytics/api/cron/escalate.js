import { connectDB } from '../../server/shared/config/db.js';
import { runEscalationCheck } from '../../server/shared/services/escalationService.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.authorization || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } });
  }

  await connectDB();
  const result = await runEscalationCheck({ triggeredBy: 'system_cron' });
  return res.status(200).json({ success: true, data: result });
}
