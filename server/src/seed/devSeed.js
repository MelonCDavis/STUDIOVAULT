const mongoose = require("mongoose");
require("dotenv").config();

const Studio = require("../modules/studios/Studio.model");
const ArtistProfile = require("../modules/artists/ArtistProfile.model");
const Service = require("../modules/scheduling/Service.model");
const Client = require("../modules/clients/Client.model");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to Mongo");

  await Studio.deleteMany({ name: "Test Studio" });
  await ArtistProfile.deleteMany({ displayName: "Test Artist" });
  await Service.deleteMany({ name: "Standard Tattoo Session" });
  await Client.deleteMany({ legalName: "Test Client" });

  // Studio (timezone required)
  const studio = await Studio.create({
    name: "Test Studio",
    timezone: "America/New_York",
  });

  // Fake userId (since you don't have auth wired yet)
  const fakeUserId = new mongoose.Types.ObjectId();

  const artist = await ArtistProfile.create({
    userId: fakeUserId,
    displayName: "Test Artist",
  });

  const service = await Service.create({
    studioId: studio._id,
    category: "TATTOO",
    name: "Standard Tattoo Session",
    durationMinutes: 120,
  });

  const client = await Client.create({
    legalName: "Test Client",
    dateOfBirth: new Date("1995-01-01"),
    phoneE164: "+15550000000",
    email: "test@example.com",
  });

  console.log("Seed complete:");
  console.log({
    studioId: studio._id,
    artistProfileId: artist._id,
    serviceId: service._id,
    clientId: client._id,
  });

  process.exit();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
