const express = require("express");

const app = express();

const { errorHandler } = require("./middleware/errorHandler");
app.use(errorHandler);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;