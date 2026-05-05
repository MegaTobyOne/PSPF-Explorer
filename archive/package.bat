@echo off
REM PSPF Explorer Packaging Script for Windows
REM Creates a zip file with only the essential runtime files

REM Get current timestamp  
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

set "PROJECT_NAME=pspf-explorer"
set "ZIP_NAME=%PROJECT_NAME%_%TIMESTAMP%.zip"

REM Create temporary directory for packaging
set "TEMP_DIR=temp_package"
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

echo.
echo 📦 Packaging PSPF Explorer...
echo Creating: %ZIP_NAME%

REM Copy essential files to temp directory
echo 📄 Finding most recent HTML file and copying essential files...

REM Find the most recent embedded HTML file (simplified approach for batch)
set "LATEST_HTML=index-embedded-stage4.html"
if exist "index-embedded-stage4.html" (
    set "LATEST_HTML=index-embedded-stage4.html"
) else if exist "index-embedded-stage3.html" (
    set "LATEST_HTML=index-embedded-stage3.html"
) else if exist "index-embedded-stage2.html" (
    set "LATEST_HTML=index-embedded-stage2.html"
) else (
    set "LATEST_HTML=index.html"
)

echo 📄 Using latest HTML file: %LATEST_HTML%

REM Copy the latest HTML file and rename it to index.html
copy "%LATEST_HTML%" "%TEMP_DIR%\index.html"
echo 📄 Copied file: %LATEST_HTML% -^> index.html

REM Copy only the CSS directory (no scripts since everything is embedded)
xcopy "styles" "%TEMP_DIR%\styles\" /E /I /Y
echo 📁 Copied directory: styles

REM Create the zip file using PowerShell
echo 🗜️  Creating zip archive...
powershell -command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%ZIP_NAME%' -Force"

REM Clean up temporary directory
rmdir /s /q "%TEMP_DIR%"

echo.
echo ✅ Package created successfully!
echo 📁 File: %ZIP_NAME%
echo.
echo 📧 Ready to email! The zip contains:
echo    • index.html (latest: %LATEST_HTML%)
echo    • styles/main.css (styling)
echo.
echo To run: Extract the zip and open index.html in a web browser
echo Note: All JavaScript is embedded in the HTML file for easy deployment.
echo.
pause