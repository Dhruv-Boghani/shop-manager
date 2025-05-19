  const mongoose = require('mongoose');

  const billSchema = new mongoose.Schema({
    billNo: {
      type: Number,
      required: true,
      unique: true,
    },
    customerName: {
      type: String,
      default: 'Guest',
    },
    customerPhone: {
      type: String,
      default: 'unknown',
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    products: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      rate: {
        type: Number,
        required: true,
      },
    }],
    totalAmount: {
      type: Number,
      required: true,
    },
    totalReceiveAmount: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

  const Bill = mongoose.model('Bill', billSchema);
  module.exports = Bill;

  // module.exports = billSchema