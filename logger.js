const fs = require('fs');
const path = require('path');

// Define the log file path
const logFilePath = path.join(__dirname, 'logs.txt');

// Function to log messages
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage)

    // Append the log message to the file
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}

// Export the logToFile function
module.exports = {log}