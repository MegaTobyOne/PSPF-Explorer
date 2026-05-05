const fs = require('fs');
const csvContent = fs.readFileSync('PSPF Release 2025.csv', 'utf-8');
const lines = csvContent.split('\n');

let output = '            this.requirements = {\n';
let count = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            columns.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    columns.push(current.trim());
    
    if (columns.length >= 6) {
        const id = columns[0];
        const domain = columns[1];
        const requirement = columns[5];
        
        if (id && domain && requirement) {
            const domainMap = {
                'GOV': 'governance',
                'RISK': 'risk', 
                'INFO': 'information',
                'TECH': 'technology',
                'PER': 'personnel',
                'PHYS': 'physical'
            };
            
            const domainId = domainMap[domain] || domain.toLowerCase();
            
            // Clean the text by removing problematic characters
            const cleanTitle = requirement.substring(0, 80).replace(/'/g, '').replace(/"/g, '').replace(/\n/g, ' ').replace(/\r/g, ' ') + '...';
            const cleanDesc = requirement.replace(/'/g, '').replace(/"/g, '').replace(/\n/g, ' ').replace(/\r/g, ' ');
            
            const reqId = domain + '-' + id.toString().padStart(3, '0');
            
            output += "                '" + reqId + "': { id: '" + reqId + "', domainId: '" + domainId + "', title: '" + cleanTitle + "', description: '" + cleanDesc + "' },\n";
            count++;
        }
    }
}

output = output.slice(0, -2) + '\n            };\n'; // Remove last comma
fs.writeFileSync('clean-requirements.js', output);
console.log('Clean requirements created with ' + count + ' entries');