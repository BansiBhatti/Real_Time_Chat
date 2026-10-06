const express = require("express");
const { verifyToken } = require("../controller/authController");
const { getMessages, markRead, editMessage, deleteMessage} = require("../controller/messageController");

const router = express.Router();

router.get("/:userId", verifyToken, getMessages);

router.put("/read/:id", verifyToken, markRead);

router.put("/:id", verifyToken, editMessage);

router.delete("/:id", verifyToken, deleteMessage);


module.exports = router;