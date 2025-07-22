const express = require('express');
const User = require('../../model/User');
const jwt = require('jsonwebtoken');

const router = express.Router();
const jwtSecrate = process.env.jwtSecrate;

router.get('/', async (req, res) => {
    try {
        const email = req.query.email;
        const otp = req.cookies.otp;

        if (!email || !otp) {
            return res.render('./pages/otp', { error: 'Invalid or expired OTP link', email: '', role: '' });
        }

        const otpObject = jwt.verify(otp, jwtSecrate);
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('./pages/otp', { error: 'User not found', email: '', role: '' });
        }

        res.render('./pages/otp', { error: null, email, role: user.role });

    } catch (err) {
        console.log(err);
        res.render('./pages/otp', { error: 'Something went wrong', email: '', role: '' });
    }
});


router.post('/', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) {
            return res.render('pages/error', {
                message: 'you change the URL please try again',
                error: null
            });
        }

        const otp = req.cookies.otp; // Get the OTP from the cookie
        if (!otp) {
            return res.render('pages/error', {
                message: 'OTP expired or not found',
                error: null
            });
        }

        const otpObject = jwt.verify(otp, jwtSecrate); // Verify the OTP using the secret key
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('pages/error', {
                message: 'User not found',
                error: null
            });
        }

        if (user.role === 'manager' || user.role === 'seller') {
            const { otp, adminotp } = req.body;
            if (!adminotp) {
                return res.render('pages/error', {
                    message: 'Admin OTP not provided',
                    error: null
                });
            }
            if (adminotp !== otpObject.adminotp) {
                return res.render('pages/error', {
                    message: 'Invalid Admin OTP',
                    error: null
                });
            }
            if (otp !== otpObject.otp) {
                return res.render('pages/error', {
                    message: 'Invalid OTP',
                    error: null
                });
            }
            user.isVerified = true;
            await user.save();
            res.clearCookie('otp'); // Clear the OTP cookie after verification
            res.redirect('/login'); // Redirect to login page after successful verification
        }
        else if (user.role === 'user') {
            const { otp } = req.body;
            if (!otp) {
                return res.render('pages/error', {
                    message: 'OTP not provided',
                    error: null
                });
            }
            if (otp !== otpObject.otp) {
                return res.render('pages/error', {
                    message: 'Invalid OTP',
                    error: null
                });
            }
            user.isVerified = true;
            await user.save();

            res.clearCookie('otp'); // Clear the OTP cookie after verification
            res.redirect('/login'); // Redirect to login page after successful verification

        }
        else {
            return res.render('pages/error', {
                message: 'Invalid role',
                error: null
            });
        }
        // If the OTP is valid, mark the user as verified


    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
});



module.exports = router;