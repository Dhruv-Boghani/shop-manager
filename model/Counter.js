const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // One counter per name
  },
  value: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;
