require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../modules/auth/User.model");
const StudioMembership = require("../modules/studios/StudioMembership.model");

const SALT_ROUNDS = 10;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo Connected");

  const studioId = "69936f65681b262ca3739f92";

  const email = "owner@studiovault.dev";
  const password = "DevPassword123!";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("User already exists.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    email,
    passwordHash,
    legalName: "Studio Owner",
    phoneE164: "+15555555555",
  });

  await StudioMembership.create({
    studioId,
    userId: user._id,
    role: "OWNER",
    isActive: true,
  });

  console.log("Staff user created:");
  console.log("Email:", email);
  console.log("Password:", password);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});