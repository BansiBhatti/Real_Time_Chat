const mongoose = require("mongoose");

const appSchema = mongoose.Schema(
    {
        name: { type: String },
        email: { type: String, required: true, unique: true, lowercase: true},
        password: { type: String, required: true, },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", appSchema);