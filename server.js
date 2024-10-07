const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const ScanResult = require('./models/ScanResult'); // Your model for storing scan results
const SuccessfulPayload = require('./models/SuccessfulPayload'); // New model for successful payloads
const formPayloads = require('./form-payloads.json'); // Load form-based payloads
const urlPayloads = require('./url-payloads.json'); // Load URL-based payloads
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public')); // Serve static files from the public directory

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/your_database_name', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected.');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});


// Save scan results endpoint
app.post('/save-scan', async (req, res) => {
    const { url, warnings, numberOfPayloadsExecuted, message, successfulPayloads } = req.body;

    try {
        // Ensure successfulPayloads is an array of numbers
        const payloadId = successfulPayloads.map(payload => {
            if (typeof payload === 'object' && payload.id) {
                return Number(payload.id); // Convert to number
            }
            return null; // Handle cases where payload might not have an id
        }).filter(id => id !== null); // Filter out any null values

        const scanResult = new ScanResult({
            url,
            warnings,
            numberOfPayloadsExecuted,
            payloadId, // Ensure this is an array of numbers
            message,
            name: "User Scan" // Set to default or a user-defined name
        });

        await scanResult.save();
        console.log("Scan result saved to database.");
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving scan result:", error);
        res.status(500).json({ success: false, error: "Failed to save scan results." });
    }
});
// Endpoint to get scan results
app.get('/scan-results', async (req, res) => {
    try {
        const results = await ScanResult.find();
        res.json(results); // Ensure payloadId is included in the response
    } catch (error) {
        console.error("Error fetching scan results:", error);
        res.status(500).json({ error: "Failed to fetch scan results." });
    }
});




// Scanning endpoint
app.post('/scan', async (req, res) => {
    const { url, scanName, fastScan } = req.body;

    try {
        console.log(`Starting scan for URL: ${url}, Scan Name: ${scanName}, Fast Scan: ${fastScan}`);

        // Launch Puppeteer browser
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--disable-http2'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36');

        // Navigate to the page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

        // Wait for the input fields to load
        await page.waitForSelector('input, a[href]', { timeout: 5000 }).catch(() => {
            console.log('No input fields or links found within the specified time.');
        });

        // Scrape input fields and URLs from the page
        const inputFields = await page.$$eval('input', inputs => inputs.map(input => input.name || input.id || 'Unnamed Input'));
        const links = await page.$$eval('a[href]', anchors => anchors.map(anchor => anchor.href));

        console.log(`Input fields found: ${inputFields}`);
        console.log(`Links found: ${links}`);

        // If no input fields found, inform the user and return early
        if (inputFields.length === 0 && links.length === 0) {
            console.log('No input fields or links found on the page. Aborting scan.');
            return res.status(400).json({ message: 'No input fields or links found on the page.' });
        }

        let warnings = inputFields.length;
        let payloadsExecuted = 0;
        let successfulPayloadsArray = [];

        // Limit to 10 payloads for fast scan
        const limitedFormPayloads = fastScan ? formPayloads.slice(0, 10) : formPayloads;
        const limitedUrlPayloads = fastScan ? urlPayloads.slice(0, 10) : urlPayloads;

        // Function to update progress
        const updateProgress = (completed, total) => {
            let progress = Math.floor((completed / total) * 100);
            console.log(`Progress: ${progress}%`);
            io.emit('progress', progress); // Emit progress to the client
        };

        // Total payloads for progress calculation
        const totalPayloads = (limitedFormPayloads.length * inputFields.length) + (limitedUrlPayloads.length * links.length);

        // Inject payloads into input fields
        for (let inputName of inputFields) {
            for (let payload of limitedFormPayloads) {
                try {
                    await page.evaluate((inputName, payload) => {
                        let input = document.querySelector(`[name='${inputName}']`);
                        if (input) {
                            input.value = payload.payload;
                        }
                    }, inputName, payload);

                    payloadsExecuted++;
                    console.log(`Executed form payload: ${payload.payload} on input: ${inputName}`);

                    // Check if the payload was reflected in the DOM
                    const bodyContent = await page.content();
                    if (bodyContent.includes(payload.payload)) {
                        successfulPayloadsArray.push(payload.id);
                        console.log(`Payload reflected: ${payload.payload}`);

                        // Store successful payload in the new collection
                        const successfulPayload = new SuccessfulPayload({
                            payloadId: payload.id,
                            payload: payload.payload
                        });
                        await successfulPayload.save();
                    } else {
                        console.log(`Payload not reflected: ${payload.payload}`);
                    }

                    updateProgress(payloadsExecuted, totalPayloads); // Update progress
                } catch (err) {
                    console.error(`Failed to inject payload into ${inputName}:`, err);
                    continue; // Skip to the next payload if this one fails
                }
            }
        }

        // Inject payloads into URLs
        for (let link of links) {
            for (let payload of limitedUrlPayloads) {
                try {
                    const testUrl = `${link}?test=${payload.payload}`;
                    await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

                    payloadsExecuted++;
                    console.log(`Executed URL payload: ${payload.payload} on URL: ${testUrl}`);

                    // Check if the payload was reflected in the DOM
                    const bodyContent = await page.content();
                    if (bodyContent.includes(payload.payload)) {
                        successfulPayloadsArray.push(payload.id);
                        console.log(`Payload reflected in URL: ${payload.payload}`);

                        // Store successful payload in the new collection
                        const successfulPayload = new SuccessfulPayload({
                            payloadId: payload.id,
                            payload: payload.payload
                        });
                        await successfulPayload.save();
                    } else {
                        console.log(`Payload not reflected in URL: ${payload.payload}`);
                    }

                    updateProgress(payloadsExecuted, totalPayloads); // Update progress
                } catch (err) {
                    console.error(`Failed to inject payload into URL: ${link}`, err);
                    continue; // Skip to the next payload if this one fails
                }
            }
        }

        // Determine vulnerability level based on payloads executed
        let message = "Safe";
        if (successfulPayloadsArray.length > 5) {
            message = "High";
        } else if (successfulPayloadsArray.length > 0) {
            message = "Maybe";
        }

        // Save the scan result to MongoDB
        const scanResult = new ScanResult({
            url,
            warnings,
            numberOfPayloadsExecuted: payloadsExecuted,
            payloadId: successfulPayloadsArray, // Ensure this is an array of strings
            message,
            name: scanName || "Default Scan" // Use scanName from user or default value
        });

        await scanResult.save();
        console.log("Scan result saved to database.");

        // Close Puppeteer browser
        await browser.close();

        // Respond with the scan result
        res.json({
            url,
            warnings,
            numberOfPayloadsExecuted: payloadsExecuted,
            message,
            successfulPayloads: successfulPayloadsArray
        });
    } catch (error) {
        console.error("Error scanning:", error);
        res.status(500).json({ error: "Error during scan" });
    }
});

// Start server
http.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
