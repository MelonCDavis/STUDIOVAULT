function errorHandler(err, req, res, next) {
    const status = err.status || 500;

    res.status(status).json({
        error: err.message || "Internal Server Error",
        code: err.code || "UNKNOWN_ERROR",
    });
}

module.exports = { errorHandler };