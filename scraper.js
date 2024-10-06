const puppeteer = require('puppeteer');
const fs = require('fs');

// Load payloads from JSON files
const urlPayloads = JSON.parse(fs.readFileSync('url-payloads.json', 'utf8'));
const formPayloads = JSON.parse(fs.readFileSync('form-payloads.json', 'utf8'));

// Function to scrape the page and inject payloads
async function scrapeAndInject(targetUrl) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Navigate to the target URL
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Step 1: Find all input fields on the page
        const inputFields = await page.$$eval('input, textarea', inputs => inputs.map(input => ({
            type: input.type || 'text',
            name: input.name || '',
            id: input.id || '',
            placeholder: input.placeholder || ''
        })));

        console.log('Input fields found:', inputFields);

        // Step 2: Inject URL payloads
        let payloadsExecuted = 0;
        const executedPayloads = [];

        for (const payload of urlPayloads) {
            const injectedUrl = `${targetUrl}${encodeURIComponent(payload.payload)}`;
            console.log(`Injecting URL payload: ${injectedUrl}`);
            
            const result = await validatePayloadExecution(injectedUrl, page);
            if (result.executed) {
                payloadsExecuted++;
                executedPayloads.push({ payload: payload.payload, success: true });
            } else {
                executedPayloads.push({ payload: payload.payload, success: false });
            }
        }

        // Step 3: Inject form payloads into the input fields
        for (const payload of formPayloads) {
            for (const input of inputFields) {
                try {
                    await page.type(`input[name="${input.name}"]`, payload.payload);
                    await page.click('input[type="submit"]'); // Change selector to match submit button
                    await page.waitForNavigation({ waitUntil: 'networkidle2' });

                    const pageContent = await page.content();
                    const executed = pageContent.includes('<script>alert'); // Modify based on expected output
                    if (executed) {
                        payloadsExecuted++;
                        executedPayloads.push({ payload: payload.payload, success: true });
                    } else {
                        executedPayloads.push({ payload: payload.payload, success: false });
                    }
                } catch (error) {
                    console.error(`Error injecting form payload ${payload.payload}:`, error);
                }
            }
        }

        // Step 4: Return the final scan results
        await browser.close();
        return {
            targetUrl,
            warnings: inputFields.length,
            payloadsExecuted,
            executedPayloads
        };
    } catch (error) {
        console.error('Error during scraping:', error);
        await browser.close();
        return { error: 'Scraping failed' };
    }
}

// Validate if a URL-based payload executed successfully
async function validatePayloadExecution(injectedUrl, page) {
    try {
        await page.goto(injectedUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        const pageContent = await page.content();

        // Modify this based on what indicates success for your context
        const executed = pageContent.includes('alert(1)') || pageContent.includes('XSS');
        return { executed };
    } catch (error) {
        console.error(`Error validating payload ${injectedUrl}:`, error);
        return { executed: false };
    }
}


module.exports = scrapeAndInject;
