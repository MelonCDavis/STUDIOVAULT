const express = require("express");
const cors = require("cors");

const appointmentRoutes = require("./modules/scheduling/Appointment.routes");
const appointmentInviteRoutes = require("./modules/scheduling/appointmentInvite.routes");
const consultationStaffRoutes = require("./modules/scheduling/consultation.staff.routes");
const consultationClientRoutes = require("./modules/scheduling/consultation.client.routes");
const bookingRequestClientRoutes = require("./modules/scheduling/bookingRequest.client.routes");
const staffBookingRequestRoutes = require("./modules/scheduling/bookingRequest.staff.routes");
const staffScheduleRoutes = require("./modules/scheduling/staffSchedule.routes");
const consultationSettingsRoutes = require("./modules/scheduling/consultationSettings.routes");
const publicRoutes = require("./modules/public/public.routes");

const authRoutes = require("./modules/auth/auth.routes");
const clientRoutes = require("./modules/clients/client.routes");

const { attachUser } = require("./modules/auth/auth.middleware");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());
app.use(attachUser);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* Public Routes */
app.use("/api/public", publicRoutes);

/* Auth Routes */
app.use("/api/auth", authRoutes);
app.use("/api/client", clientRoutes);

app.use("/api/client", consultationClientRoutes);
app.use("/api", appointmentInviteRoutes);

app.use("/api/staff/appointments", appointmentRoutes);
app.use("/api/client/booking-request", bookingRequestClientRoutes);
app.use("/api/staff", consultationStaffRoutes);
app.use("/api/staff", staffBookingRequestRoutes);
app.use("/api/staff", staffScheduleRoutes);
app.use("/api/staff/consultation-settings", consultationSettingsRoutes);


app.use(errorHandler);

module.exports = app;
