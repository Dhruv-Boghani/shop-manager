const express = require("express");
const Tag = require("../../model/Tag");
const Bill = require("../../model/Bill");
const Product = require("../../model/Product");
const Shop = require("../../model/Shop");
const Counter = require("../../model/Counter")
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const whatsappController = require("../../controler/whatsapp")

const router = express.Router();
const jwtSecrate = "DhruvBoghani624@#";

const validateBill = [
  body("tagIds").isArray({ min: 1 }).withMessage("At least one tag is required"),
  body("totalReceivingAmount")
    .notEmpty()
    .withMessage("Total receiving amount is required")
    .isNumeric()
    .withMessage("Total receiving amount must be a number"),
  body("customerName").optional().isString(),
  body("mobileNo").optional().isString(),
];

router.get('/', (req, res) => {
  try {
    const token = req.cookies.shop;
    if (!token) {
      return res.redirect('/bill'); // no shop selected
    }

    const decoded = jwt.verify(token, jwtSecrate);
    const shopId = decoded.shopId;

    res.render('pages/billing', { shopId }); // 👈 pass shopId to EJS
  } catch (error) {
    console.error(error);
    res.render('pages/error', { message: 'Failed to load billing page', error });
  }
});


router.post("/", validateBill, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const decodedShop = jwt.verify(req.cookies.shop, jwtSecrate);
  const shopId = decodedShop.shopId;

  const { tagIds, customerName, mobileNo, totalReceivingAmount } = req.body;

  for (const tagId of tagIds) {
    const tagData = await Tag.findById(tagId);
    if (!tagData) {
      return res.status(400).json({
        error: `Cannot find tag ${tagId}`,
      });
    }
  }
  
  const getNextCount = async () => {
    // Always find and update the single counter document
    let counter = await Counter.findOneAndUpdate(
      {}, // No filter = only one counter allowed
      { $inc: { value: 1 } },
      { new: true, upsert: true } // Create if not exists
    );
  
    // Reset if over 999
    if (counter.value >= 1000) {
      counter.value = 0;
      await counter.save();
    }
  
    return counter.value;
  };
  
  // Usage
  const billno = await getNextCount();
  
  // product array
  const products = [];

  for (const tagId of tagIds) {
    const tagData = await Tag.findById(tagId);
    const productData = await Product.findById(tagData.product);
    const shopData = await Shop.findById(shopId);

    // Check if product already exists in products array
    const existingIndex = products.findIndex(
      (item) => item.productId.toString() === tagData.product.toString()
    );

    if (existingIndex !== -1) {
      // Product already in array → update quantity
      products[existingIndex].quantity += 1;
    } else {
      // Add new product object
      products.push({
        productId: tagData.product,
        name: tagData.itemName, // now works since you added `name` in schema
        quantity: 1,
        rate: productData.salePrice,
      });
    }
  }

  // Calculate total amount
  let totalAmount = 0;
  products.forEach((product) => {
    const productPrice = product.rate * product.quantity;
    totalAmount += productPrice;
  });
  console.log("totalAmount", totalAmount);

  const bill = new Bill({
    shopId: shopId,
    customerName: customerName || "Unknown Customer",
    customerPhone: mobileNo || "Unknown Number",
    totalReceiveAmount: totalReceivingAmount,
    products: products,
    billNo: billno,
    totalAmount: totalAmount,
  });

  let savebill;
  try {
    savebill = await bill.save();
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate billNo, delete old and try again
      await Bill.findOneAndDelete({ billNo: billno });
      savebill = await bill.save(); // Save again
    } else {
      console.error("Error saving bill:", err);
      return res.status(500).send("Something went wrong");
    }
  }


  for (const tagId of tagIds) {
    await Tag.findByIdAndDelete(tagId);
  }

  if (mobileNo) {
    whatsappController(savebill._id);
}

  req.body.shopId = shopId;
  res.redirect(`/billing/abill?id=${savebill._id}`);

});

module.exports = router;