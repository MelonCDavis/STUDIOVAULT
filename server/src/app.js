const express = require("express");
const cors = require("cors");

const appointmentRoutes = require("./modules/scheduling/appointment.routes");
const bookingRequestClientRoutes = require("./modules/scheduling/bookingRequest.client.routes");
const staffBookingRequestRoutes = require("./modules/scheduling/bookingRequest.staff.routes");

const authRoutes = require("./modules/auth/auth.routes");
const clientRoutes = require("./modules/clients/client.routes");

const { attachUser } = require("./modules/auth/auth.middleware");
const { errorHandler } = require("./middleware/errorHandler");

const app = express(); // ✅ CREATE APP FIRST

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// ✅ Attach user AFTER express.json
app.use(attachUser);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* Auth Routes */
app.use("/api/auth", authRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/staff/appointments", appointmentRoutes);
app.use("/api/client/booking-request", bookingRequestClientRoutes);
app.use("/api/staff", staffBookingRequestRoutes);


app.use(errorHandler);

module.exports = app;
