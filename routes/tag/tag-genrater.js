const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { createCanvas, loadImage } = require('canvas');
const { PDFDocument } = require('pdf-lib');
const jwt = require('jsonwebtoken');

const Tag = require('../../model/Tag');
const Product = require('../../model/Product');
const Shop = require('../../model/Shop');

mongoose.set('strictPopulate', false);

const validateTag = [
  body('product').notEmpty().withMessage('Product ID is required'),
  body('shop').notEmpty().withMessage('Shop ID is required'),
  body('no').isInt({ min: 1 }).withMessage('`no` must be a number >= 1')
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
    barcode
  };
}

async function generateTagImage(dataObj) {
  const width = 600;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  const qrCodePath = path.resolve(dataObj.qrCode);
  const barcodePath = path.resolve(dataObj.barcode);

  const [qrImg, barcodeImg] = await Promise.all([
    loadImage(qrCodePath),
    loadImage(barcodePath)
  ]);

  ctx.drawImage(qrImg, 20, 20, 120, 120);
  ctx.fillStyle = 'black';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`Shop : ${dataObj.shopName}`, 160, 30);
  ctx.fillText(`Product : ${dataObj.productName}`, 160, 60);
  ctx.fillText(`ID : ${dataObj.id}`, 160, 90);
  ctx.fillText(`Code : ${dataObj.code}`, 160, 120);
  ctx.fillText(`Price : ₹${dataObj.price}`, 20, 170);
  ctx.drawImage(barcodeImg, 180, 160, 360, 60);

  const tagDir = path.join(__dirname, '../../public/tags');
  if (!fs.existsSync(tagDir)) fs.mkdirSync(tagDir, { recursive: true });

  const tagPath = path.join(tagDir, `${dataObj.id}.png`);
  const out = fs.createWriteStream(tagPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve, reject) => {
    out.on('finish', () => {
      fs.unlinkSync(qrCodePath);
      fs.unlinkSync(barcodePath);
      resolve(tagPath);
    });
    out.on('error', reject);
  });
}

router.get('/', async (req, res) => {
  try {
    const token = req.cookies.token;
    const tokenData = jwt.verify(token, 'DhruvBoghani624@#'); // Replace with your secret key
    if (tokenData.role !== 'admin') {
      return res.render('pages/error', {
        message: 'Only admin can access the tag generator',
        error: null
      });
    }
    const products = await Product.find({}, '_id name');
    const shops = await Shop.find({}, '_id name');
    res.render('./pages/tag-generator', { products, shops, errors: [] });
  } catch (err) {
    console.error(err);
    res.status(500).render('./pages/error', { msg: 'Error loading form' });
  }
});

router.post('/generate', validateTag, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const products = await Product.find({}, '_id name');
      const shops = await Shop.find({}, '_id name');
      return res.status(400).render('./pages/tag-generator', {
        products,
        shops,
        errors: errors.array()
      });
    }

    const { product, shop, no } = req.body;
    const productId = new mongoose.Types.ObjectId(product);
    const shopId = new mongoose.Types.ObjectId(shop);

    const qrPath = path.join(__dirname, '../../public/qrcodes');
    const barcodePath = path.join(__dirname, '../../public/barcodes');
    const tagDir = path.join(__dirname, '../../public/tags');

    [qrPath, barcodePath, tagDir].forEach((p) => {
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    const tagImagePaths = [];

    for (let i = 0; i < no; i++) {
      const product = await Product.findById(productId);
      const itemName = `${product.name}-(${product.name})`;
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
        textxalign: 'center'
      });
      fs.writeFileSync(barcodeFile, barcodeBuffer);

      const details = await fetchDetails(productId, shopId, tagId, qrFile, barcodeFile);
      const tagPath = await generateTagImage(details);
      tagImagePaths.push(tagPath);
    }

    // ✅ Create PDF and add all tag images
    const pdfDoc = await PDFDocument.create();

    for (const tagImagePath of tagImagePaths) {
      const imageBytes = fs.readFileSync(tagImagePath);
      const image = await pdfDoc.embedPng(imageBytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(tagDir, `tags.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);

    // ✅ Download PDF
    res.download(pdfPath, 'tags.pdf', (err) => {
      if (err) console.error('Download error:', err);

      // Optional: cleanup
      try {
        [tagDir, qrPath, barcodePath].forEach((dir) => {
          fs.readdir(dir, (err, files) => {
            if (err) return;
            for (const file of files) {
              fs.unlink(path.join(dir, file), () => {});
            }
          });
        });
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }
    });

  } catch (err) {
    console.error('Error generating tags:', err);
    res.status(500).render('./pages/error', { msg: 'Error generating tags' });
  }
});

module.exports = router;