const express = require('express');
const User = require('../../model/User');
const jwt = require('jsonwebtoken');

const router = express.Router();
const jwtSecrate = "DhruvBoghani624@#";

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
            return res.status(400).json({ msg: 'you change the URL please try again' });
        }

        const otp = req.cookies.otp; // Get the OTP from the cookie
        if (!otp) {
            return res.status(400).json({ msg: 'OTP expired or not found' });
        }

        const otpObject = jwt.verify(otp, jwtSecrate); // Verify the OTP using the secret key
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        if (user.role === 'manager' || user.role === 'seller') {
            const { otp, adminotp } = req.body;
            if (!adminotp) {
                return res.status(400).json({ msg: 'Admin OTP not provided' });
            }
            if (adminotp !== otpObject.adminotp) {
                return res.status(400).json({ msg: 'Invalid Admin OTP' });
            }
            if (otp !== otpObject.otp) {
                return res.status(400).json({ msg: 'Invalid OTP' });
            }
            user.isVerified = true;
            await user.save();
            res.clearCookie('otp'); // Clear the OTP cookie after verification
            res.redirect('/login'); // Redirect to login page after successful verification
        }
        else if (user.role === 'user') {
            const { otp } = req.body;
            if (!otp) {
                return res.status(400).json({ msg: 'OTP not provided' });
            }
            if (otp !== otpObject.otp) {
                return res.status(400).json({ msg: 'Invalid OTP' });
            }
            user.isVerified = true;
            await user.save();

            res.clearCookie('otp'); // Clear the OTP cookie after verification
            res.redirect('/login'); // Redirect to login page after successful verification

        }
        else {
            return res.status(400).json({ msg: 'Invalid role' });
        }
        // If the OTP is valid, mark the user as verified


    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
});



module.exports = router;