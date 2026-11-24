import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT || 4001);

app.listen(PORT, () => {
  console.log(`[Person 1 API] Running at http://127.0.0.1:${PORT}`);
});
