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

exports.deleteMessage = async (req, res) => {
    try {
        const message = await Message.findOneAndUpdate(
            { _id: req.params.id, senderId: req.userId }, //delete only sender's message
            { deleted: true, text: "" },
            { new: true },
        );

        if (!message) return res.json({ message: "Message not found" });

        req.app.get("io").to(String(message.receiverId)).emit("messageDeleted", message);
        res.json(message);
    } catch (e) {
        res.json({ message: "Server error" });
    }
}

exports.editMessage = async (req, res) => {
    try {
        const text = (req.body.text || "").trim();
        if (!text) return res.status(400).json({ message: "Text required" });

        const message = await Message.findOneAndUpdate(
            { _id: req.params.id, senderId: req.userId, deleted: { $ne: true } },
            { text, edited: true },
            { new: true }
        );
        if (!message) return res.status(404).json({ message: "Message not found" });

        req.app.get("io").to(String(message.receiverId)).emit("messageEdited", message);
        res.json(message);
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
};