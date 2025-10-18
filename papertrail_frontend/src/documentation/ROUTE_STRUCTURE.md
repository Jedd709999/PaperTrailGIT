# PaperTrail Application Route Structure

This document provides a visual representation of the routing structure in the PaperTrail application.

```mermaid
graph TD
    A[App Root] --> B[Authentication Check]
    B --> C{Authenticated?}
    C -->|No| D[LoginPage /login]
    C -->|Yes| E{User Role}
    
    E -->|Student| F[/dashboard/student]
    F --> F1[StudentDashboard]
    F --> F2[/profile --> ProfilePage]
    F --> F3[/notifications --> NotificationsPage]
    F --> F4[/defense --> DefenseSchedulePage]
    F --> F5[/groups --> MyGroupsPage]
    
    E -->|Admin| G[/dashboard/admin]
    G --> G1[AdminDashboard]
    G --> G2[/profile --> ProfilePage]
    G --> G3[/users --> ManageUsersPage]
    G --> G4[/groups --> ManageGroupsPage]
    G --> G5[/group-proposals --> ManageGroupProposals]
    G --> G6[/defense --> DefenseSchedulesPage]
    G --> G7[/reports --> ReportsPage]
    G --> G8[/logs --> SystemLogsPage]
    
    E -->|Adviser| H[/dashboard/adviser]
    H --> H1[AdviserDashboard]
    H --> H2[/profile --> ProfilePage]
    H --> H3[/groups --> MyGroupsPage]
    H --> H4[/group-proposals --> AdviserGroupProposals]
    H --> H5[/topics --> TopicReviewsPage]
    H --> H6[/documents --> DocumentReviewsPage]
    H --> H7[/defense --> DefenseSchedulesPage]
    H --> H8[/notifications --> NotificationsPage]
    
    E -->|Panel| I[/dashboard/panel]
    I --> I1[PanelDashboard]
    I --> I2[/profile --> ProfilePage]
    I --> I3[/reviews --> ReviewsPage]
    I --> I4[/groups --> PanelGroups]
    I --> I5[/documents --> DocumentReviewsPage]
    I --> I6[/defense --> DefenseEvaluationsPage]
    I --> I7[/schedules --> DefenseSchedulesPage]
    I --> I8[/notifications --> NotificationsPage]
    
    A --> J[Shared Routes]
    J --> J1[/thesis --> ThesisPage]
    J --> J2[/adviser/thesis --> AdviserThesisView]
    
    A --> K[Debug Routes - Admin Only]
    K --> K1[/debug/group-proposals --> DebugGroupProposals]
    K --> K2[/debug/test-data --> TestDataDisplay]
    
    A --> L[Redirects]
    L --> L1[/* --> Role-specific dashboard]
    L --> L2[/dashboard --> Role-specific dashboard]
```

## Route Hierarchy Explanation

### Authentication Layer
- Unauthenticated users are directed to the login page
- Authenticated users are directed to their role-specific dashboard

### Role-Based Dashboard Structure
Each user role has a dedicated dashboard area with role-specific sub-routes:

1. **Student Dashboard** (`/dashboard/student`)
   - Main dashboard view
   - Profile management
   - Notifications
   - Defense scheduling
   - Group management with integrated proposal functionality

2. **Admin Dashboard** (`/dashboard/admin`)
   - System overview dashboard
   - User management
   - Group management
   - Group proposal management
   - Defense scheduling
   - Reporting and logs

3. **Adviser Dashboard** (`/dashboard/adviser`)
   - Adviser overview dashboard
   - Assigned group management
   - Group proposal review
   - Thesis topic review
   - Document review
   - Defense scheduling
   - Notifications

4. **Panel Dashboard** (`/dashboard/panel`)
   - Panel member overview
   - Document reviews
   - Assigned groups
   - Defense evaluations
   - Defense schedules
   - Notifications

### Shared Routes
These routes are accessible by multiple roles:
- `/thesis` - Thesis document management (Students and Advisers)
- `/adviser/thesis` - Adviser-specific thesis view

### Debug Routes
These routes are only accessible by Admin users for development and testing purposes.

## Navigation Patterns

### Consistent URL Structure
All routes follow a consistent pattern:
- Dashboard routes: `/dashboard/{role}/{feature}`
- Shared routes: `/{feature}`
- Debug routes: `/debug/{feature}`

### Protected Route Implementation
All routes (except login) use the `ProtectedRoute` component which:
1. Verifies user authentication
2. Checks role permissions
3. Redirects unauthorized access
4. Renders the appropriate component for authorized users

This structure ensures:
- Clear separation of concerns by role
- Consistent navigation patterns
- Easy maintenance and extension
- Proper access control
- Intuitive user experience