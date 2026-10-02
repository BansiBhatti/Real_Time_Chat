const User = require("../models/userLogin");
const Message = require("../models/message");

// GET /api/users  -> potana sivay badha users (chat list mate)
exports.getUsers = async (req, res) => {
    try {

        const users = await User.find({ _id: { $ne: req.userId } }).select(
            "_id name email"
        );

        const result = [];
        for (const u of users) {
            // for showing last message
            const last = await Message.findOne({
                $or: [
                    { senderId: req.userId, receiverId: u._id },
                    { senderId: u._id, receiverId: req.userId },
                ],
            }).sort({ createdAt: -1 });

            result.push({ _id: u._id, name: u.name, email: u.email, lastMessage: last });
        }
        result.sort(
            (a, b) =>
                new Date(b.lastMessage?.createdAt || 0) -
                new Date(a.lastMessage?.createdAt || 0)
        );

        res.json(result);

    } catch (err) {
        res.json({ message: "Server error" });
    }
};
