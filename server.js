const express = require('express');
const mongoose = require('mongoose');
const loadPayloads = require('./loadPayloads');
const Payload = require('./models/payload'); // Ensure this import is correct
const payloadRoutes = require('./routes/payloadRoutes');

const app = express();
const PORT = process.env.PORT || 3001; // Changed port to 3001

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
            if (urlPayload.payloadId) {
              const newPayload = new Payload({
                payloadId: urlPayload.payloadId.toString(),
                payload: urlPayload.payload,
                type: 'url',
              });
              await newPayload.save();
            } else {
              console.error('Missing payloadId property in urlPayload:', urlPayload);
            }
          })
        );

        // Insert Form payloads
        await Promise.all(
          formPayloads.map(async (formPayload) => {
            if (formPayload.payloadId) {
              const newPayload = new Payload({
                payloadId: formPayload.payloadId.toString(),
                payload: formPayload.payload,
                type: 'form',
              });
              await newPayload.save();
            } else {
              console.error('Missing payloadId property in formPayload:', formPayload);
            }
          })
        );

        console.log('Payloads loaded into the database successfully');
      } catch (error) {
        console.error('Error loading payloads into the database:', error);
      }
    };

    await initializePayloads();

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${server.address().port}`);
    });

    // Handle errors
    server.on('error', (error) => {
      console.error('Error starting server:', error);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Start the server
startServer();