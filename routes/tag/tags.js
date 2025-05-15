// routes/tags.js
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Tag = require('../../model/Tag');
const User = require('../../model/User');
const Shop = require('../../model/Shop');

const router = express.Router();

const ITEMS_PER_PAGE = 50;

// GET /tags - View tags with pagination
router.get('/', async (req, res) => {
  const token = req.cookies.token;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  try {
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#');
    let filter = {};
    let shopName = null;

    if (tokenData.role === 'user') {
      return res.render('pages/error', {
        message: 'user not allowed to access the tags page',
        error: null
      });
    }

    if (tokenData.role === 'saller') {
      if (!req.cookies.shop) return res.redirect('/bill');

      const shopData = jwt.verify(req.cookies.shop, 'DhruvBoghani624@#');
      const shop = await Shop.findById(shopData.shopId);

      if (!shop) {
        res.clearCookie('shop');
        return res.redirect('/bill');
      }

      filter = { shop: shop._id };
      shopName = shop.name;

    } else if (tokenData.role === 'manager') {
      const user = await User.findOne({ email: tokenData.email });
      const shop = await Shop.findOne({ manager: user._id });

      if (!shop) return res.redirect('/bill');
      filter = { shop: shop._id };

    } // admin will see all tags (no extra filter)

    const totalTags = await Tag.countDocuments(filter);
    const tags = await Tag.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .populate('shop', 'name');

    const totalPages = Math.ceil(totalTags / ITEMS_PER_PAGE);

    res.render('pages/tags', {
      tags,
      shopName,
      currentPage: page,
      totalPages
    });

  } catch (err) {
    console.error('Error loading tags:', err);
    res.status(500).send('Server Error');
  }
});

// GET /tags/search - Search with pagination
router.get('/search', async (req, res) => {
  const query = req.query.q?.trim() || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const skip = (page - 1) * limit;

  try {
    const pipeline = [
      {
        $addFields: {
          idString: { $toString: '$_id' } // Convert ObjectId to string
        }
      },
      {
        $match: {
          $or: [
            { itemName: { $regex: query, $options: 'i' } },
            { idString: { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'shops',
          localField: 'shop',
          foreignField: '_id',
          as: 'shop'
        }
      },
      {
        $unwind: {
          path: '$shop',
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    const tags = await Tag.aggregate(pipeline);

    const countPipeline = [...pipeline.slice(0, 2), { $count: 'total' }];
    const countResult = await Tag.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    res.json({
      tags,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});


// POST /tags/delete/:id - Delete tag
router.post('/delete/:id', async (req, res) => {
  try {
    await Tag.findByIdAndDelete(req.params.id);
    res.redirect('/tags');
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).send('Failed to delete tag');
  }
});

module.exports = router;
