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
const jwtSecrate = process.env.jwtSecrate;

const Tag = require('../../model/Tag');
const Product = require('../../model/Product');
const Shop = require('../../model/Shop');
const { log } = require('console');

registerFont(path.join(__dirname, '../../fonts/OpenSans-Regular.ttf'), {
  family: 'OpenSans',
  weight: 'normal',
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

  // Get the current date in the format DD.MM.YY
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
  const year = String(currentDate.getFullYear()).slice(-2); // get last 2 digits of the year

  // Generate the code in the desired format
  const code = `${day}.${month}.${year}K${product.buyPrice}`;

  return {
    price: product.salePrice,
    shopName: shop.name,
    productName: product.name,
    code, // Updated code format
    id: tagId,
    qrCode,
    barcode,
  };
}

function mmToPx(mm) {
  return Math.round((mm / 25.4) * 300);
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

async function generateTagImage(dataObj, tagDir) {
  // --- CONFIGURATION ---
  const tagWidth = 52.5;
  const tagHeight = 21.2;
  const borderPad = 1; // 1mm border

  const canvasWidth = mmToPx(tagWidth);
  const canvasHeight = mmToPx(tagHeight);
  const padding = mmToPx(borderPad);

  // QR Size: 18mm (Kept same to preserve aspect ratio)
  const qrSize = mmToPx(18);

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Load Images
  const [qrImg, barcodeImg] = await Promise.all([
    loadImage(dataObj.qrCode),
    loadImage(dataObj.barcode),
  ]);

  // --- DRAWING LOGIC ---

  // 1. Draw QR Code (Vertically Centered)
  const qrX = padding;
  const qrY = (canvasHeight - qrSize) / 2;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 2. Text Configuration
  // Start text slightly earlier horizontally if needed, or keep standard gap
  const textX = qrX + qrSize + mmToPx(1.5);

  // Start drawing slightly higher to accommodate larger font
  // Changed from 4mm to 3.5mm top offset
  let textY = padding + mmToPx(3.5);

  ctx.fillStyle = 'black';

  // --- Price (Significantly Larger) ---
  // Increased from 50px to 58px
  ctx.font = '58px OpenSans';
  ctx.fillText(`₹ ${dataObj.price}`, textX, textY);
  ctx.fillText(`₹ ${dataObj.price}`, textX + 1, textY); // Extra bold

  // --- ID (Larger) ---
  // Increased from 32px to 40px
  ctx.font = '40px OpenSans';
  const id = dataObj.id.toString();
  const shortId = `${id.slice(0, 6)}-${id.slice(-6)}`;

  // Increased spacing from 45 to 52 to prevent overlap
  textY += 52;

  ctx.fillText(shortId, textX, textY);
  ctx.fillText(shortId, textX + 1, textY); // Bold
  ctx.fillText(shortId, textX, textY + 1); // Shadow

  // --- Code (Slightly Larger) ---
  // Increased from 26px to 30px
  ctx.font = '30px OpenSans';

  // Increased spacing from 32 to 38
  textY += 38;

  ctx.fillText(`Code: ${dataObj.code}`, textX, textY);
  ctx.fillText(`Code: ${dataObj.code}`, textX + 1, textY);

  // 3. Barcode (Bottom Right)
  const maxBarcodeWidth = mmToPx(24);
  const maxBarcodeHeight = mmToPx(4.5);

  let barcodeRatio = barcodeImg.width / barcodeImg.height;
  let finalBarcodeWidth = maxBarcodeWidth;
  let finalBarcodeHeight = finalBarcodeWidth / barcodeRatio;

  if (finalBarcodeHeight > maxBarcodeHeight) {
    finalBarcodeHeight = maxBarcodeHeight;
    finalBarcodeWidth = finalBarcodeHeight * barcodeRatio;
  }

  const barcodeX = canvasWidth - finalBarcodeWidth - padding;
  const barcodeY = canvasHeight - finalBarcodeHeight - padding;

  ctx.drawImage(barcodeImg, barcodeX, barcodeY, finalBarcodeWidth, finalBarcodeHeight);

  // Save PNG
  const tagPath = path.join(tagDir, `${dataObj.id}.png`);
  const out = fs.createWriteStream(tagPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve, reject) => {
    out.on('finish', () => {
      try {
        if (fs.existsSync(dataObj.qrCode)) fs.unlinkSync(dataObj.qrCode);
        if (fs.existsSync(dataObj.barcode)) fs.unlinkSync(dataObj.barcode);
      } catch (e) {
        console.error("Error cleaning up temp files:", e);
      }
      resolve(tagPath);
    });
    out.on('error', reject);
  });
}

// Tag generator form page
router.get('/', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, jwtSecrate);

    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can access the tag generator',
        error: null,
      });
    }

    const products = await Product.find({}, '_id name productSKU');
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
