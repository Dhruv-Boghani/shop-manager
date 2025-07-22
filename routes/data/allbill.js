// routes/billing.js
const express = require('express');
const router = express.Router();
const Bill = require('../../model/Bill'); // Your Bill model
const User = require('../../model/User');
const Shop = require('../../model/Shop');
const jwt = require('jsonwebtoken');

const jwtSecrate = process.env.jwtSecrate;

// GET: Show all bills
router.get('/', async (req, res) => {
  try {
    const bills = await Bill.find().populate('shopId');
    res.render('pages/allBills', { bills });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// GET: Edit a bill
router.get('/edit/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, jwtSecrate);

    if (!tokenData || (tokenData.role !== 'admin' && tokenData.role !== 'manager')) {
      return res.render('pages/error', {
        message: 'Only admin and shop manager can edit the bill',
        error: null
      });
    }

    if ((tokenData.role === 'user' || tokenData.role == 'saller')) {
      return res.render('pages/error', {
        message: 'Only admin and shop manager can edit the bill',
        error: null
      });
    }

    if (tokenData.role === 'manager') {
      const user = await User.findOne({ email: tokenData.email });
      const shop = await Shop.findOne({ manager: user._id });

      if (!shop || !shop._id.equals(bill.shopId)) {
        return res.render('pages/error', {
          message: 'This bill is not made in your shop',
          error: null
        });
      }

      // Manager is allowed to edit
      return res.render('pages/editBill', { bill });
    }

    // Admin is allowed to edit
    return res.render('pages/editBill', { bill });

  } catch (err) {
    console.error('Edit Bill Error:', err.message); // for debug
    return res.status(500).render('pages/error', {
      message: 'Error loading bill',
      error: err.message
    });
  }
});


// POST: Save edited bill
router.post('/edit/:id', async (req, res) => {
  const { customerName, customerPhone, totalReceiveAmount } = req.body;
  try {
    await Bill.findByIdAndUpdate(req.params.id, {
      customerName,
      customerPhone,
      totalReceiveAmount,
    });
    res.redirect('/allbill');
  } catch (err) {
    res.status(500).send('Error saving bill');
  }
});

// POST: Delete bill
router.post('/delete/:id', async (req, res) => {
  const token = req.cookies.token;

  try {
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#');

    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can delete bill',
        error: null
      });
    }

    await Bill.findByIdAndDelete(req.params.id);
    res.redirect('/allbill');

  } catch (err) {
    // If token is invalid or any other error
    res.render('pages/error', {
      message: 'Authentication failed or error deleting bill',
      error: err.message
    });
  }
});


module.exports = router;