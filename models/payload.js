const mongoose = require('mongoose');

const payloadSchema = new mongoose.Schema({
    payload: { type: String, required: true }
});

module.exports = mongoose.model('Payload', payloadSchema);
