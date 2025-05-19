const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  product: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
});

shopSchema.index({ name: 1, address: 1 }, { unique: true });

const Shop = mongoose.model('Shop', shopSchema);
module.exports = Shop;

// module.exports = shopSchema