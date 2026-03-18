const bcrypt = require("bcrypt");
const User = require("./User.model");
const Client = require("../clients/Client.model");
const { signToken } = require("./auth.utils");
const { httpError } = require("../../utils/httpError");

const SALT_ROUNDS = 10;

async function registerClient(req, res, next) {
  try {
    const {
      email,
      password,
      legalName,
      phoneE164,
      isAdult,
      dateOfBirth,
    } = req.body;

    if (!email || !password || !legalName || !phoneE164) {
      return next(httpError(400, "Missing required fields"));
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return next(httpError(400, "Email already registered"));
    }

    const client = await Client.create({
      legalName,
      phoneE164,
      email,
      isAdult,
      dateOfBirth,
    });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email,
      passwordHash,
      role: "CLIENT",
      legalName,
      phoneE164,
      clientId: client._id,
    });

    const token = signToken(user);

    res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(httpError(400, "Invalid credentials"));
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return next(httpError(400, "Invalid credentials"));
    }

    const token = signToken(user);

    res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerClient,
  login,
};
