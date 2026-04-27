const express = require("express");
const router = express.Router();

const Studio = require("../studios/Studio.model");
const ArtistProfile = require("../artists/ArtistProfile.model");
const StudioArtistLink = require("../artists/StudioArtistLink.model");

// GET /api/public/search?q=
router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();

    if (q.length < 2) {
      return res.json({
        studios: [],
        artists: [],
      });
    }

    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const studios = await Studio.find({
      status: "active",
      $or: [
        { name: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
        { slug: searchRegex },
      ],
    })
      .select("_id name slug address1 city state postalCode country phone website timezone")
      .limit(20)
      .lean();

    const artists = await ArtistProfile.find({
      $or: [
        { displayName: searchRegex },
        { bookingAlias: searchRegex },
        { instagramHandle: searchRegex },
        { locationLabel: searchRegex },
        { specialties: searchRegex },
      ],
    })
      .select("_id displayName bookingAlias instagramHandle locationLabel avatarUrl specialties isIndependent")
      .limit(20)
      .lean();

    const artistIds = artists.map((artist) => artist._id);
    const studioIds = studios.map((studio) => studio._id);

    const links = await StudioArtistLink.find({
      artistProfileId: { $in: artistIds },
      status: "active",
    })
      .populate(
        "studioId",
        "_id name slug address1 city state postalCode country phone website timezone status"
      )
      .lean();

    const studioLinks = await StudioArtistLink.find({
      studioId: { $in: studioIds },
      status: "active",
    })
      .populate(
        "artistProfileId",
        "_id displayName bookingAlias instagramHandle locationLabel avatarUrl specialties isIndependent"
      )
      .lean();

    const linksByStudioId = studioLinks.reduce((acc, link) => {
      const key = String(link.studioId);

      if (!acc[key]) acc[key] = [];

      acc[key].push(link);

      return acc;
    }, {});

    const linksByArtistId = links.reduce((acc, link) => {
      const key = String(link.artistProfileId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(link);
      return acc;
    }, {});

    res.json({
      studios: studios.map((studio) => ({
        _id: studio._id,
        name: studio.name,
        slug: studio.slug || "",
        address1: studio.address1 || "",
        city: studio.city || "",
        state: studio.state || "",
        postalCode: studio.postalCode || "",
        country: studio.country || "",
        phone: studio.phone || "",
        website: studio.website || "",
        timezone: studio.timezone,

        artists: (linksByStudioId[String(studio._id)] || [])
          .filter((link) => link.artistProfileId)
          .map((link) => ({
            _id: link.artistProfileId._id,
            displayName: link.artistProfileId.displayName,
            bookingAlias: link.artistProfileId.bookingAlias || "",
            instagramHandle: link.artistProfileId.instagramHandle || "",
            locationLabel: link.artistProfileId.locationLabel || "",
            isIndependent: link.artistProfileId.isIndependent === true,
            isGuest: link.isGuest === true,
          })),
      })),

      artists: artists.map((artist) => ({
        _id: artist._id,
        displayName: artist.displayName,
        bookingAlias: artist.bookingAlias || "",
        instagramHandle: artist.instagramHandle || "",
        locationLabel: artist.locationLabel || "",
        avatarUrl: artist.avatarUrl || "",
        specialties: Array.isArray(artist.specialties) ? artist.specialties : [],
        isIndependent: artist.isIndependent === true,
        studios: (linksByArtistId[String(artist._id)] || [])
          .filter((link) => link.studioId && link.studioId.status !== "inactive")
          .map((link) => ({
            _id: link.studioId._id,
            name: link.studioId.name,
            slug: link.studioId.slug || "",
            address1: link.studioId.address1 || "",
            city: link.studioId.city || "",
            state: link.studioId.state || "",
            postalCode: link.studioId.postalCode || "",
            country: link.studioId.country || "",
            timezone: link.studioId.timezone,
            isGuest: link.isGuest === true,
          })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/booking-target?studioId=&artistId=
router.get("/booking-target", async (req, res, next) => {
  try {
    const { studioId, artistId } = req.query;

    if (!studioId || !artistId) {
      return res.status(400).json({ error: "Missing studioId or artistId" });
    }

    const studio = await Studio.findOne({
      _id: studioId,
      status: "active",
    })
      .select("_id name slug address1 city state postalCode country timezone")
      .lean();

    const artist = await ArtistProfile.findById(artistId)
      .select("_id displayName bookingAlias instagramHandle locationLabel avatarUrl specialties")
      .lean();

    const link = await StudioArtistLink.findOne({
      studioId,
      artistProfileId: artistId,
      status: "active",
    }).lean();

    if (!studio || !artist || !link) {
      return res.status(404).json({ error: "Booking target not found" });
    }

    res.json({
      type: "artist",
      artistId: artist._id,
      studioId: studio._id,
      label: artist.displayName,
      sublabel: [
        artist.instagramHandle
          ? `@${artist.instagramHandle.replace(/^@/, "")}`
          : "",
        studio.name,
        [studio.city, studio.state].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" • "),
      artist,
      studio,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;