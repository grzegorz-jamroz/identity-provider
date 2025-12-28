export default {
  setupFiles: ['<rootDir>/tests/bootstrap.js'],

  // force tests to run one by one in the same process
  maxWorkers: 1,

  // force Jest to close even if the DB connection is still open
  forceExit: true,

  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],

  // (though usually, this still requires the Node Option in PHPStorm)
  transform: {},
};
