const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const checkAuth = require('./middleware/auth');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();
const { connectToWhatsApp } = require('./controler/whatsappClient');
const { ai_king } = require('./controler/ai_king');
const { cartoon } = require('./controler/cartoon');
const { motivate_english } = require('./controler/motivate_english');
const { motivate_hindi } = require('./controler/motivate_hindi');
const { movie_clip } = require('./controler/movie_clip');
const { nature } = require('./controler/nature');
const { real_beauty } = require('./controler/real_beauty');

const corsConfig = {
  origin: "*",
  Credential: true,
  method: ["GET", "POST", "PUT", "DELETE"],
}

const app = express();
const PORT = process.env.PORT || 3000;
// const MONGO_URI = 'mongodb://localhost:27017/full-Shop-Manger'; // Replace with your MongoDB URI
const MONGO_URI = 'mongodb+srv://dhruvboghani624:jQquPiMPGniQrb6T@kanishkastock.okpwf.mongodb.net/Shop-Manager?retryWrites=true&w=majority&appName=KanishkaStock' 
console.log(MONGO_URI);

app.use(cors(corsConfig));
app.options("", cors(corsConfig));

// Middleware
app.use(cookieParser());
app.use(checkAuth);
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use(cors());
app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout'); // default layout file (views/layout.ejs)
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // <== Add this line

//routes
app.use('/', require('./routes/home/home'));
app.use('/otp', require('./routes/signUp/otp'));
app.use('/login', require('./routes/login/login'));
app.use('/signup/otp', require('./routes/signUp/otp')); 
app.use('/signup', require('./routes/signUp/signUp')); 
app.use('/product', require('./routes/product/product'));
app.use('/shop', require('./routes/shop/shop'));
app.use('/tag', require('./routes/tag/tag-genrater'));
app.use('/bill', require('./routes/bill/bill'));
app.use('/logout', require('./routes/logout/logout'));
app.use('/delete-Account', require('./routes/logout/deleteaccount'))
app.use('/billing', require('./routes/bill/billing'));
app.use('/tags', require('./routes/tag/tags'));
app.use('/billing/abill', require('./routes/bill/abill'));
app.use('/allbill', require('./routes/data/allbill'));
app.use('/report', require('./routes/shop/report'));
app.use('/assign', require('./routes/shop/assign'));


//connection
// connectToWhatsApp(); // call this at startup

// insta call functions
ai_king();
cartoon();
motivate_english();
motivate_hindi();
movie_clip();
nature();
real_beauty();

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const axios = require('axios');

setInterval(() => {
  axios.get('https://shop-manager-t98e.onrender.com')
    .then(() => console.log('Pinged server to keep alive'))
    .catch(err => console.error('Ping failed', err));
}, 10 * 60 * 1000); // Every 10 minutes