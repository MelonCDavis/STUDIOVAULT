const express = require("express");
const router = express.Router();
const { registerClient, login } = require("./auth.controller");

router.post("/register-client", registerClient);
router.post("/login", login);

module.exports = router;
