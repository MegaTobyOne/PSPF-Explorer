#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current timestamp
const now = new Date();
const timestamp = now.toISOString()
    .replace(/[:.]/g, '')
    .replace('T', '_')
    .substring(0, 15);

const projectName = 'pspf-explorer';
const zipName = `${projectName}_${timestamp}.zip`;
const tempDir = 'temp_package';

console.log('📦 Packaging PSPF Explorer...');
console.log(`Creating: ${zipName}`);

try {
    // Create temporary directory
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir);

    console.log('📄 Finding most recent HTML file and copying essential files...');

    // Determine which HTML file to package
    const stageFiles = fs.readdirSync('.')
        .filter(file => file.startsWith('index-embedded-stage') && file.endsWith('.html'))
        .sort()
        .reverse(); // newest first

    let selectedHtmlFile = null;

    if (stageFiles.length > 0) {
        selectedHtmlFile = stageFiles[0];
    } else if (fs.existsSync('pspf-explorer.html')) {
        selectedHtmlFile = 'pspf-explorer.html';
    } else if (fs.existsSync('index.html')) {
        selectedHtmlFile = 'index.html';
    }

    if (!selectedHtmlFile) {
        throw new Error('No HTML entry point found (expected pspf-explorer.html or index.html).');
    }

    console.log(`📄 Using HTML file: ${selectedHtmlFile}`);

    // Copy essential files - only the latest HTML and styles folder
    const filesToCopy = [
    { src: selectedHtmlFile, dest: path.join(tempDir, 'index.html') }, // Rename to index.html for simplicity
        { src: 'styles', dest: path.join(tempDir, 'styles') }
    ];

    filesToCopy.forEach(({ src, dest }) => {
        if (fs.existsSync(src)) {
            if (fs.statSync(src).isDirectory()) {
                fs.cpSync(src, dest, { recursive: true });
                console.log(`📁 Copied directory: ${src} -> ${path.basename(dest)}`);
            } else {
                fs.copyFileSync(src, dest);
                console.log(`📄 Copied file: ${src} -> ${path.basename(dest)}`);
            }
        } else {
            console.log(`⚠️  File not found: ${src}`);
        }
    });

    console.log('🗜️  Creating zip archive...');

    // Create zip using system command
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isWindows) {
        execSync(`powershell -command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipName}' -Force"`);
    } else if (isMac) {
        execSync(`cd "${tempDir}" && zip -r "../${zipName}" ./*`);
    } else {
        // Linux
        execSync(`cd "${tempDir}" && zip -r "../${zipName}" ./*`);
    }

    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Get file size
    const stats = fs.statSync(zipName);
    const fileSize = (stats.size / 1024).toFixed(1) + ' KB';

    console.log('\n✅ Package created successfully!');
    console.log(`📁 File: ${zipName}`);
    console.log(`📊 Size: ${fileSize}`);
    console.log('\n📧 Ready to email! The zip contains:');
    console.log(`   • index.html (source: ${selectedHtmlFile})`);
    console.log('   • styles/main.css (styling)');
    console.log('\nTo run: Extract the zip and open index.html in a web browser');
    console.log('Note: All JavaScript is embedded in the HTML file for easy deployment.');

} catch (error) {
    console.error('❌ Error creating package:', error.message);
    
    // Clean up on error
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    process.exit(1);
}