const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { PDFDocument } = require('pdf-lib');
const jwt = require('jsonwebtoken');

const Tag = require('../../model/Tag');
const Product = require('../../model/Product');
const Shop = require('../../model/Shop');

// ✅ Register custom font (must be done before any canvas operations)
registerFont(path.join(__dirname, '../../fonts/OpenSans-Regular.ttf'), {
  family: 'OpenSans',
});


mongoose.set('strictPopulate', false);

const validateTag = [
  body('product').notEmpty().withMessage('Product ID is required'),
  body('shop').notEmpty().withMessage('Shop ID is required'),
  body('no').isInt({ min: 1 }).withMessage('`no` must be at least 1'),
];

async function fetchDetails(productId, shopId, tagId, qrCode, barcode) {
  const product = await Product.findById(productId);
  const shop = await Shop.findById(shopId);
  if (!product || !shop) throw new Error('Invalid Product or Shop');

  return {
    price: product.salePrice,
    shopName: shop.name,
    productName: product.name,
    code: `123${product.buyPrice}`,
    id: tagId,
    qrCode,
    barcode,
  };
}

async function generateTagImage(dataObj, tagDir) {
  const width = 600;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Load images
  const [qrImg, barcodeImg] = await Promise.all([
    loadImage(dataObj.qrCode),
    loadImage(dataObj.barcode),
  ]);

  // Draw QR
  ctx.drawImage(qrImg, 20, 20, 120, 120);

  // Text
  ctx.fillStyle = 'black';
  ctx.font = 'bold 18px OpenSans';
  ctx.fillText(`Shop : ${dataObj.shopName}`, 160, 30);
  ctx.fillText(`Product : ${dataObj.productName}`, 160, 60);
  ctx.fillText(`ID : ${dataObj.id}`, 160, 90);
  ctx.fillText(`Code : ${dataObj.code}`, 160, 120);
  ctx.fillText(`Price : Rs. ${dataObj.price}`, 20, 170);

  // Draw barcode
  ctx.drawImage(barcodeImg, 180, 160, 360, 60);

  const tagPath = path.join(tagDir, `${dataObj.id}.png`);
  const out = fs.createWriteStream(tagPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve, reject) => {
    out.on('finish', () => {
      fs.unlinkSync(dataObj.qrCode);
      fs.unlinkSync(dataObj.barcode);
      resolve(tagPath);
    });
    out.on('error', reject);
  });
}

// Tag generator form page
router.get('/', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#');

    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can access the tag generator',
        error: null,
      });
    }

    const products = await Product.find({}, '_id name');
    const shops = await Shop.find({}, '_id name');
    res.render('./pages/tag-generator', { products, shops, errors: [] });
  } catch (err) {
    console.error(err);
    res.status(500).render('./pages/error', {
      message: 'Error loading form',
      error: err,
    });
  }
});

// Tag generator handler
router.post('/generate', validateTag, async (req, res) => {
  try {
    const errors = validationResult(req);
    const products = await Product.find({}, '_id name');
    const shops = await Shop.find({}, '_id name');

    if (!errors.isEmpty()) {
      return res.status(400).render('./pages/tag-generator', {
        products,
        shops,
        errors: errors.array(),
      });
    }

    const { product, shop, no } = req.body;
    const productId = new mongoose.Types.ObjectId(product);
    const shopId = new mongoose.Types.ObjectId(shop);

    try {
      const shop = await Shop.findById(shopId);
      const products = shop.product; // assuming this is an array of ObjectIds

      if (!products.some(id => id.equals(productId))) {
        return res.status(500).render('./pages/error', {
          message: 'Product not present in shop',
          error: null,
        });
      }

      // Continue with tag generation...
    } catch (error) {
      return res.status(500).render('./pages/error', {
        message: 'Error generating tags',
        error,
      });
    }

    const qrPath = path.join('/tmp', 'qrcodes');
    const barcodePath = path.join('/tmp', 'barcodes');
    const tagDir = path.join('/tmp', 'tags');

    [qrPath, barcodePath, tagDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const tagImagePaths = [];

    for (let i = 0; i < no; i++) {
      const product = await Product.findById(productId);
      const itemName = `${product.name}-(${product.name})`;
      const price = product.salePrice;
      const tag = new Tag({ product: productId, shop: shopId, itemName, price });
      const savedTag = await tag.save();
      const tagId = savedTag._id.toString();

      // Generate QR code
      const qrFile = path.join(qrPath, `${tagId}.png`);
      await QRCode.toFile(qrFile, tagId);

      // Generate Barcode
      const barcodeFile = path.join(barcodePath, `${tagId}.png`);
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: tagId,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });
      fs.writeFileSync(barcodeFile, barcodeBuffer);

      // Generate Image Tag
      const details = await fetchDetails(productId, shopId, tagId, qrFile, barcodeFile);
      const tagPath = await generateTagImage(details, tagDir);
      tagImagePaths.push(tagPath);
    }

    // Create PDF from images
    const pdfDoc = await PDFDocument.create();

    for (const tagImagePath of tagImagePaths) {
      const imageBytes = fs.readFileSync(tagImagePath);
      const image = await pdfDoc.embedPng(imageBytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const pdfPath = path.join(tagDir, 'tags.pdf');
    const pdfBuffer = await pdfDoc.save();

    // Send PDF buffer directly with headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tags.pdf"');
    res.send(pdfBuffer);

    // Optional: Cleanup after short delay (so response isn't interrupted)
    setTimeout(() => {
      try {
        [tagDir, qrPath, barcodePath].forEach((dir) => {
          fs.readdir(dir, (err, files) => {
            if (!err) {
              for (const file of files) {
                fs.unlink(path.join(dir, file), () => { });
              }
            }
          });
        });
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }
    }, 3000); // Wait 3 seconds before cleaning

  } catch (err) {
    console.error('Error generating tags:', err);
    res.status(500).render('./pages/error', {
      message: 'Error generating tags',
      error: err,
    });
  }
});

module.exports = router;
