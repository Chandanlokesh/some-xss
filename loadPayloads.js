const fs = require('fs').promises; // Import the promises API for file system
const path = require('path');

// Function to load payloads from JSON files
const loadPayloads = async () => {
    try {
        const urlPayloadsPath = path.join(__dirname, 'url-payloads.json');
        const formPayloadsPath = path.join(__dirname, 'form-payloads.json');

        // Check if the files exist
        await fs.access(urlPayloadsPath);
        await fs.access(formPayloadsPath);

        // Read and parse the JSON files
        const urlPayloads = JSON.parse(await fs.readFile(urlPayloadsPath, 'utf-8'));
        const formPayloads = JSON.parse(await fs.readFile(formPayloadsPath, 'utf-8'));

        // Ensure the payloads are in the correct format
        const formattedUrlPayloads = urlPayloads.map((payload, index) => ({
            payloadId: index + 1, // Assign a unique ID
            payload,
            type: 'url'
        }));

        const formattedFormPayloads = formPayloads.map((payload, index) => ({
            payloadId: index + 1, // Assign a unique ID
            payload,
            type: 'form'
        }));

        return { urlPayloads: formattedUrlPayloads, formPayloads: formattedFormPayloads }; // Return the payloads as an object
    } catch (error) {
        console.error('Error loading payloads:', error);
        throw error; // Re-throw the error for handling in server.js
    }
};

module.exports = loadPayloads;
