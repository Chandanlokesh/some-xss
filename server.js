const express = require('express');
const mongoose = require('mongoose');
const loadPayloads = require('./loadPayloads');
const Payload = require('./models/payload'); // Ensure this import is correct
const payloadRoutes = require('./routes/payloadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/payloads', payloadRoutes);

// Connect to MongoDB
const startServer = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/mydatabase');
        console.log('MongoDB connected');

        // Load payloads into the database
        const { urlPayloads, formPayloads } = await loadPayloads();

        // Function to initialize payloads
        const initializePayloads = async () => {
            try {
                // Insert URL payloads
                await Promise.all(
                    urlPayloads.map(async (urlPayload) => {
                        const newPayload = new Payload({
                            payloadId: urlPayload.id.toString(), // Ensure payloadId is a string
                            payload: urlPayload.payload,
                            type: 'url',
                        });
                        await newPayload.save();
                    })
                );

                // Insert Form payloads
                await Promise.all(
                    formPayloads.map(async (formPayload) => {
                        const newPayload = new Payload({
                            payloadId: formPayload.id.toString(), // Ensure payloadId is a string
                            payload: formPayload.payload,
                            type: 'form',
                        });
                        await newPayload.save();
                    })
                );

                console.log('Payloads loaded into the database successfully');
            } catch (error) {
                console.error('Error loading payloads into the database:', error);
            }
        };

        await initializePayloads();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};

// Start the server
startServer();