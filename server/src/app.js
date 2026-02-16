const express = require("express");
const cors = require("cors");
const appointmentRoutes = require("./modules/scheduling/appointment.routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* Staff Scheduling */
app.use("/api/staff/appointments", appointmentRoutes);

app.use(errorHandler);

module.exports = app;