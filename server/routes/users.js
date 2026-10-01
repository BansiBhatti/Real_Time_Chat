const express = require("express");
const { verifyToken } = require("../controller/authController");
const { getUsers } = require("../controller/userController");

const router = express.Router();

// verifyToken pehla chale, pachhi getUsers
router.get("/", verifyToken, getUsers);

module.exports = router;