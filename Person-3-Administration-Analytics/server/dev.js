import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT || 4003);
app.listen(PORT, () => {
  console.log(`[Person 3 API] Running at http://127.0.0.1:${PORT}`);
});
