const express = require('express');
const User = require('../../model/User');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();


const router = express.Router();

const validateLogin = [
    body('email').isEmail().withMessage('Not a valid e-mail address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
];

const jwtSecrate = "DhruvBoghani624@#";

router.get('/', (req, res) => {
    res.render('pages/login');
});

router.post('/', validateLogin, async (req, res) => {
    try {

        // Validate user input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(error => error.msg) });
        }

        const { email } = req.body;
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if password is correct
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        if (!await bcrypt.compare(req.body.password, user.password)) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate JWT token (if using JWT for authentication)
        if (!user.isVerified) {
            return res.status(400).json({ msg: 'User is not verified' });
        }

        const data = {
            email: user.email,
            name: user.name,
            role: user.role,
        };
        const token = jwt.sign(data, jwtSecrate);

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax', // or 'none' if using https
            secure: process.env.HTTPS
        }); // Set the token as a cookie
        // res.status(200).json({ msg: 'Login successful', token });
        res.redirect('/'); // Redirect to home page after successful login

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});




module.exports = router;
