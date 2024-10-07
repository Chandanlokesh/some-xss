// Add an event listener to the scan button
document.getElementById("scanButton").addEventListener("click", () => {
    const url = document.getElementById("urlInput").value;
    const scanName = document.getElementById("scanNameInput").value; // Get the scan name from an input field

    // Validate the URL input
    if (!url) {
        alert("Please enter a valid URL.");
        return;
    }

    // Disable the scan button while scanning to prevent multiple requests
    document.getElementById("scanButton").disabled = true;

    // Clear previous results
    document.getElementById("resultUrl").textContent = '';
    document.getElementById("warnings").textContent = '';
    document.getElementById("executedPayloads").textContent = '';
    document.getElementById("vulnerabilityMessage").textContent = '';

    // Make a POST request to the backend to initiate the scan
    fetch('/scan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url, scanName: scanName }) // Include scan name in the request
    })
    .then(response => response.json())
    .then(data => {
        // Display scan results
        document.getElementById("resultUrl").textContent = `Scanned URL: ${data.url}`;
        document.getElementById("warnings").textContent = `Warnings (input fields): ${data.warnings}`;
        document.getElementById("executedPayloads").textContent = `Payloads Executed: ${data.numberOfPayloadsExecuted}`;
        document.getElementById("vulnerabilityMessage").textContent = `Vulnerability Level: ${data.message}`;

        // Prepare scan result for saving
        const scanResult = {
            url: data.url,
            warnings: data.warnings,
            numberOfPayloadsExecuted: data.numberOfPayloadsExecuted,
            payloadId: data.successfulPayloads, // Save all successful payload IDs
            message: data.message,
            name: scanName || "User Scan" // Use scanName from input or default value
        };

        // Create a Save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Scan';
        saveButton.id = 'saveScanButton';
        document.body.appendChild(saveButton);

        // Add event listener for Save button
        saveButton.addEventListener('click', () => {
            fetch('/save-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scanResult)
            })
            .then(response => {
                if (response.ok) {
                    alert("Scan results saved successfully.");
                    // Optionally remove the save button after saving
                    document.body.removeChild(saveButton);
                } else {
                    alert("Failed to save scan results.");
                }
            })
            .catch(error => {
                console.error("Error saving scan results:", error);
                alert("An error occurred while saving the scan results.");
            });
        });

        // Re-enable the scan button after the scan is complete
        document.getElementById("scanButton").disabled = false;
    })
    .catch(error => {
        console.error("Error during scan:", error);
        alert("An error occurred during the scan. Please try again.");
        document.getElementById("scanButton").disabled = false;
    });
});
