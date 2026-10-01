const User = require("../models/userLogin");

// GET /api/users  -> potana sivay badha users (chat list mate)
exports.getUsers = async (req, res) => {
    try {

        const users = await User.find({ _id: { $ne: req.userId } }).select(
            "_id name email"
        );
        res.json(users);

    } catch (err) {
        res.json({ message: "Server error" });
    }
};
