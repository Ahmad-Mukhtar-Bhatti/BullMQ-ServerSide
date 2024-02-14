const winston = require("winston");
const config = require("config");


const logger = winston.createLogger({
  level: config.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD hh:mm:ss.SSS A" }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: config.filename }),
  ],
});

module.exports = logger;