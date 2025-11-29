const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = '/Users/toby/Library/Mobile Documents/com~apple~CloudDocs/Development/PSPF Explorer/PSPF Release 2025 .csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');
const requirements = [];

// Process each requirement row
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV row (handling quoted fields)
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current.trim()); // Add the last field
    
    if (fields.length >= 10) {
        const reqNum = parseInt(fields[0]);
        const requirement = fields[1].replace(/"/g, '');
        const domain = fields[2];
        const section = fields[3].replace(/"/g, '');
        const applicability = fields[4].replace(/"/g, '');
        const startDate = fields[5];
        const decision = fields[6];
        const questionType = fields[7];
        const mandatory = fields[8];
        const scored = fields[9];
        
        // Create domain prefix mapping
        const domainMap = {
            'GOV': 'governance',
            'RISK': 'risk', 
            'INFO': 'information',
            'TECH': 'technology',
            'PER': 'personnel',
            'PHYS': 'physical'
        };
        
        const domainId = domainMap[domain] || domain.toLowerCase();
        const reqId = `${domain}-${reqNum.toString().padStart(3, '0')}`;
        
        // Truncate title if too long and create description
        let title = requirement;
        let description = requirement;
        
        if (title.length > 80) {
            title = title.substring(0, 77) + '...';
        }
        
        // Add more context to description
        description += ` (${section})`;
        
        requirements.push({
            id: reqId,
            number: reqNum,
            domainId: domainId,
            title: title,
            description: description,
            domain: domain,
            section: section,
            applicability: applicability,
            startDate: startDate,
            decision: decision,
            questionType: questionType,
            mandatory: mandatory,
            scored: scored
        });
    }
}

// Sort requirements by number
requirements.sort((a, b) => a.number - b.number);

// Generate JavaScript object for HTML
let jsOutput = '            this.requirements = {\n';

requirements.forEach((req, index) => {
    const title = req.title.replace(/'/g, "\\'");
    const description = req.description.replace(/'/g, "\\'");
    
    jsOutput += `                '${req.id}': { id: '${req.id}', domainId: '${req.domainId}', title: '${title}', description: '${description}' }`;
    
    if (index < requirements.length - 1) {
        jsOutput += ',';
    }
    jsOutput += '\n';
});

jsOutput += '            };';

// Also generate the domain requirements arrays
const domainRequirements = {
    governance: [],
    risk: [],
    information: [],
    technology: [],
    personnel: [],
    physical: []
};

requirements.forEach(req => {
    if (domainRequirements[req.domainId]) {
        domainRequirements[req.domainId].push(req.id);
    }
});

console.log('Generated requirements object:');
console.log(jsOutput);
console.log('\n\nDomain arrays:');
console.log('governance:', domainRequirements.governance);
console.log('risk:', domainRequirements.risk);
console.log('information:', domainRequirements.information);
console.log('technology:', domainRequirements.technology);
console.log('personnel:', domainRequirements.personnel);
console.log('physical:', domainRequirements.physical);

console.log('\n\nTotal requirements by domain:');
Object.keys(domainRequirements).forEach(domain => {
    console.log(`${domain}: ${domainRequirements[domain].length}`);
});

console.log(`\nTotal requirements: ${requirements.length}`);

// Write to output file
fs.writeFileSync('./requirements-output.js', jsOutput);
console.log('\nRequirements object written to requirements-output.js');