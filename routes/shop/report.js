const express = require('express');
const Product = require('../../model/Product');
const Shop = require('../../model/Shop');
const Tag = require('../../model/Tag');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // Replace with your secret key
    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can see all shop reports',
        error: null
      });
    }
    const shops = await Shop.find({});
    const shopTables = [];

    for (const shop of shops) {
      const tags = await Tag.find({ shop: shop._id }).populate('product');

      // Collect product-wise quantity and buy price
      const productMap = {};

      for (const tag of tags) {
        const product = tag.product;
        if (!product) continue;

        const key = product._id.toString();

        if (!productMap[key]) {
          productMap[key] = {
            name: product.name || "Unnamed",
            sku: product.productSKU || "no SKU",
            buyPrice: product.buyPrice || 0,
            quantity: 1,
          };
          
        } else {
          productMap[key].quantity += 1;
        }
      }

      // Convert map to table format
      const table = [];
      let totalInvestment = 0;
      let index = 1;

      for (const key in productMap) {
        const { name, buyPrice, quantity, sku } = productMap[key];
        const investment = buyPrice * quantity;

        table.push({
          index: index++,
          name,
          sku,
          buyPrice,
          quantity,
          investment,
        });
        

        totalInvestment += investment;
      }

      shopTables.push({
        shopName: shop.name,
        shopId: shop._id,
        table,
        totalInvestment,
      });
    }

    // Render view or send data
    res.render('./pages/shop-investments', { shopTables });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});



module.exports = router;