const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    creds: { type: Object },
    keys: { type: Map, of: Buffer },
});

const Session = mongoose.model('Session', SessionSchema);
module.exports = Session;
