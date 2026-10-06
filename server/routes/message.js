const express = require("express");
const { verifyToken } = require("../controller/authController");
const { getMessages } = require("../controller/messageController");

const router = express.Router();

router.get("/:userId", verifyToken, getMessages);

router.put("/read/:id", verifyToken, markRead);

module.exports = router;