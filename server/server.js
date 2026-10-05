const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const authRoute = require('./routes/auth');
const usersRoute = require('./routes/users');
const messagesRoute = require('./routes/message');

const express = require('express');
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

mongoose.Promise = global.Promise;
mongoose
    .connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/chatapp", {
    })
    .then(() => {
        console.log("Successfully connected to the database");
    })
    .catch((err) => {
        console.log("Could not connect to the database. Error...", err);
        process.exit();
    });

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public")); // public/test.html mate

app.get('/', (req, res) => {
    res.send('<h1>Hello, Express.js Server!!!</h1>');
});

app.use('/auth', authRoute);
app.use('/users', usersRoute);
app.use('/messages', messagesRoute);

// Express + Socket.io ek j server par
const server = http.createServer(app);
const io = new Server(server, {
    cors: ["http://localhost:5173", "https://real-time-chat-a6io-7i9rc7d1h-bansi4.vercel.app"],// testing mate; React banaviye tyare 5173 j rakhsu
    methods: ["GET", "POST"],
});
require("./socket")(io);

const port = process.env.PORT || 5000;
server.listen(port, () => {   // app.listen nahi, server.listen
    console.log(`Server is running on port ${port}`);
});