function errorHandler(err, req, res, next) {
  console.error("🔥 SERVER ERROR:");
  console.error(err);

  const status = err.status || 500;

  res.status(status).json({
    error: err.message || "Internal Server Error",
    code: err.code || "UNKNOWN_ERROR",
  });
}

module.exports = { errorHandler };
