const { createLogger, transports } = require('winston');

// Create a logger with Console and File transports
const logger = createLogger({
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs.txt' }),
  ],
});

// Override console.log function to intercept and redirect logs
console.log = (...args) => {
  const logMessage = args.map(arg => String(arg)).join('\n');
  logger.log('info', logMessage);
};

// Test log messages
console.log('This is a test log message.');

module.exports = logger;
