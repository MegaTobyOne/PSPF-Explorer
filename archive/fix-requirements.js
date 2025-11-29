const fs = require('fs');

// Read the requirements output and fix escaping issues
const content = fs.readFileSync('requirements-output.js', 'utf8');

// Function to properly escape strings for JavaScript
function escapeJSString(str) {
    return str
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/'/g, "\\'")    // Escape single quotes
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r')   // Escape carriage returns
        .replace(/\t/g, '\\t');  // Escape tabs
}

// Extract just the requirements object
const match = content.match(/this\.requirements = ({[\s\S]*?});/);
if (match) {
    const requirementsStr = match[1];
    
    // Parse the object to fix escaping
    try {
        const requirements = eval('(' + requirementsStr + ')');
        
        // Create properly escaped version
        const fixedRequirements = {};
        
        for (const [key, req] of Object.entries(requirements)) {
            fixedRequirements[key] = {
                id: req.id,
                domain: escapeJSString(req.domain),
                section: escapeJSString(req.section),
                applicability: escapeJSString(req.applicability),
                requirement: escapeJSString(req.requirement),
                implementation_date: escapeJSString(req.implementation_date || ''),
                current_status: req.current_status || '',
                compliance_score: req.compliance_score || 0,
                notes: escapeJSString(req.notes || '')
            };
        }
        
        // Write the fixed version
        const fixedContent = `this.requirements = ${JSON.stringify(fixedRequirements, null, 8)};`;
        fs.writeFileSync('requirements-fixed.js', fixedContent);
        
        console.log('Fixed requirements saved to requirements-fixed.js');
        console.log(`Total requirements: ${Object.keys(fixedRequirements).length}`);
        
    } catch (error) {
        console.error('Error parsing requirements:', error.message);
    }
} else {
    console.log('Could not find requirements object in file');
}