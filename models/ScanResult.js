const mongoose = require('mongoose');

const scanResultSchema = new mongoose.Schema({
    url: { type: String, required: true },
    warnings: { type: Number, required: true },
    numberOfPayloadsExecuted: { type: Number, required: true },
    payloadId: { type: [Number], required: true }, // Ensure this is an array
    message: { type: String, required: true },
    name: { type: String, required: true }
});

module.exports = mongoose.model('ScanResult', scanResultSchema);
