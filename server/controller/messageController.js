const Message = require("../models/message");

// GET /messages/:userId -> mara ane aa user vachche na badha old messages
exports.getMessages = async (req, res) => {
    try {
        const otherId = req.params.userId;

        const messages = await Message.find({
            $or: [
                { senderId: req.userId, receiverId: otherId },
                { senderId: otherId, receiverId: req.userId },
            ],
        }).sort({ createdAt: 1 }); // juna pehla, nava chhelle

        res.json(messages);
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Server error" });
    }
};

exports.markRead = async (req, res) => {
    await Message.updateMany(
        { senderId: req.params.id, receiverId: req.userId, seen: false },
        { seen: true },
    )
    res.json({ ok: true });
}