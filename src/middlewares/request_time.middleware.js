const requestTimeMiddleware = (req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
};

module.exports = requestTimeMiddleware;
