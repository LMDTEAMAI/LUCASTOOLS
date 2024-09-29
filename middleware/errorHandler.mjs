import logger from '../utils/logger.mjs';

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });

  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
};

export { errorHandler };
