const express = require("express");
const generateBillCanvas = require('../../controler/generateBillCanvas');
const fs = require('fs');
const Bill = require("../../model/Bill");
const Shop = require("../../model/Shop");
const path = require('path');

const router = express.Router();

router.get("/", async (req, res) => {
    const billId = req.query.id; // 👈 this gets the ID from the URL
    res.render("pages/abill", { billId }); // 👈 pass billId to EJS
});


router.get('/download', async (req, res) => {
  const billId = req.query.id;
  console.log("🔍 Bill ID received:", billId);

  try {
    const pdfPath = await generateBillCanvas(billId);

    res.download(pdfPath, (err) => {
      if (err) {
        console.error("❌ Error during download:", err.message);
        res.status(500).send("Download failed");
      } else {
        // ✅ Delete the file after successful download
        fs.unlink(pdfPath, (err) => {
          if (err) {
            console.error("⚠️ Error deleting file:", err.message);
          } else {
            console.log("🗑️ PDF deleted after download:", pdfPath);
          }
        });
      }
    });
  } catch (err) {
    console.error("❌ Failed to generate PDF:", err.message);
    res.status(500).send("Failed to generate PDF");
  }
});

// routes/bill/abill.js

router.get("/print", async (req, res) => {
    const billId = req.query.id;
    // console.log("🖨️ Print Bill ID:", billId);
  
    try {
      const billData = await Bill.findById(billId).populate("products.productId").lean();
      const shopData = await Shop.findById(billData.shopId).lean();
  
      res.render("pages/printBill", {
        bill: billData,
        shop: shopData,
      });
    } catch (err) {
      console.error("❌ Print bill error:", err.message);
      res.status(500).send("Failed to load printable bill");
    }
  });
  
module.exports = router;