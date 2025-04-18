const express = require('express');
const User = require('../../model/User');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();


const router = express.Router();

function formatEmail(email) {
    const cleaned = email.trim().toLowerCase();
    const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return capitalized;
  }
  

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
        // Step 1: Validate request input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/error', {
                message: 'Input validation failed',
                error: errors.array()
            });
        }

        // Step 2: Format email
        let { email, password } = req.body;
        email = formatEmail(email);

        // Step 3: Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('pages/error', {
                message: 'No user found with this email',
                error: [{ msg: 'Invalid email address.' }]
            });
        }

        // Step 4: Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('pages/error', {
                message: 'Incorrect password',
                error: [{ msg: 'Password does not match.' }]
            });
        }

        // Step 5: Check if verified
        if (!user.isVerified) {
            return res.render('pages/error', {
                message: 'User is not verified, please re-sign up',
                error: [{ msg: 'Account is not verified.' }]
            });
        }

        // Step 6: Generate JWT
        const data = {
            email: user.email,
            name: user.name,
            role: user.role,
        };
        const token = jwt.sign(data, jwtSecrate);

        // Step 7: Set cookie and redirect
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.HTTPS // string comparison if it's an env var
        });

        res.redirect('/'); // Login successful

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});





module.exports = router;
