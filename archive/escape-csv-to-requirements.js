const fs = require('fs');
const path = require('path');

// Function to properly escape JavaScript strings
function escapeJavaScriptString(str) {
    if (!str) return '';
    
    return str
        .replace(/\\/g, '\\\\')    // Escape backslashes first
        .replace(/'/g, "\\'")      // Escape single quotes
        .replace(/"/g, '\\"')      // Escape double quotes
        .replace(/\n/g, '\\n')     // Escape newlines
        .replace(/\r/g, '\\r')     // Escape carriage returns
        .replace(/\t/g, '\\t')     // Escape tabs
        .replace(/\f/g, '\\f')     // Escape form feeds
        .replace(/\v/g, '\\v')     // Escape vertical tabs
        .replace(/\0/g, '\\0');    // Escape null characters
}

// Function to parse CSV with proper quote handling
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote inside quoted field
                current += '"';
                i += 2;
            } else {
                // Start or end of quoted field
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    // Add the last field
    result.push(current.trim());
    return result;
}

// Read and process the CSV file
const csvPath = path.join(__dirname, 'PSPF Release 2025.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Skip header and process data
const dataLines = lines.slice(1);
const requirements = {};

// Domain mapping
const domainMap = {
    'GOV': 'governance',
    'RISK': 'risk',
    'INFO': 'information',
    'TECH': 'technology',
    'PER': 'personnel',
    'PHYS': 'physical'
};

let processedCount = 0;
let skippedCount = 0;

console.log('Processing CSV with proper escaping...');

for (const line of dataLines) {
    try {
        const fields = parseCSVLine(line);
        
        if (fields.length < 8) {
            console.log(`Skipping line with insufficient fields: ${fields.length}`);
            skippedCount++;
            continue;
        }
        
        const [id, domain, section, requirement, applicability, startDate, endDate, scoring] = fields;
        
        if (!id || !domain || !requirement) {
            console.log(`Skipping line with missing essential data: ID=${id}, Domain=${domain}`);
            skippedCount++;
            continue;
        }
        
        const domainKey = domainMap[domain.trim()] || domain.toLowerCase().trim();
        
        if (!requirements[domainKey]) {
            requirements[domainKey] = {};
        }
        
        // Escape all string fields properly
        requirements[domainKey][id.trim()] = {
            id: escapeJavaScriptString(id.trim()),
            domain: escapeJavaScriptString(domain.trim()),
            section: escapeJavaScriptString(section.trim()),
            requirement: escapeJavaScriptString(requirement.trim()),
            applicability: escapeJavaScriptString(applicability.trim()),
            startDate: escapeJavaScriptString(startDate.trim()),
            endDate: escapeJavaScriptString(endDate.trim()),
            scoring: escapeJavaScriptString(scoring.trim())
        };
        
        processedCount++;
        
    } catch (error) {
        console.log(`Error processing line: ${error.message}`);
        skippedCount++;
    }
}

console.log(`Processed: ${processedCount} requirements`);
console.log(`Skipped: ${skippedCount} lines`);

// Generate the JavaScript object with proper formatting
let output = 'this.requirements = {\n';

for (const [domainKey, domainReqs] of Object.entries(requirements)) {
    output += `    ${domainKey}: {\n`;
    
    const reqEntries = Object.entries(domainReqs);
    for (let i = 0; i < reqEntries.length; i++) {
        const [reqId, req] = reqEntries[i];
        const comma = i < reqEntries.length - 1 ? ',' : '';
        
        output += `        '${req.id}': {\n`;
        output += `            id: '${req.id}',\n`;
        output += `            domain: '${req.domain}',\n`;
        output += `            section: '${req.section}',\n`;
        output += `            requirement: '${req.requirement}',\n`;
        output += `            applicability: '${req.applicability}',\n`;
        output += `            startDate: '${req.startDate}',\n`;
        output += `            endDate: '${req.endDate}',\n`;
        output += `            scoring: '${req.scoring}'\n`;
        output += `        }${comma}\n`;
    }
    
    const isLastDomain = Object.keys(requirements).indexOf(domainKey) === Object.keys(requirements).length - 1;
    output += `    }${isLastDomain ? '' : ','}\n`;
}

output += '};\n';

// Write the escaped output
const outputPath = path.join(__dirname, 'requirements-escaped.js');
fs.writeFileSync(outputPath, output);

console.log(`\nEscaped requirements written to: ${outputPath}`);
console.log(`Total domains: ${Object.keys(requirements).length}`);

// Print domain summary
for (const [domain, reqs] of Object.entries(requirements)) {
    console.log(`${domain}: ${Object.keys(reqs).length} requirements`);
}