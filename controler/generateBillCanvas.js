const { createCanvas } = require("canvas");
const Bill = require("../model/Bill");
const Shop = require("../model/Shop");
const Product = require("../model/Product");

async function generateBillCanvas(billId) {
  const bill = await Bill.findById(billId);
  if (!bill) throw new Error("Bill not found");

  const shop = await Shop.findById(bill.shopId);
  if (!shop) throw new Error("Shop not found");

  const canvas = createCanvas(600, 800, 'pdf');
  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = "#000";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(shop.name.toUpperCase(), canvas.width / 2, 50);

  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  let y = 90;

  ctx.fillText(`Bill No: ${bill.billNo}`, 40, y);
  ctx.fillText(`Date: ${new Date(bill.createdAt).toLocaleString()}`, 320, y);
  y += 30;

  ctx.fillText(`Customer: ${bill.customerName}`, 40, y);
  ctx.fillText(`Phone: ${bill.customerPhone}`, 320, y);
  y += 40;

  // Table header
  ctx.font = "bold 14px Arial";
  ctx.fillText("Item", 40, y);
  ctx.fillText("Qty", 250, y);
  ctx.fillText("Rate", 320, y);
  ctx.fillText("Amt", 400, y);
  y += 25;

  // Table rows
  ctx.font = "14px Arial";
  for (const p of bill.products) {
    const product = await Product.findById(p.productId);
    const name = product?.name || "Item";
    const qty = p.quantity || 1;
    const rate = p.rate || 0;
    const amt = qty * rate;

    ctx.fillText(name, 40, y);
    ctx.fillText(qty.toString(), 250, y);
    ctx.fillText(rate.toString(), 320, y);
    ctx.fillText(amt.toString(), 400, y);
    y += 25;
  }

  // Totals
  y += 20;
  ctx.font = "bold 16px Arial";
  ctx.fillText(`Total Amount: ₹${bill.totalAmount}`, 40, y);
  y += 25;
  ctx.fillText(`Received: ₹${bill.totalReceiveAmount}`, 40, y);
  y += 25;
  ctx.fillText(`Discount: ₹${bill.totalAmount - bill.totalReceiveAmount}`, 40, y);

  // Return PDF buffer directly
  const buffer = canvas.toBuffer("application/pdf");
  return buffer;
}

module.exports = generateBillCanvas;
