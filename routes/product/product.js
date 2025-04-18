const express = require('express');
const Product = require('../../model/Product');
const Tag = require('../../model/Tag');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const jwt = require('jsonwebtoken');

const jwtSecret = "DhruvBoghani624@#"
const validateProduct = [
    body('name').notEmpty().withMessage('Name is required'),
    body('buyPrice').notEmpty().withMessage('Buy price must be provided').isNumeric().withMessage('Buy price must be a number'),
    body('salePrice').notEmpty().withMessage('Sale price must be provided').isNumeric().withMessage('Sale price must be a number'),

];

router.get('/', async (req, res) => {
    try {
        const token = req.cookies.token;
            const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // Replace with your secret key
            if (tokenData.role !== 'admin') {
              return res.render('pages/error', {
                message: 'Only admin can access the product page',
                error: null
              });
            }
        const data = jwt.verify(req.cookies.token, jwtSecret);
        if (['admin', 'manager', 'seller', 'user'].includes(data.role)) {
            const query = req.query.search || '';
            let products = [];

            // Only search if query contains at least one alphabet character
            if (/[a-zA-Z]/.test(query)) {
                products = await Product.find({
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { productSKU: { $regex: query, $options: 'i' } }
                    ]
                });
            } else {
                // If no search or invalid, show all products
                products = await Product.find({});
            }

            res.render('./pages/product', { products, error: [] });
        }
    } catch (error) {
        console.error(error);
        return res.status(401).json({ msg: 'Unauthorized' });
    }
});

router.get('/edit/:id', async (req, res) => {
    const product = await Product.findById(req.params.id).lean();
    res.render('./pages/edit-product', { product });
});

router.post('/edit/:id', async (req, res) => {
    const { productSKU, name, buyPrice, salePrice, description } = req.body;
    await Product.findByIdAndUpdate(req.params.id, {
        productSKU,
        name,
        buyPrice,
        salePrice,
        description
    });
    res.redirect('/product');
});

router.post('/delete/:id', async (req, res) => {
    const tag = await Tag.findOne({ product: req.params.id });
    if (tag) {
        return res.render('pages/error', {
            message: 'Cannot delete product with associated tags',
            error: null
          });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/product'); // or wherever your listing is
});


router.get('/add', async (req, res) => {
    try {
        res.render('./pages/productForm', { error: [] }); // Render empty form
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.post('/', validateProduct, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = jwt.verify(req.cookies.token, jwtSecret);
        if (data.role !== 'admin') {
            return res.status(401).json({ msg: 'only admin can add product' });
        }

        const { name, buyPrice, salePrice, description, productSKU } = req.body;

        const product = new Product({
            name,
            productSKU,
            buyPrice,
            salePrice,
            description
        });
        await product.save();
        res.redirect('/product');
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;