// CSV to Requirements Converter
// This script converts the PSPF2025.csv file to the requirements object format

const fs = require('fs');
const path = require('path');

// Domain mapping
const domainMapping = {
    'GOV': { id: 'governance', title: 'Governance' },
    'RISK': { id: 'risk', title: 'Risk Management' },
    'INFO': { id: 'information', title: 'Information Security' },
    'TECH': { id: 'technology', title: 'Technology Security' },
    'PER': { id: 'personnel', title: 'Personnel Security' },
    'PHYS': { id: 'physical', title: 'Physical Security' }
};

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function convertCSVToRequirements(csvFilePath) {
    try {
        const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        // Skip header line
        const dataLines = lines.slice(1);
        
        const requirements = {};
        const domainArrays = {
            governance: [],
            risk: [],
            information: [],
            technology: [],
            personnel: [],
            physical: []
        };
        
        dataLines.forEach(line => {
            const [reqNumber, requirement, domain, section] = parseCSVLine(line);
            
            if (!reqNumber || !requirement || !domain) return;
            
            // Determine domain prefix and create requirement ID
            const domainPrefix = domain.trim();
            const reqId = `${domainPrefix}-${reqNumber.padStart(3, '0')}`;
            
            // Get domain mapping
            const domainInfo = domainMapping[domainPrefix];
            if (!domainInfo) {
                console.warn(`Unknown domain: ${domainPrefix}`);
                return;
            }
            
            // Clean up description - remove quotes and escape single quotes
            const description = requirement.trim()
                .replace(/^"|"$/g, '') // Remove surrounding quotes
                .replace(/"/g, '\\"')  // Escape internal quotes
                .replace(/'/g, "\\'"); // Escape single quotes
            
            // Create requirement object
            requirements[reqId] = {
                id: reqId,
                domainId: domainInfo.id,
                title: `Requirement ${reqNumber}`, // You may want to extract titles from descriptions
                description: description
            };
            
            // Add to domain array
            domainArrays[domainInfo.id].push(reqId);
        });
        
        // Sort domain arrays
        Object.keys(domainArrays).forEach(domain => {
            domainArrays[domain].sort();
        });
        
        return { requirements, domainArrays };
        
    } catch (error) {
        console.error('Error processing CSV:', error);
        return null;
    }
}

function generateRequirementsJS(data) {
    const { requirements, domainArrays } = data;
    
    let output = '// Generated Requirements from CSV\n\n';
    
    // Generate domain arrays
    output += '// Domain Arrays:\n';
    Object.entries(domainArrays).forEach(([domain, reqs]) => {
        output += `${domain}: [${reqs.map(r => `'${r}'`).join(', ')}]\n`;
    });
    
    output += '\n// Requirements Object:\n{\n';
    
    Object.entries(requirements).forEach(([reqId, req], index, array) => {
        output += `    '${reqId}': {\n`;
        output += `        id: '${req.id}',\n`;
        output += `        domainId: '${req.domainId}',\n`;
        output += `        title: '${req.title}',\n`;
        output += `        description: '${req.description}'\n`;
        output += `    }${index < array.length - 1 ? ',' : ''}\n`;
    });
    
    output += '}\n';
    
    return output;
}

// Main execution
const csvPath = './PSPF2025.csv';
console.log('Converting CSV to Requirements...');

const data = convertCSVToRequirements(csvPath);
if (data) {
    const output = generateRequirementsJS(data);
    
    // Write to file
    fs.writeFileSync('./requirements-output.js', output);
    console.log('✅ Conversion complete! Check requirements-output.js');
    console.log(`📊 Stats: ${Object.keys(data.requirements).length} requirements across ${Object.keys(data.domainArrays).length} domains`);
    
    // Display domain counts
    Object.entries(data.domainArrays).forEach(([domain, reqs]) => {
        console.log(`   ${domain}: ${reqs.length} requirements`);
    });
} else {
    console.error('❌ Conversion failed');
}