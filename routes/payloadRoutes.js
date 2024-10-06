const express = require('express');
const Payload = require('../models/payload');
const router = express.Router();

// Route to get all payloads
router.get('/', async (req, res) => {
    try {
        const payloads = await Payload.find();
        res.status(200).json(payloads);
    } catch (error) {
        console.error('Error fetching payloads:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to add a new payload
router.post('/', async (req, res) => {
    const { payloadId, payload, type } = req.body;

    // Basic validation for required fields
    if (!payloadId || !payload || !type) {
        return res.status(400).json({ message: 'PayloadId, payload, and type are required.' });
    }

    try {
        const newPayload = new Payload({
            payloadId,
            payload,
            type
        });
        await newPayload.save();
        res.status(201).json(newPayload);
    } catch (error) {
        console.error('Error adding payload:', error);
        res.status(500).json({ message: 'Error saving the payload.' });
    }
});

module.exports = router;
