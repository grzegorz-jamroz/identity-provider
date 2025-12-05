import app from './app.js';
import startCleanupJob from './cleanup.js';

startCleanupJob();

app.listen(process.env.APP_CONTAINER_PORT_PORT, () => {
  console.info(
    `Identity Provider Service is running on port ${process.env.APP_CONTAINER_PORT_PORT}`,
  );
});
