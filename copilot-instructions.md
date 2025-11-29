# Copilot Instructions: PSPF Explorer Web App

## Project Context
This is the PSPF Explorer - a simple, local web application that transforms the Protective Security Policy Framework (PSPF) into an interactive, engaging experience. The app runs entirely in the browser with no server or external dependencies, using only vanilla HTML, CSS, and JavaScript.

**Target Users:** Everyone in the organization - from executives to frontline staff. This tool is designed for universal access with no personas or role-specific features. Every user gets the same experience, with plain-language explanations that make complex security requirements accessible to all.

**Project Scope:** This is a v1 experimental tool - build and ship something that works as a complete solution, no phases or MVP approach needed.

## Key Features to Implement
- **Domain Overview**: Visual dashboard showing all PSPF domains with animated pulse effects based on compliance status
- **Progressive Drill-down**: Navigation from domain → requirements → projects → tasks → risks
- **Compliance Tracking**: Binary yes/no status for each requirement (starts as "No", must be manually marked complete)
- **Visual Feedback**: Pulse animations, progress bars, and highlights that respond to compliance data
- **Universal Design**: Plain-language explanations accessible to all organizational levels
- **Gamification Elements**: Badges, progress tracking, and achievement recognition
- **Local Storage**: All compliance data and comments stored locally in browser
- **CRUD Operations**: Full create, read, update, delete functionality for projects, tasks, risks, and incidents

## Data Model Requirements

**Static Data (Pre-loaded, Read-Only):**
- PSPF Domains and their Requirements are fixed and cannot be modified by users
- These form the foundation structure and should be built into the application

**Dynamic Data (User Manageable with CRUD):**
- **Projects**: Work initiatives linked to requirements (title, description, status, dates)
- **Tasks**: Specific actions within projects (title, description, status, assignee, due date)
- **Risks**: Potential issues (title, description, likelihood, impact, mitigation)
- **Incidents**: Actual events (title, description, date, severity, resolution)

**Data Persistence:**
- All user-created data stored in localStorage with proper JSON serialization
- Implement data validation and error handling for all CRUD operations
- Maintain referential integrity between related items
- Provide data export/import functionality for backup

**Navigation Requirements:**
- Bidirectional navigation: top-down (domain→requirement→project→task) and bottom-up (task→project→requirement→domain)
- Cross-referencing: show related items at each level
- Breadcrumb navigation to maintain context
- Search functionality across all user-created content

## Technical Constraints
- **No server required**: All files run directly from the file system
- **No dependencies**: No npm, no build tools, no external libraries
- **Vanilla technologies only**: Pure HTML5, CSS3, and ES6+ JavaScript
- **Local storage**: Use localStorage or sessionStorage for data persistence
- **File structure**: Keep it simple with minimal folders

## Code Style Guidelines
- Use modern JavaScript (ES6+) features like arrow functions, const/let, template literals
- Write semantic HTML with proper accessibility attributes
- Use CSS Grid/Flexbox for layouts
- Keep JavaScript modular with clear function separation
- Add comments for complex logic
- Use meaningful variable and function names

## File Organization
```
/
├── index.html          # Main entry point
├── styles/
│   └── main.css       # All styles
├── scripts/
│   └── main.js        # Main JavaScript logic
└── assets/            # Images, icons, etc.
```

## Development Approach
1. Start with a basic HTML structure
2. Add CSS for styling and layout
3. Implement JavaScript functionality incrementally
4. Test frequently by opening index.html in a browser
5. Use browser developer tools for debugging
6. use Python's SimpleHTTPServer for better testing when required

## Common Patterns
- Use `document.querySelector()` for DOM manipulation
- Implement event listeners for user interactions
- Store data in localStorage: `localStorage.setItem('key', JSON.stringify(data))`
- Retrieve data: `JSON.parse(localStorage.getItem('key'))`
- Use CSS custom properties (variables) for consistent theming
- Implement responsive design with media queries

## Testing
- Open `index.html` directly in a web browser
- Test in multiple browsers (Chrome, Firefox, Safari)
- Use browser dev tools console for JavaScript debugging
- Validate HTML and CSS using browser dev tools

## When suggesting code:
- Always provide complete, working examples
- Include proper HTML structure with DOCTYPE
- Add basic CSS reset/normalization if needed
- Ensure JavaScript is compatible with modern browsers
- Consider mobile responsiveness
- Include error handling for localStorage operations