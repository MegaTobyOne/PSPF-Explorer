// Script to convert CSV requirements to JavaScript format for HTML file
const fs = require('fs');

// Read the CSV file
const csvContent = fs.readFileSync('/Users/toby/Library/Mobile Documents/com~apple~CloudDocs/Development/PSPF Explorer/PSPF Release 2025.csv', 'utf8');

// Parse CSV data
const lines = csvContent.trim().split('\n');
const requirements = {};

// Skip header row and process data
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse CSV line (handling commas within quotes)
    const matches = line.match(/(?:^|,)("(?:[^"]+)*"|[^,]*)/g);
    if (!matches || matches.length < 3) continue;
    
    const reqNumber = matches[0].replace(/^,?"?|"?$/g, '').trim();
    const requirement = matches[1].replace(/^,?"?|"?$/g, '').trim();
    const domain = matches[2].replace(/^,?"?|"?$/g, '').trim();
    
    if (!reqNumber || !requirement || !domain) continue;
    
    // Create domain mapping
    const domainMap = {
        'GOV': 'governance',
        'RISK': 'risk',
        'INFO': 'information', 
        'TECH': 'technology',
        'PER': 'personnel',
        'PHYS': 'physical'
    };
    
    const domainId = domainMap[domain] || domain.toLowerCase();
    
    // Create requirement ID
    const reqId = `${domain}-${reqNumber.toString().padStart(3, '0')}`;
    
    // Create truncated title (first 60 chars)
    let title = requirement;
    if (title.length > 60) {
        title = title.substring(0, 60) + '...';
    }
    
    requirements[reqId] = {
        id: reqId,
        domainId: domainId,
        title: title,
        description: requirement
    };
}

// Generate JavaScript object string
let jsContent = '            this.requirements = {\n';
const sortedKeys = Object.keys(requirements).sort();

for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    const req = requirements[key];
    
    // Escape single quotes in strings
    const title = req.title.replace(/'/g, "\\'");
    const description = req.description.replace(/'/g, "\\'");
    
    jsContent += `                '${key}': { id: '${key}', domainId: '${req.domainId}', title: '${title}', description: '${description}' }`;
    
    if (i < sortedKeys.length - 1) {
        jsContent += ',';
    }
    jsContent += '\n';
}

jsContent += '            };';

// Write to output file
fs.writeFileSync('/Users/toby/Library/Mobile Documents/com~apple~CloudDocs/Development/PSPF Explorer/requirements_output.js', jsContent);

console.log(`Generated ${Object.keys(requirements).length} requirements`);
console.log('Output written to requirements_output.js');

// Also generate domain requirement arrays
const domains = {};
Object.keys(requirements).forEach(reqId => {
    const domainId = requirements[reqId].domainId;
    if (!domains[domainId]) {
        domains[domainId] = [];
    }
    domains[domainId].push(reqId);
});

console.log('\nDomain counts:');
Object.keys(domains).forEach(domainId => {
    console.log(`${domainId}: ${domains[domainId].length} requirements`);
});

// Generate domain arrays for HTML
let domainArrays = '\nDomain requirement arrays:\n';
Object.keys(domains).forEach(domainId => {
    domainArrays += `${domainId}: [${domains[domainId].map(id => `'${id}'`).join(', ')}]\n\n`;
});

fs.writeFileSync('/Users/toby/Library/Mobile Documents/com~apple~CloudDocs/Development/PSPF Explorer/domain_arrays.txt', domainArrays);