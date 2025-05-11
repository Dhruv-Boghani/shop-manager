const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Tag = require('../../model/Tag');
const User = require('../../model/User');
const Shop = require('../../model/Shop');

const router = express.Router();
const TAGS_PER_PAGE = 20;

// Show paginated tags
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * TAGS_PER_PAGE;

    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#');

    let tags = [];
    let totalTags = 0;
    let shopName = null;

    if (tokenData.role === 'user') {
      return res.render('pages/error', {
        message: 'user not allowed to access the tags page',
        error: null
      });
    }

    if (tokenData.role === 'saller') {
      if (!req.cookies.shop) return res.redirect('/bill');

      try {
        const shopData = jwt.verify(req.cookies.shop, 'DhruvBoghani624@#');
        const shop = await Shop.findById(shopData.shopId);

        if (!shop) {
          res.clearCookie('shop');
          return res.redirect('/bill');
        }

        totalTags = await Tag.countDocuments({ shop: shop._id });
        tags = await Tag.find({ shop: shop._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(TAGS_PER_PAGE);

        shopName = shop.name;

        return res.render('pages/tags', {
          tags,
          shopName,
          currentPage: page,
          totalPages: Math.ceil(totalTags / TAGS_PER_PAGE)
        });
      } catch (error) {
        console.error('JWT or shop error:', error);
        res.clearCookie('shop');
        return res.redirect('/bill');
      }
    }

    if (tokenData.role === 'manager') {
      if (!req.cookies.shop) return res.redirect('/bill');

      const user = await User.findOne({ email: tokenData.email });
      const shop = await Shop.findOne({ manager: user._id });

      totalTags = await Tag.countDocuments({ shop: shop._id });
      tags = await Tag.find({ shop: shop._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(TAGS_PER_PAGE);

      return res.render('pages/tags', {
        tags,
        shopName: null,
        currentPage: page,
        totalPages: Math.ceil(totalTags / TAGS_PER_PAGE)
      });
    }

    // For admin
    totalTags = await Tag.countDocuments();
    tags = await Tag.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(TAGS_PER_PAGE)
      .populate('shop', 'name');

    res.render('pages/tags', {
      tags,
      shopName: null,
      currentPage: page,
      totalPages: Math.ceil(totalTags / TAGS_PER_PAGE)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Search route (returns JSON)
router.get('/search', async (req, res) => {
  const query = req.query.q || '';

  try {
    const tags = await Tag.aggregate([
      {
        $addFields: {
          idStr: { $toString: '$_id' }
        }
      },
      {
        $match: {
          $or: [
            { idStr: { $regex: query, $options: 'i' } },
            { itemName: { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 50 } // Optional: limit for search results
    ]);

    res.json(tags);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search tags' });
  }
});

// Delete a tag by ID
router.post('/delete/:id', async (req, res) => {
  try {
    await Tag.findByIdAndDelete(req.params.id);
    res.redirect('/tags');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete tag');
  }
});

module.exports = router;
