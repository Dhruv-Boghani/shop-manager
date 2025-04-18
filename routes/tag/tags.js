// routes/tags.js
const express = require('express');
const Tag = require('../../model/Tag'); // Adjust the path to your Tag model
const jwt = require('jsonwebtoken');
const User = require('../../model/User'); // Adjust the path to your User model
const Shop = require('../../model/Shop'); // Adjust the path to your Shop model
const mongoose = require('mongoose'); // Import mongoose for ObjectId conversion

const router = express.Router();
// Show all tags
router.get('/', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // Replace with your secret key

    if(tokenData.role === 'user'){
      return res.render('pages/error', {
        message: 'user not allowed to access the tags page',
        error: null
      });
    }

    if (tokenData.role === 'saller') {
      if (!req.cookies.shop) {
        return res.redirect('/bill'); // 🛑 Add return here to stop further execution
      }
    
      try {
        const shopData = jwt.verify(req.cookies.shop, 'DhruvBoghani624@#'); // ✅ Add jwtSecrate
        const shop = await Shop.findOne({ _id: new mongoose.Types.ObjectId(shopData.shopId) });
    
        if (!shop) {
          res.clearCookie('shop');
          return res.redirect('/bill'); // ✅ Fallback if shop not found
        }
    
        const tags = await Tag.find({ shop: shop._id }).sort({ createdAt: -1 });
        return res.render('pages/tags', { tags });
    
      } catch (error) {
        console.error('JWT Error or Shop not found:', error);
        res.clearCookie('shop');
        return res.redirect('/bill'); // ✅ Safe fallback
      }
    }
    

    if (tokenData.role === 'manager') {
      const user = await User.findOne({ email: tokenData.email });
      const shop = await Shop.findOne({ manager: new mongoose.Types.ObjectId(user._id) });
      const tags = await Tag.find({ shop: new mongoose.Types.ObjectId(shop._id) }).sort({ createdAt: -1 });
    
      return res.render('pages/tags', { tags });
    }
    
    const tags = await Tag.find().sort({ createdAt: -1 });
    res.render('pages/tags', { tags });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});
// Search route - return filtered tags as JSON
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
        { $sort: { createdAt: -1 } }
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
