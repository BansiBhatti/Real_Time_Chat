const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userLogin");

const createToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.register = async (req, res) => {
    try {
        const { name, email, password, } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please fill Details." });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.json({ message: "Email is already logined." })
        }

        const hashedPwd = bcrypt.hashSync(password, 10);
        await User.create({ name, email, password: hashedPwd });

        return res.json({ message: "Account Created Successfully", });

    } catch (e) {
        console.log(e);
        return res.json({ message: "Failed" });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!(email && password)) {
            return res.json({ message: "Required all the inputs." });
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.json({ message: "Please enter valid input." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.json({ message: "Email or password wrong." });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: createToken(user._id),
        });

    } catch (e) {
        res.json({ message: "Server Error" })
    }
}

// JWT token verify: login vagar na loko ne aagal na java dev nahi
// Header: Authorization: Bearer <token>
exports.verifyToken = (req, res, next) => {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token nathi, pehla login karo" });
        }

        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.id; // aagal na controllers ma vaparay
        next();
    } catch (err) {
        console.log(err.message);
        res.status(401).json({ message: "Token khotu ke expire thai gayu" });
    }
};