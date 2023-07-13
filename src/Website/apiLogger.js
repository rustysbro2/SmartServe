// apiLogger.js
const debug = require("debug")("api-calls");

function logAPICalls(req, res, next) {
  debug("API Request:", req.method, req.originalUrl);
  res.on("finish", () => {
    debug("API Response:", res.statusCode, req.method, req.originalUrl);
  });
  next();
}

module.exports = logAPICalls;
