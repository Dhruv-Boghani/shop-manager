const express = require('express');
const User = require('../../model/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

const router = express.Router();
const validateUser = [
    body('email').isEmail().withMessage('Not a valid e-mail address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
];

router.get('/', (req, res) => {
    res.render('./pages/delete-account');
});

router.post('/', validateUser, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(error => error.msg) });
        }
        const { email, password } = req.body;
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        User.findOneAndDelete({ email })
            .then(() => {
                Object.keys(req.cookies).forEach(cookie => {
                    res.clearCookie(cookie);
                });
                // ✅ Only redirect, don't also try to send JSON
                res.redirect('/');
            })
            .catch(err => {
                console.error(err);
                res.status(500).json({ msg: 'Server error' });
            });

    } catch (error) {
        console.error(error);
        res.status(500).render('delete-account', { error: 'Server error' });
    }
});

module.exports = router;