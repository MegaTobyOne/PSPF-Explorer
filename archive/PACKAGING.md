# PSPF Explorer Packaging Scripts

This folder contains scripts to package the PSPF Explorer into a portable zip file for deployment or sharing.

## Available Scripts

### 1. `package.sh` (macOS/Linux)
Bash script for Unix-based systems:
```bash
./package.sh
```

### 2. `package.bat` (Windows)
Batch script for Windows systems:
```cmd
package.bat
```

### 3. `package.js` (Cross-platform)
Node.js script that works on all platforms:
```bash
node package.js
```

## What Gets Packaged

The scripts create a zip file containing only the essential runtime files:

- `index.html` - Main application file
- `scripts/main.js` - Application logic and functionality  
- `styles/main.css` - All styling and themes

## What's Excluded

These files are NOT included in the package (not needed to run):
- Documentation files (*.md)
- PDF files
- Packaging scripts themselves
- Any development/build files

## Output

Creates a timestamped zip file: `pspf-explorer_YYYYMMDD_HHMMSS.zip`

Example: `pspf-explorer_20250923_071459.zip`

## Deployment

1. Run any of the packaging scripts
2. Email the generated zip file to yourself
3. Extract the zip on the target network
4. Open `index.html` in any modern web browser
5. The application will work completely offline with local storage

## File Size

The packaged zip is typically around 20KB - small enough for easy email transfer.