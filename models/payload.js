const mongoose = require('mongoose');

const payloadSchema = new mongoose.Schema({
    payloadId: { type: Number, required: true, unique: true }, // Changed to Number for consistency
    payload: { type: String, required: true },
    type: { type: String, enum: ['url', 'form'], required: true } // Type of payload (url or form)
});

const Payload = mongoose.model('Payload', payloadSchema);
module.exports = Payload;
