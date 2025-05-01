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
  const canvasWidth = 543;  // 46mm
  const canvasHeight = 248; // 21mm
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  const padding = 20;

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Load images
  const [qrImg, barcodeImg] = await Promise.all([
    loadImage(dataObj.qrCode),
    loadImage(dataObj.barcode),
  ]);

  // QR Code (size: 130x130)
  const qrSize = 130;
  const qrX = padding;
  const qrY = padding;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Text section
  const textX = qrX + qrSize + 15;
  let textY = qrY + 10;

  // Large Price
  ctx.fillStyle = 'black';
  ctx.font = 'bold 22px OpenSans';
  ctx.fillText(`Price : ${dataObj.price}`, textX, textY);
  
  // Other text
  ctx.font = 'bold 16px OpenSans';
  ctx.fillText(`Shop : ${dataObj.shopName}`, textX, textY += 30);
  ctx.fillText(`Product : ${dataObj.productName}`, textX, textY += 25);
  ctx.fillText(`ID : ${dataObj.id}`, textX, textY += 25);
  ctx.fillText(`Code : ${dataObj.code}`, textX, textY += 25);

  // Barcode (centered at bottom)
  const barcodeWidth = 306;
  const barcodeHeight = 50;
  const barcodeX = (canvasWidth - barcodeWidth) / 2;
  const barcodeY = canvasHeight - barcodeHeight - 20;
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeWidth, barcodeHeight);

  // Save image
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

    const shopDoc = await Shop.findById(shopId);
    if (!shopDoc || !shopDoc.product.some(id => id.toString() === productId.toString())) {
      return res.status(400).render('./pages/tag-generator', {
        products,
        shops,
        errors: [{ msg: 'Selected product is not assigned to the selected shop.' }],
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
      const itemName = `${product.name}-(${product.productSKU})`;
      const price = product.salePrice;
      const tag = new Tag({ product: productId, shop: shopId, itemName, price });
      const savedTag = await tag.save();
      const tagId = savedTag._id.toString();

      const qrFile = path.join(qrPath, `${tagId}.png`);
      await QRCode.toFile(qrFile, tagId);

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

      const details = await fetchDetails(productId, shopId, tagId, qrFile, barcodeFile);
      const tagPath = await generateTagImage(details, tagDir);
      tagImagePaths.push(tagPath);
    }

    const pdfDoc = await PDFDocument.create();

    for (const tagImagePath of tagImagePaths) {
      const imageBytes = fs.readFileSync(tagImagePath);
      const image = await pdfDoc.embedPng(imageBytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const pdfBuffer = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tags.pdf"');
    res.send(pdfBuffer);

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
    }, 3000);

  } catch (err) {
    console.error('Error generating tags:', err);
    res.status(500).render('./pages/error', {
      message: 'First, add the product to the shop, and then generate the tags.',
      error: err,
    });
  }
});


module.exports = router;
