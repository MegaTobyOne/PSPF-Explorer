#!/bin/bash

# PSPF Explorer Packaging Script
# Creates a zip file with only the essential runtime files

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROJECT_NAME="pspf-explorer"
ZIP_NAME="${PROJECT_NAME}_${TIMESTAMP}.zip"

# Create temporary directory for packaging
TEMP_DIR="temp_package"
mkdir -p "$TEMP_DIR"

echo "📦 Packaging PSPF Explorer..."
echo "Creating: $ZIP_NAME"

# Copy essential files to temp directory
echo "📄 Copying essential files..."

# Check if pspf-explorer.html exists
if [ -f "pspf-explorer.html" ]; then
    # Copy the main HTML file and rename it to index.html for easy deployment
    cp "pspf-explorer.html" "$TEMP_DIR/index.html"
    echo "📄 Copied file: pspf-explorer.html -> index.html"
else
    echo "❌ Error: pspf-explorer.html not found!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Copy the styles directory if it exists
if [ -d "styles" ]; then
    cp -r styles/ "$TEMP_DIR/"
    echo "📁 Copied directory: styles"
else
    echo "⚠️  Warning: styles directory not found"
fi

# Create the zip file
echo "🗜️  Creating zip archive..."
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" .
cd ..

# Clean up temporary directory
rm -rf "$TEMP_DIR"

# Get file size for confirmation
FILE_SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')

echo "✅ Package created successfully!"
echo "📁 File: $ZIP_NAME"
echo "📊 Size: $FILE_SIZE"
echo ""
echo "📧 Ready to deploy! The zip contains:"
echo "   • index.html (main application)"
echo "   • styles/ (CSS styling)"
echo ""
echo "To run: Extract the zip and open index.html in a web browser"
echo "Note: All JavaScript and data is embedded in the HTML file for easy deployment."