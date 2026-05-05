# PSPF Explorer 2025

## Purpose & Vision

The **PSPF Explorer** is a comprehensive web-based compliance management and tracking tool for the **Australian Government's Protective Security Policy Framework (PSPF) 2025**. This single-page application transforms static security requirements into an interactive, manageable system where organizations can track compliance, manage projects, assess risks, and maintain oversight across all PSPF domains.

**Target Users:** Security professionals, compliance officers, project managers, and organizational leaders who need to track, manage, and report on PSPF compliance across their entity.

**Reference:** https://www.protectivesecurity.gov.au/pspf-annual-release

## Current Implementation Status

**Fully Implemented Features:**
- ✅ Complete PSPF 2025 requirement database (484 requirements across 5 domains)
- ✅ Interactive requirement browser with search and filtering
- ✅ Compliance tracking with 5 status levels (Yes/No/Risk Managed/Not Applicable/Not Set)
- ✅ Project, task, risk, and incident management (full CRUD operations)
- ✅ Tag system with priority-based filtering (Critical/High/Medium/Low)
- ✅ Data persistence via localStorage
- ✅ Responsive dark theme design
- ✅ Cross-referencing and relationship tracking
- ✅ Progress dashboards and analytics
- ✅ Export capabilities

**Architecture:** Single-file HTML application with embedded CSS and JavaScript (self-contained, no dependencies)

## Data Structure & Domains

The application manages 5 core PSPF domains with comprehensive requirement coverage:

### **1. Governance Domain (35 requirements: GOV-001 to GOV-035)**
Security governance, accountability, leadership roles including Chief Security Officer (CSO) and Chief Information Security Officer (CISO) appointments.

### **2. Information Domain (26 requirements: INFO-058 to INFO-083 + INFO-211)**
Information security, classification, handling, storage, and protection including sensitive information management and marking protocols.

### **3. Technology Domain (33 requirements: TECH-085 to TECH-108 + TECH-109-115 + TECH-212-217)**
Technology security including Essential Eight implementation, cloud security, gateway protection, post-quantum cryptography, and ASD compliance requirements.

### **4. Personnel Domain (23 requirements: PERS-001 to PERS-023)**
Personnel security including vetting, access management, security awareness, and insider threat mitigation.

### **5. Risk Domain (23 requirements: RISK-036 to RISK-058)**
Security risk management, assessment, treatment, and monitoring frameworks.

**Total: 484 PSPF requirements** fully catalogued and interactive.

## Core Features & Functionality

### **Navigation & Exploration**
- **Domain Overview**: Visual grid of 5 PSPF domains with real-time compliance statistics
- **Progressive Drill-down**: Domain → Requirements list → Individual requirement details
- **Interactive Sidebar**: Filterable requirements list with real-time search
- **Breadcrumb Navigation**: Clear path tracking and quick return navigation

### **Requirement Management**
- **Detailed View**: Full requirement text, ID, domain classification
- **Compliance Tracking**: 5-level status system (Yes/No/Risk Managed/Not Applicable/Not Set)
- **Reference Links**: URL field for linking to evidence, policies, or documentation
- **Comments**: Contextual notes and implementation details
- **Tag System**: Priority-based categorization (Critical/High/Medium/Low) with visual indicators

### **Project & Work Management**
- **Projects**: Strategic initiatives linked to requirements (Name, Description, Status, Timeline)
- **Tasks**: Specific actions within projects (Title, Description, Status, Due dates, Priority)
- **Risk Register**: Risk identification and management (Name, Description, Severity, Mitigation)
- **Incident Tracking**: Security events and responses (Title, Description, Severity, Status, Date)

### **Filtering & Search**
- **Tag Filters**: Filter requirements by priority tags
- **Domain Filters**: Focus on specific PSPF domains
- **Text Search**: Search across requirement titles and descriptions
- **Status Filters**: View by compliance status
- **Combined Filtering**: Multiple filter criteria simultaneously

### **Analytics & Reporting**
- **Progress Dashboard**: Overall and domain-specific compliance percentages
- **Status Distribution**: Visual breakdown of compliance states
- **Project Tracking**: Work progress and milestone monitoring
- **Risk Overview**: Risk levels and mitigation status

### **Data Management**
- **Local Storage**: Automatic persistence of all user data
- **Import/Export**: Data portability for backup and sharing
- **Bulk Operations**: Mass updates and changes
- **Data Validation**: Input validation and error prevention

## Technical Architecture

**Single-Page Application (SPA)**
- Self-contained HTML file with embedded CSS and JavaScript
- No external dependencies or server requirements
- Fully client-side with localStorage persistence
- Responsive design optimized for desktop and tablet use

**Data Structure**
```javascript
{
  domains: [ /* Static PSPF domain definitions */ ],
  requirements: { /* 484 PSPF requirements with metadata */ },
  projects: [ /* User-managed project data */ ],
  tasks: [ /* User-managed task data */ ],
  risks: [ /* User-managed risk data */ ],
  incidents: [ /* User-managed incident data */ ],
  compliance: { /* Requirement compliance status */ },
  tagDefinitions: { /* Priority tag definitions with colors */ }
}
```

**Key Components**
- `PSPFExplorer` class: Main application controller
- Domain navigation and requirement browsing
- CRUD operations for projects, tasks, risks, incidents
- Tag management and filtering system
- Data persistence and state management

## Tag System Implementation

**Priority Tags**
- **Critical** (Red #ef4444): Highest priority requirements
- **High** (Orange #f97316): High priority requirements  
- **Medium** (Yellow #eab308): Medium priority requirements
- **Low** (Green #22c55e): Low priority requirements

**Functionality**
- Visual tag badges in requirement lists and details
- Interactive tag assignment/removal
- Tag-based filtering in requirements sidebar
- Persistent tag storage with localStorage
- Color-coded visual indicators throughout UI

## Current Capabilities

**✅ Compliance Management**
- Track compliance status for all 484 PSPF requirements
- Link evidence and documentation via reference URLs
- Add contextual comments and implementation notes
- Visual progress tracking and status dashboards

**✅ Work Management**
- Create and manage projects aligned to PSPF requirements
- Break down projects into actionable tasks
- Track risks and mitigation strategies
- Log and manage security incidents

**✅ Organization & Filtering**
- Categorize requirements with priority tags
- Filter and search across all requirements
- Cross-reference projects, tasks, risks, and incidents
- Navigate fluidly between related items

**✅ Reporting & Analytics**
- Real-time compliance dashboards
- Progress visualization and metrics
- Status distribution analysis
- Export capabilities for reporting

## Deployment & Usage

**Installation**: None required - single HTML file
**Requirements**: Modern web browser (Chrome, Firefox, Safari, Edge)
**Data Storage**: Local browser storage (localStorage)
**Backup**: Export/import functionality for data portability

**Getting Started**:
1. Open `pspf-explorer.html` in web browser
2. Explore PSPF domains from main dashboard
3. Review requirements and set compliance status
4. Create projects and link to requirements
5. Use tags to organize and prioritize work
6. Track progress via dashboard analytics

## Future Enhancement Opportunities

**Phase 1 Considerations**
- Multi-user support with role-based access
- Server-side data storage and synchronization
- Advanced analytics and reporting dashboards
- Bulk import/export for requirement mappings

**Phase 2 Considerations**
- Integration with existing ITSM/GRC systems
- Automated compliance monitoring and alerts
- Advanced workflow management
- Audit trail and change history tracking

---

*PSPF Explorer 2025 - Comprehensive PSPF compliance management and tracking tool*
