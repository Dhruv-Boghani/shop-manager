const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../../model/User');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const router = express.Router();
const jwtSecrate = "DhruvBoghani624@#";

// Setup nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dhruvboghani624@gmail.com',
        pass: 'ampf tloo ipml qytm'
    }
});

function formatEmail(email) {
    const cleaned = email.trim().toLowerCase();
    const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return capitalized;
  }
  

router.get('/', (req, res) => {
    res.render('pages/signup'); 
});

const validateSignup = [
    body('email').isEmail().withMessage('Not a valid e-mail address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
    body('role').isIn(['admin', 'manager', 'user', 'seller']).withMessage('Invalid role')
];

router.post('/', validateSignup ,async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/error', {
                message: 'Input validate credentials',
                error: errors.array()
              });
        }
        
        let { name, email, password, role } = req.body;
        email = formatEmail(email)
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.render('pages/error', {
                    message: 'Email alredy Exist',
                    error: null
                  });
            }
            else {
                await User.findOneAndDelete({ email })
            }
        }

        const otp = crypto.randomInt(100000, 999999).toString(); // 6 digit OTP
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        const newUser = new User({ email, password, name, role });
        newUser.password = await bcrypt.hash(password, 10);
        await newUser.save();

        if (role === 'admin') {
            return res.render('pages/error', {
                message: 'It is not a error "your admin requst is created succusfully wait for aprove"',
                error: ''
              });
        }

        if (role === 'manager' || existingUser.role === 'seller') {
            var adminotp = crypto.randomInt(100000, 999999).toString(); // 6 digit OTP
            await transporter.sendMail({
                from: '"Shop Manager" <dhruvboghani624@gmail.com>', // Correct format
                to: 'dhruvboghani624@gmail.com',
                subject: `OTP Code for new ${role}`,
                text: `Hi Admin, ${name} has signed up as ${role}. OTP code is: ${adminotp}`,
                html: `<p>Hi Admin,</p><p>${name} has signed up as ${role}. OTP code is: <b>${adminotp}</b> </p> <p style="font-size:12px;color:gray;">If you didn’t request this, please ignore this email.</p>`
            });
            
        }

        // Send email
        await transporter.sendMail({
            from: '"Shop Manager" <dhruvboghani624@gmail.com>',
            to: email,
            subject: 'Your OTP Code',
            text: `Hi ${name}, your OTP code is: ${otp}`,
            html: `<p>Hi ${name},</p><p>Your OTP code is: <b>${otp}</b> </p> <p style="font-size:12px;color:gray;">If you didn’t request this, please ignore this email.</p>`
        });
        

        const otpObject = {
            otp: otp,
            adminotp: adminotp || null,
        };

        const otptoken = jwt.sign(otpObject, jwtSecrate , { expiresIn: '5m' });
        res.cookie('otp', otptoken, {
            expires: otpExpires,
            httpOnly: true,
            sameSite: 'lax', // or 'none' if using https
            secure: process.env.HTTPS     // set true if using https
        });
        res.redirect(`/signup/otp?email=${email}`);

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;