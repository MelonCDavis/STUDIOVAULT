require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const { expireConsultations } = require("./modules/scheduling/consultation.expiration");

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Mongo Connected");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    // Run expiration check every 60 seconds
    setInterval(() => {
      expireConsultations();
    }, 60000);
  })
  .catch(err => {
    console.error("Mongo Error:", err);
    process.exit(1);
  });
