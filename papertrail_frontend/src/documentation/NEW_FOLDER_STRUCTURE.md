# PaperTrail Application New Folder Structure

This document shows the new folder structure for the PaperTrail application after reorganization.

## New Structure

```
src/
├── App.tsx
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
│   ├── NEW_FOLDER_STRUCTURE.md
│   ├── README.md
│   ├── ROUTE_MAPPING.md
│   └── ROUTE_STRUCTURE.md
├── hooks/
├── index.tsx
├── services/
│   └── api.ts
├── styles/
│   ├── academic-theme.css
│   └── ustp-theme.css
└── types/
```

## Benefits of the New Structure

1. **Feature-Based Organization**: Components are grouped by functionality rather than type
2. **Clear Separation of Concerns**: Each directory has a specific purpose
3. **Scalability**: Easy to add new features without cluttering existing directories
4. **Maintainability**: Related files are colocated, making them easier to find and update
5. **Role Clarity**: Dashboard components are clearly separated and labeled
6. **Consistency**: Follows common React project structure best practices

## Directory Purposes

### auth/
Contains all authentication-related files including context and route protection.

### components/common/
Houses shared UI components used across the application.

### components/dashboard/
Contains all dashboard components for each user role.

### components/groups/
Contains all group management functionality including proposal handling.

### components/thesis/
Contains all thesis management functionality.

### components/users/
Contains user-related components including login, profile, and user management.

### hooks/
Reserved for custom React hooks (currently empty).

### services/
Contains API service files for data access.

### styles/
Contains CSS theme files.

### types/
Reserved for TypeScript type definitions (currently empty).

## Migration Summary

All files have been successfully moved to their new locations following the proposed structure. The reorganization maintains all existing functionality while improving code organization and maintainability.