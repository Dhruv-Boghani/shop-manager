const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    Object.keys(req.cookies).forEach(cookie => {
        res.clearCookie(cookie);
    });
    res.redirect('/login'); // or any response
});

module.exports = router;