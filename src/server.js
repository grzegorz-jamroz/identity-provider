import app from './app.js';
import { startCleanupJobForAllSystems } from './cleanup.js';
import { closeAllPools } from './db.js';

startCleanupJobForAllSystems();

const server = app.listen(process.env.APP_CONTAINER_PORT_PORT, () => {
  console.info(
    `Identity Provider Service is running on port ${process.env.APP_CONTAINER_PORT_PORT}`,
  );
});

// Graceful Shutdown Logic
const shutdown = async () => {
  console.info('SIGTERM/SIGINT received. Shutting down gracefully...');

  // Stop accepting new HTTP requests
  server.close(async () => {
    console.info('HTTP server closed.');

    try {
      await closeAllPools();
      console.info('All database connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database shutdown', err);
      process.exit(1);
    }
  });
};

// Listen for termination signals
process.on('SIGTERM', shutdown); // Docker stop / Kubernetes
process.on('SIGINT', shutdown); // Ctrl+C in terminal
