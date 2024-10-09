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
app.use('/assets', express.static('assets'));

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
        const payloadId = successfulPayloads.map(payload => {
            if (typeof payload === 'object' && payload.id) {
                return Number(payload.id); // Convert to number
            }
            return null; 
        }).filter(id => id !== null);

        const scanResult = new ScanResult({
            url,
            warnings,
            numberOfPayloadsExecuted,
            payloadId, 
            message,
            name: "User Scan" 
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
        res.json(results); 
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

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--disable-http2'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36');

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

        await page.waitForSelector('input, a[href]', { timeout: 5000 }).catch(() => {
            console.log('No input fields or links found within the specified time.');
        });

        const inputFields = await page.$$eval('input', inputs => inputs.map(input => input.name || input.id || 'Unnamed Input'));
        const links = await page.$$eval('a[href]', anchors => anchors.map(anchor => anchor.href));

        console.log(`Input fields found: ${inputFields}`);
        console.log(`Links found: ${links}`);

        if (inputFields.length === 0 && links.length === 0) {
            console.log('No input fields or links found on the page. Aborting scan.');
            return res.status(400).json({ message: 'No input fields or links found on the page.' });
        }

        let warnings = inputFields.length;
        let payloadsExecuted = 0; // Tracks the total payloads executed
        let successfulPayloadsCount = 0; // New counter for successfully executed payloads
        let successfulPayloadsArray = [];

        const limitedFormPayloads = fastScan ? formPayloads.slice(0, 10) : formPayloads;
        const limitedUrlPayloads = fastScan ? urlPayloads.slice(0, 10) : urlPayloads;

        const totalPayloads = (limitedFormPayloads.length * inputFields.length) + (limitedUrlPayloads.length * links.length);

        const updateProgress = (completed, total) => {
            let progress = Math.floor((completed / total) * 100);
            console.log(`Progress: ${progress}%`);
            io.emit('progress', progress);
        };

        for (let inputName of inputFields) {
            for (let payload of limitedFormPayloads) {
                try {
                    await page.evaluate((inputName, payload) => {
                        let input = document.querySelector(`[name='${inputName}']`);
                        if (input) {
                            input.value = payload.payload;
                        }
                    }, inputName, payload);

                    payloadsExecuted++; // Increment for each executed payload
                    console.log(`Executed form payload: ${payload.payload} on input: ${inputName}`);

                    const bodyContent = await page.content();
                    if (bodyContent.includes(payload.payload)) {
                        successfulPayloadsArray.push(payload.id);
                        successfulPayloadsCount++; // Increment for each successful payload
                        console.log(`Payload reflected: ${payload.payload}`);

                        const successfulPayload = new SuccessfulPayload({
                            payloadId: payload.id,
                            payload: payload.payload
                        });
                        await successfulPayload.save();
                    } else {
                        console.log(`Payload not reflected: ${payload.payload}`);
                    }

                    updateProgress(payloadsExecuted, totalPayloads);
                } catch (err) {
                    console.error(`Failed to inject payload into ${inputName}:`, err);
                    continue;
                }
            }
        }

        for (let link of links) {
            for (let payload of limitedUrlPayloads) {
                try {
                    const testUrl = `${link}?test=${payload.payload}`;
                    await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

                    payloadsExecuted++; // Increment for each executed payload
                    console.log(`Executed URL payload: ${payload.payload} on URL: ${testUrl}`);

                    const bodyContent = await page.content();
                    if (bodyContent.includes(payload.payload)) {
                        successfulPayloadsArray.push(payload.id);
                        successfulPayloadsCount++; // Increment for each successful payload
                        console.log(`Payload reflected in URL: ${payload.payload}`);

                        const successfulPayload = new SuccessfulPayload({
                            payloadId: payload.id,
                            payload: payload.payload
                        });
                        await successfulPayload.save();
                    } else {
                        console.log(`Payload not reflected in URL: ${payload.payload}`);
                    }

                    updateProgress(payloadsExecuted, totalPayloads);
                } catch (err) {
                    console.error(`Failed to inject payload into URL: ${link}`, err);
                    continue;
                }
            }
        }

        let message = "Safe";
        if (successfulPayloadsArray.length > 5) {
            message = "High";
        } else if (successfulPayloadsArray.length > 0) {
            message = "Maybe";
        }

        const scanResult = new ScanResult({
            url,
            warnings,
            numberOfPayloadsExecuted: payloadsExecuted,
            payloadId: successfulPayloadsArray, 
            message,
            name: scanName || "Default Scan" 
        });

        await scanResult.save();
        console.log("Scan result saved to database.");

        await browser.close();

        res.json({
            url,
            warnings,
            numberOfPayloadsExecuted: payloadsExecuted,
            successfulPayloadsCount, // Send successful payloads count
            totalPayloads, // Send total payloads
            message,
            successfulPayloads: successfulPayloadsArray
        });
    } catch (error) {
        console.error("Error scanning:", error);
        res.status(500).json({ error: "Error during scan" });
    }
});


// Endpoint to get successful payloads
// Endpoint to get all payloads
app.get('/payloads', async (req, res) => {
    try {
        // Load payloads from JSON files
        const formPayloads = require('./form-payloads.json');
        const urlPayloads = require('./url-payloads.json');

        // Combine and format payloads
        const formattedPayloads = [
            ...formPayloads.map(p => ({ id: p.id, payload: p.payload })),
            ...urlPayloads.map(p => ({ id: p.id, payload: p.payload }))
        ];

        res.json(formattedPayloads); // Send formatted payloads as JSON
    } catch (error) {
        console.error("Error fetching payloads:", error);
        res.status(500).json({ error: "Failed to fetch payloads." });
    }
});

// Endpoint to get fast scan database
app.get('/fast-scan', async (req, res) => {
    try {
        const fastScanData = await SuccessfulPayload.find(); // Fetch fast scan results
        // Create a simple text response
        const formattedFastScanData = fastScanData.map(payload => `ID: ${payload.payloadId}, Payload: ${payload.payload}`).join('\n');
        res.type('text/plain'); // Set response type to plain text
        res.send(formattedFastScanData); // Send formatted fast scan data
    } catch (error) {
        console.error("Error fetching fast scan data:", error);
        res.status(500).json({ error: "Failed to fetch fast scan data." });
    }
});



// Clear fast scan database
app.delete('/fast-scan', async (req, res) => {
    try {
        await SuccessfulPayload.deleteMany(); // Clear fast scan database
        res.json({ message: "Fast scan database cleared." });
    } catch (error) {
        console.error("Error clearing fast scan database:", error);
        res.status(500).json({ error: "Failed to clear fast scan database." });
    }
});

// WebSocket for real-time progress updates
io.on('connection', (socket) => {
    console.log('A user connected');
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
