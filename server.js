// server.js
// Entry point of the application. Loads environment variables and
// starts the Express server defined in src/app.js.

require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
