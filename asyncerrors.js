const logger = require("./logger");

function asyncErrorHandler(err, req, res, next) {
    // Log the error
    logger.error('Async error occurred:', err);
  
    // Respond with an appropriate error message
    res.status(500).json({ error: 'Internal Server Error' });
    next();
  }

  module.exports= asyncErrorHandler;