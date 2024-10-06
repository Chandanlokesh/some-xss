const mongoose = require('mongoose');

const scanResultSchema = new mongoose.Schema({
    url: { type: String, required: true },
    warnings: { type: Number, required: true },
    numberOfPayloadsExecuted: { type: Number, required: true },
    payloadId: { type: Number, required: true }, // This should match the payloadId type in payload.js
    message: { type: String, required: true },
    name: { type: String, required: true }, // Ensure this field is present
});

module.exports = mongoose.model('ScanResult', scanResultSchema);
