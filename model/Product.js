const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  productSKU: {
    type: String,
    required: true,
    unique: true,
  },
  buyPrice: {
    type: Number,
    required: true,
  },
  salePrice: {
    type: Number,
    required: true,
  },
    description: {
      type: String,
      default: 'no description',
    },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;