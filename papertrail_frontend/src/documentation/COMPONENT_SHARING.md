# PaperTrail Component Sharing Matrix

This document shows which components are shared across different user roles in the PaperTrail application.

## Shared Components Matrix

| Component | Student | Admin | Adviser | Panel | Notes |
|-----------|:-------:|:-----:|:-------:|:-----:|-------|
| **Dashboard Components** |
| StudentDashboard | ✅ | | | | Student-specific dashboard |
| AdminDashboard | | ✅ | | | Admin-specific dashboard |
| AdviserDashboard | | | ✅ | | Adviser-specific dashboard |
| PanelDashboard | | | | ✅ | Panel-specific dashboard |
| **Profile Management** |
| ProfilePage | ✅ | ✅ | ✅ | ✅ | Role-specific profile management |
| **Group Management** |
| MyGroupsPage | ✅ | | ✅ | | Student and Adviser group views with integrated proposal functionality |
| ManageGroupsPage | | ✅ | | | Admin group management |
| PanelGroups | | | | ✅ | Panel member group assignments |
| **Group Proposals** |
| ManageGroupProposals | | ✅ | | | Admin proposal management |
| AdviserGroupProposals | | | ✅ | | Adviser proposal review |
| **Thesis Management** |
| ThesisPage | ✅ | | ✅ | | Thesis document management |
| AdviserThesisView | | | ✅ | | Adviser thesis review |
| **Review Systems** |
| ReviewsPage | | | | ✅ | Panel document reviews |
| TopicReviewsPage | | | ✅ | | Adviser topic reviews |
| DocumentReviewsPage | | | ✅ | ✅ | Document review (Adviser & Panel) |
| **Defense Management** |
| DefenseScheduler | | ✅ | ✅ | ✅ | Defense scheduling component |
| DefenseSchedulesPage | | ✅ | ✅ | ✅ | Defense schedule views |
| DefenseEvaluationsPage | | | | ✅ | Panel defense evaluations |
| DefenseSchedulePage | ✅ | | | | Student defense schedule |
| **Notification Systems** |
| NotificationsPage | ✅ | | ✅ | ✅ | Role-specific notifications |
| **Administration** |
| ManageUsersPage | | ✅ | | | User management |
| ReportsPage | | ✅ | | | System reports |
| SystemLogsPage | | ✅ | | | System logs |
| **Debug Tools** |
| DebugGroupProposals | | ✅ | | | Debug group proposals |
| TestDataDisplay | | ✅ | | | Display test data |

## Component Reusability Patterns

### Highly Reused Components
1. **ProfilePage** - Used by all four roles with role-specific logic
2. **DefenseScheduler** - Shared defense scheduling component
3. **NotificationsPage** - Used by Student, Adviser, and Panel roles

### Role-Specific Components
1. **Dashboard components** - Each role has a unique dashboard
2. **Group management** - Different views for different roles
3. **Review systems** - Specialized for each role's responsibilities

### Cross-Role Components
1. **ThesisPage** - Shared between Student and Adviser
2. **DocumentReviewsPage** - Shared between Adviser and Panel
3. **DefenseSchedulesPage** - Shared across Admin, Adviser, and Panel

## Implementation Notes

### Shared Component Benefits
- **Consistency**: Users experience consistent interfaces across different sections
- **Maintainability**: Changes to shared components affect all users of that component
- **Efficiency**: Reduced code duplication and development time
- **UX Unity**: Common interaction patterns across the application

### Role-Specific Component Benefits
- **Customization**: Tailored experiences for specific user needs
- **Security**: Role-appropriate access and functionality
- **Performance**: Only load necessary components for each role
- **Clarity**: Clear separation of responsibilities

### Component Architecture
The application follows a modular architecture where:
1. **Base components** provide common functionality
2. **Role-specific wrappers** add role-appropriate features
3. **Shared utilities** handle common operations
4. **Protected routes** ensure appropriate access control

This approach allows for:
- Easy addition of new roles
- Consistent user experience
- Efficient code maintenance
- Clear separation of concerns