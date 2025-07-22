const express = require('express');
const Shop = require('../../model/Shop');
const User = require('../../model/User')
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer'); // Setup if not already
const crypto = require('crypto')
require('dotenv').config();


const router = express.Router();
const jwtSecrate = process.env.jwtSecrate;

// Setup nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dhruvboghani624@gmail.com',
        pass: 'ampf tloo ipml qytm'
    }
});

// ✅ 1. Clear shop cookie
router.get('/changshop', (req, res) => {
  res.clearCookie('shop');
  res.redirect('/bill');
});

router.get('/seller', async (req, res) => {
  try {
    const shops = await Shop.find({});
    res.render('pages/seller-shop-selector', { shops });
  } catch (error) {
    res.render('pages/error', { message: 'Failed to load shops', error });
  }
});


router.post('/send-otp', async (req, res) => {
  const { shopId } = req.body;
  try {
    const shop = await Shop.findById(shopId);
    const manager = await User.findById(shop.manager);
    const email = manager?.email || 'dhruvboghani624@gmail.com';
    const otpExpiry = 5 * 60 * 1000; // 5 minutes

    const otp = crypto.randomInt(100000, 999999).toString(); // 6 digit OTP
    const otpToken = jwt.sign({ otp, shopId }, jwtSecrate, { expiresIn: '5m' });

    await transporter.sendMail({
      to: email,
      subject: 'Your Shop OTP',
      text: `Your OTP to access the shop is ${otp}`
    });

    res.cookie('shopotp', otpToken, {
      sameSite: 'lax',
      httpOnly: true,
      maxAge: otpExpiry,
      secure: process.env.HTTPS
    });

    res.redirect('/bill/verify-otp');
  } catch (error) {
    console.error(error);
    res.render('pages/error', { message: 'Failed to send OTP', error });
  }
});

router.get('/verify-otp', (req, res) => {
  res.render('pages/verify-otp', { error: null });
});

router.post('/verify-otp', async (req, res) => {
  const { otp, redirect } = req.body;

  try {
    const token = req.cookies.shopotp;
    const decoded = jwt.verify(token, jwtSecrate);

    if (decoded.otp === otp) {
      const shopToken = jwt.sign({ shopId: decoded.shopId }, jwtSecrate);
      res.cookie('shop', shopToken, {
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.HTTPS
      });
      res.clearCookie('shopotp');
      return res.redirect(redirect); // 👈 Redirect to /bill or /tags
    }

    res.render('pages/verify-otp', { error: 'Invalid OTP' });
  } catch (error) {
    res.render('pages/verify-otp', { error: 'OTP expired or invalid' });
  }
});

// ✅ 2. GET route to check if cookie exists
router.get('/', async (req, res) => {
  try {
    if (!req.cookies.shop) {
      const shops = await Shop.find({});
      const token = req.cookies.token;
      const tokenData = jwt.verify(token, jwtSecrate)
      if (!shops || shops.length === 0) {
        return res.render('pages/error', { message: 'No shops found', error: {} });
      }
      if (tokenData.role === 'admin') {
        return res.render('pages/shop-selector', { shops }); // 👈 new EJS page
      }
      if (tokenData.role === 'seller' || tokenData.role === 'user') {
        return res.render('pages/error', {
          message: 'Only admin and shop manager can make bill',
          error: null
        });
      }
      if (tokenData.role === 'saller') {
        res.redirect('/bill/seller')
      }
      if (tokenData.role === 'manager') {
        const user = await User.findOne({ email: tokenData.email });
        const shopdata = await Shop.findOne({ manager: new mongoose.Types.ObjectId(user._id) });

        if (!shopdata) {
          return res.render('pages/error', {
            message: 'No shop found for this manager',
            error: null
          });
        }

        const shoptoken = jwt.sign({ shopId: shopdata._id }, jwtSecrate);

        res.cookie('shop', shoptoken, {
          sameSite: 'lax',
          secure: process.env.HTTPS,
          httpOnly: true
        });

        return res.redirect('/billing'); // ✅ ADD THIS!
      }

    }
    if (req.cookies.shop) {
      const shopdata = jwt.verify(req.cookies.shop, jwtSecrate);
      const shop = await Shop.findOne({ _id: shopdata.shopId });

      if (!shop) {
        res.clearCookie('shop');
        return res.redirect('/billing');
      }

      return res.redirect('/billing'); // ✅ ADD THIS
    }

  } catch (error) {
    console.error(error);
    res.render('pages/error', { message: 'Something went wrong', error });
  }
});

// ✅ 3. POST to set shop cookie
router.post('/', async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.body.shop);
    const shopdata = await Shop.findOne({ _id: shopId });

    if (!shopdata) {
      return res.status(404).json({ msg: 'Shop not found' });
    }

    const shoptoken = jwt.sign({ shopId: shopdata._id }, jwtSecrate);

    res.cookie('shop', shoptoken, {
      sameSite: 'lax', // or 'none' for HTTPS
      httpOnly: true,
      secure: process.env.HTTPS
    });
    res.redirect('/billing');
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
