const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

const Tag = mongoose.model('Tag', TagSchema);
module.exports = Tag;

// module.exports = TagSchema