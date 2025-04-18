const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const jwtSecrate = "DhruvBoghani624@#"

// Route for the home page
router.get('/', (req, res) => {
    const token = req.cookies.token; // Get the token from cookies
    if (token) {
        const data = jwt.verify(token, jwtSecrate);
        console.log(data);
        res.render('./pages/home'); // Render the home page with user data
    } else {
        return res.redirect('/login'); // Redirect to login if token doesn't exist
    }
});

module.exports = router;