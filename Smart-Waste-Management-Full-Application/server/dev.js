import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`[CivicClean Full API] Running at http://127.0.0.1:${PORT}`);
});
