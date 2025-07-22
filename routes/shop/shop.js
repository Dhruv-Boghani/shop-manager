const express = require('express');
const Product = require('../../model/Product');
const Shop = require('../../model/Shop');
const Tag = require('../../model/Tag')
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();
const jwtSecrate = process.env.jwtSecrate;

const validateShop = [
  body('name').notEmpty().withMessage('Name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('product').notEmpty().withMessage('Product must be a provided'),
];

router.get('/add', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // Replace with your secret key
    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can add new shop',
        error: null
      });
    }
    const products = await Product.find({}, '_id name productSKU');
    res.render('./pages/add-shop', { products, errors: [] });
  } catch (error) {
    console.error(error);
    res.send('Error loading shop form');
  }
});

router.get('/', async (req, res) => {
  try {
    const shops = await Shop.find({})
      .populate({ path: 'product', select: 'productSKU' });
    res.render('pages/shop-list', { shops });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/delete/:id', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // use your secret key

    // Only admin can delete
    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can delete shop',
        error: null
      });
    }

    // Check if the shop has associated tags
    const tag = await Tag.findOne({ shop: new mongoose.Types.ObjectId(req.params.id) }); // Corrected syntax

    if (tag) {
      return res.render('pages/error', {
        message: 'Cannot delete this shop. First delete associated tag(s).',
        error: null
      });
    }

    // If no tag found, delete the shop
    await Shop.findByIdAndDelete(req.params.id);
    res.redirect('/shop'); // Or your shop list route
  } catch (err) {
    console.error(err);
    res.status(500).render('pages/error', {
      message: 'Delete failed due to server error.',
      error: err.message
    });
  }
});


router.get('/edit/:id', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // Replace with your secret key
    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can edit shop',
        error: null
      });
    }
    const shop = await Shop.findById(req.params.id).lean();
    shop.product = shop.product.map(p => p.toString()); // important rename
    const products = await Product.find().lean();
    res.render('./pages/edit-shop', { shop, products });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/edit/:id', async (req, res) => {
  try {
    const { name, address, product } = req.body;
    const shopId = req.params.id;
    // Convert product IDs to ObjectId (if it's an array of strings)
    const productIds = (Array.isArray(product) ? product : [product]).map(id => new mongoose.Types.ObjectId(id));

    const updatedShop = await Shop.findByIdAndUpdate(
      shopId,
      {
        name,
        address,
        product: productIds,
      },
      { new: true } // Return the updated document
    );

    if (!updatedShop) {
      return res.status(404).json({ msg: 'Shop not found' });
    }

    res.redirect('/shop'); // Or wherever your shop listing page is
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
})

router.post('/', validateShop, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Normalize input
    const name = req.body.name.trim().toLowerCase();
    const address = req.body.address.trim().toLowerCase();
    const product = req.body.product;
    const productIds = (Array.isArray(product) ? product : [product]).map(id => new mongoose.Types.ObjectId(id));

    // Check for existing shop
    const existingShop = await Shop.findOne({ name, address });
    if (existingShop) {
      return res.status(400).render('./pages/error', {
        message: 'Shop with this name and address already exists!',
        error: null
      });
    }

    const shop = new Shop({
      name,
      address,
      product: productIds
    });

    await shop.save();
    res.redirect('/shop'); // or res.status(201).json(shop);
  } catch (error) {
    console.error('Error saving shop:', error);
    if (error.code === 11000) {
      return res.status(400).render('./pages/error', {
        message: 'Shop with this name and address already exists!',
        error: null
      });
    }
    res.status(500).render('./pages/error', {
      message: 'An unexpected error occurred.',
      error
    });
  }
});

module.exports = router;