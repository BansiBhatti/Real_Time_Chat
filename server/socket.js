const jwt = require("jsonwebtoken");
const Message = require("./models/message");

module.exports = (io) => {
    // 1. Connect thay tyare j token check (login vagar na loko andar nahi aavi shake)
    io.use((socket, next) => {
        try {
            const token = (socket.handshake.auth.token || "").replace(/"/g, "").trim();
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id; // kayo user chhe te yaad
            next();
        } catch (err) {
            next(new Error("Invalid Token"));
        }
    });

    io.on("connection", (socket) => {
        // 2. Darek user potana userId naam na room ma jaay.
        //    Etle "user B ne moklo" = "B na room ma moklo" (B na 2 tab hoy to banne ma jaay)
        socket.join(socket.userId);
        console.log("Connected user:", socket.userId);

        // 3. Message aave -> DB ma save -> receiver ne live moklo
        socket.on("sendMessage", async ({ receiverId, text }, callback) => {
            try {
                if (!receiverId || !text || !text.trim()) return;

                const message = await Message.create({
                    senderId: socket.userId,
                    receiverId,
                    text,
                });

                io.to(receiverId).emit("getMessage", message); // receiver ne live
                if (callback) callback({ ok: true, message }); // sender ne "moki didhu" nu confirm
            } catch (e) {
                console.log(e);
                if (callback) callback({ ok: false });
            }
        });

        // 4. Typing... indicator
        socket.on("typing", ({ receiverId }) => {
            io.to(receiverId).emit("typing", { senderId: socket.userId });
        });

        socket.on("disconnect", () => {
            console.log("Logout User:", socket.userId);
        });
    });
};