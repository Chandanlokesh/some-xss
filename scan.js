const scanForm = document.getElementById('scanForm');
const urlInput = document.getElementById('targetUrl');
const progressBarContainer = document.getElementById('progressBarContainer');
const progressBar = document.getElementById('progressBar');
const resultsDiv = document.getElementById('results');

// Handle the form submission
scanForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const targetUrl = urlInput.value;
    if (!targetUrl) {
        alert('Please enter a URL to scan.');
        return;
    }

    // Reset previous results
    progressBar.style.width = '0%';
    progressBar.innerText = '0%';
    progressBarContainer.style.display = 'block'; // Show progress bar
    resultsDiv.querySelector('#warningsCount').innerText = '0';
    resultsDiv.querySelector('#payloadsExecuted').innerText = '0';
    resultsDiv.querySelector('#payloadId').innerText = '0';
    resultsDiv.querySelector('#message').innerText = 'Scanning...';

    try {
        // Start scanning
        const response = await fetch('/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ targetUrl }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const results = await response.json();
        console.log(results);
        displayResults(results);
    } catch (error) {
        console.error('Error during fetch:', error);
        resultsDiv.querySelector('#message').innerText = 'An error occurred while scanning.';
    }

    // Listen for progress updates
    const socket = io(); // Ensure socket.io is initialized after event listener
    socket.on('scanProgress', (data) => {
        progressBar.style.width = `${data.progress}%`;
        progressBar.innerText = `${data.progress}%`;
    });
});

// Function to display results
function displayResults(results) {
    const { warnings, payloadsExecuted, payloadId, message } = results;

    resultsDiv.querySelector('#warningsCount').innerText = warnings;
    resultsDiv.querySelector('#payloadsExecuted').innerText = payloadsExecuted;
    resultsDiv.querySelector('#payloadId').innerText = payloadId;
    resultsDiv.querySelector('#message').innerText = message;
}
