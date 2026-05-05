const fs = require('fs');

// Read the CSV file
const csvContent = fs.readFileSync('PSPF Release 2025 .csv', 'utf8');

// Split into lines
const lines = csvContent.split('\n');

// Process each line to remove quotes and clean up
const cleanedLines = lines.map(line => {
    // Remove all quotes from the line
    let cleaned = line.replace(/"/g, '');
    
    // Also remove any other problematic characters that might cause issues
    cleaned = cleaned.replace(/'/g, ''); // Remove apostrophes
    cleaned = cleaned.replace(/`/g, ''); // Remove backticks
    
    return cleaned;
});

// Join back into CSV content
const cleanedCsv = cleanedLines.join('\n');

// Write to a new cleaned CSV file
fs.writeFileSync('PSPF Release 2025 - Cleaned.csv', cleanedCsv);

console.log('Created cleaned CSV file: PSPF Release 2025 - Cleaned.csv');
console.log('Removed quotes, apostrophes, and backticks from all fields');