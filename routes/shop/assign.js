const express = require('express');
const router = express.Router();
const Shop = require('../../model/Shop');
const User = require('../../model/User');
const jwt = require('jsonwebtoken');

// Step 1: Show Assign Page with Shop Selection
router.get('/', async (req, res) => {
  const token = req.cookies.token;
      const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // Replace with your secret key
      if (tokenData.role !== 'admin') {
        return res.render('pages/error', {
          message: 'Only admin can access the assign page',
          error: null
        });
      }
  const shops = await Shop.find({}).populate('manager');
  res.render('./pages/select-shop', { shops });
});

// Step 2: After Shop Selected → Show Users to Assign
router.get('/:shopId', async (req, res) => {
  const shop = await Shop.findById(req.params.shopId).populate('manager');
  const users = await User.find({ role: { $in: ['manager', 'seller'] } });
  res.render('./pages/assign-user', { shop, users });
});

// Assign Manager/Seller
router.post('/:shopId', async (req, res) => {
  const { userId } = req.body;
  await Shop.findByIdAndUpdate(req.params.shopId, { manager: userId });
  res.redirect('/assign');
});

// Unassign (remove manager)
router.post('/unassign/:shopId', async (req, res) => {
  await Shop.findByIdAndUpdate(req.params.shopId, { manager: null });
  res.redirect('/assign');
});

module.exports = router;
