# PaperTrail Application Folder Structure

This document outlines the current folder structure for the PaperTrail application, organized by functionality and user roles to improve code maintainability and developer experience.

## Current Structure

```
src/
├── auth/
│   ├── AuthContext.tsx
│   └── ProtectedRoute.tsx
├── components/
│   ├── common/
│   │   ├── Sidebar.tsx
│   │   └── NotificationSystem.tsx
│   ├── dashboard/
│   │   ├── AdminDashboard.tsx
│   │   ├── AdviserDashboard.tsx
│   │   ├── PanelDashboard.tsx
│   │   └── StudentDashboard.tsx
│   ├── groups/
│   │   ├── GroupProposals/
│   │   │   ├── AdviserGroupProposals.tsx
│   │   │   ├── DebugGroupProposals.tsx
│   │   │   ├── ManageGroupProposals.tsx
│   │   │   ├── ProposeGroup.tsx
│   │   │   └── TestDataDisplay.tsx
│   │   ├── ManageGroups.tsx
│   │   ├── MyGroups.tsx
│   │   └── PanelGroups.tsx
│   ├── thesis/
│   │   ├── AdviserReview.tsx
│   │   ├── AdviserThesisView.tsx
│   │   ├── CollaborativeEditor.tsx
│   │   ├── DefenseScheduler.tsx
│   │   ├── DocumentList.tsx
│   │   ├── PanelEvaluation.tsx
│   │   ├── ThesisPage.tsx
│   │   └── UploadThesisDoc.tsx
│   └── users/
│       ├── Login.tsx
│       ├── ManageUsers.tsx
│       ├── Profile.tsx
│       └── Reviews.tsx
├── documentation/
│   ├── COMPONENT_SHARING.md
│   ├── FOLDER_STRUCTURE.md
│   ├── README.md
│   ├── ROUTE_MAPPING.md
│   └── ROUTE_STRUCTURE.md
├── hooks/
│   └── (custom hooks will be placed here)
├── services/
│   └── api.ts
├── styles/
│   ├── academic-theme.css
│   └── ustp-theme.css
└── types/
    └── (TypeScript type definitions will be placed here)
```

## Directory Organization Explanation

### 1. **auth/** Directory
- **Purpose**: Contains all authentication-related files
- **Benefits**: Centralizes authentication logic and context
- **Files**: 
  - AuthContext.tsx - Authentication state management
  - ProtectedRoute.tsx - Route protection component

### 2. **components/common/** Directory
- **Purpose**: Houses shared UI components used across the application
- **Benefits**: Clear separation of common components from feature-specific ones
- **Files**: 
  - Sidebar.tsx - Main application navigation sidebar
  - NotificationSystem.tsx - Global notification system

### 3. **components/dashboard/** Directory
- **Purpose**: Contains all dashboard components for different user roles
- **Benefits**: Groups dashboard components together for easier maintenance
- **Files**: 
  - AdminDashboard.tsx - Admin main dashboard
  - AdviserDashboard.tsx - Adviser main dashboard
  - PanelDashboard.tsx - Panel member main dashboard
  - StudentDashboard.tsx - Student main dashboard

### 4. **components/groups/** Directory
- **Purpose**: Contains all group management functionality
- **Benefits**: Centralizes group-related components and sub-features
- **Subdirectories**: 
  - GroupProposals/ - Group proposal management components
- **Files**: 
  - ManageGroups.tsx - Admin group management
  - MyGroups.tsx - Student group view
  - PanelGroups.tsx - Panel member group view

### 5. **components/thesis/** Directory
- **Purpose**: Contains all thesis management functionality
- **Benefits**: Groups thesis-related components together
- **Files**: 
  - AdviserReview.tsx - Adviser document review
  - AdviserThesisView.tsx - Adviser thesis management view
  - CollaborativeEditor.tsx - Collaborative document editing
  - DefenseScheduler.tsx - Defense scheduling
  - DocumentList.tsx - Thesis document listing
  - PanelEvaluation.tsx - Panel member evaluation
  - ThesisPage.tsx - Main thesis page
  - UploadThesisDoc.tsx - Document upload functionality

### 6. **components/users/** Directory
- **Purpose**: Contains user-related components
- **Benefits**: Centralizes user management and profile components
- **Files**: 
  - Login.tsx - Authentication/login page
  - ManageUsers.tsx - Admin user management
  - Profile.tsx - User profile management
  - Reviews.tsx - Document reviews

### 7. **services/** Directory
- **Purpose**: Contains API service files
- **Benefits**: Separates data access logic from UI components
- **Files**: 
  - api.ts - API service functions

### 8. **hooks/** Directory
- **Purpose**: Will contain custom React hooks
- **Benefits**: Centralized location for reusable hooks
- **Note**: Currently empty but prepared for future expansion

### 9. **styles/** Directory
- **Purpose**: Contains global CSS styles and theme definitions
- **Files**: 
  - academic-theme.css - Academic theme styling
  - ustp-theme.css - USTP theme styling

### 10. **types/** Directory
- **Purpose**: Will contain TypeScript type definitions
- **Benefits**: Centralized type definitions for better type safety
- **Note**: Currently empty but prepared for future expansion

## Benefits of This Structure

1. **Feature-Based Organization**: Components are grouped by functionality rather than type
2. **Clear Separation of Concerns**: Each directory has a specific purpose
3. **Scalability**: Easy to add new features without cluttering existing directories
4. **Maintainability**: Related files are colocated, making them easier to find and update
5. **Role Clarity**: Dashboard components are clearly separated and labeled
6. **Consistency**: Follows common React project structure best practices

## Migration Status

✅ **Migration Complete**: The folder reorganization has been successfully implemented with all files moved to their appropriate locations.

## Implementation Notes

- All relative imports have been updated to reflect the new structure
- The App.tsx file has been updated with new import paths
- No functional changes were made, only organizational improvements
- The reorganization maintains all existing functionality
- Route mappings in App.tsx have been updated to use the new component locations