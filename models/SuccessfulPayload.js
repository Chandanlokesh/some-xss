const mongoose = require('mongoose');

// Schema for storing successful payloads
const successfulPayloadSchema = new mongoose.Schema({
    payloadId: { type: String, required: true }, // Keeping this as String
    payload: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Create a model for the successful payloads
const SuccessfulPayload = mongoose.model('SuccessfulPayload', successfulPayloadSchema);

// Export the model for use in other files
module.exports = SuccessfulPayload;
