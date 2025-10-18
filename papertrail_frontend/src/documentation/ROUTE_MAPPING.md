# PaperTrail Application Route Mapping

This document provides a comprehensive overview of all routes in the PaperTrail application, organized by user role. It includes the path, component, and access permissions for each route.

## Table of Contents
1. [Student Routes](#student-routes)
2. [Admin Routes](#admin-routes)
3. [Adviser Routes](#adviser-routes)
4. [Panel Routes](#panel-routes)
5. [Shared Routes](#shared-routes)
6. [Debug Routes](#debug-routes)

## Student Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard/student` | StudentDashboard | Main student dashboard |
| `/dashboard/student/profile` | ProfilePage | Student profile management |
| `/dashboard/student/notifications` | NotificationsPage | Student notifications |
| `/dashboard/student/defense` | DefenseSchedulePage | Defense schedule information |
| `/dashboard/student/groups` | MyGroupsPage | View and manage student groups with integrated proposal functionality |

## Admin Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard/admin` | AdminDashboard | Main admin dashboard |
| `/dashboard/admin/profile` | ProfilePage | Admin profile management |
| `/dashboard/admin/users` | ManageUsersPage | User management |
| `/dashboard/admin/groups` | ManageGroupsPage | Group management |
| `/dashboard/admin/group-proposals` | ManageGroupProposals | Manage group proposals |
| `/dashboard/admin/defense` | DefenseSchedulesPage | Defense scheduling |
| `/dashboard/admin/reports` | ReportsPage | System reports |
| `/dashboard/admin/logs` | SystemLogsPage | System logs |

## Adviser Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard/adviser` | AdviserDashboard | Main adviser dashboard |
| `/dashboard/adviser/profile` | ProfilePage | Adviser profile management |
| `/dashboard/adviser/groups` | MyGroupsPage | Manage assigned groups |
| `/dashboard/adviser/defense` | DefenseSchedulesPage | Defense scheduling |
| `/dashboard/adviser/notifications` | NotificationsPage | Adviser notifications |
| `/adviser/thesis` | AdviserThesisView | Thesis management view |

## Panel Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard/panel` | PanelDashboard | Main panel dashboard |
| `/dashboard/panel/profile` | ProfilePage | Panel member profile management |
| `/dashboard/panel/reviews` | ReviewsPage | Document reviews |
| `/dashboard/panel/groups` | PanelGroups | Assigned groups |
| `/dashboard/panel/documents` | DocumentReviewsPage | Document reviews |
| `/dashboard/panel/defense` | DefenseEvaluationsPage | Defense evaluations |
| `/dashboard/panel/schedules` | DefenseSchedulesPage | Defense schedules |
| `/dashboard/panel/notifications` | NotificationsPage | Panel notifications |

## Shared Routes

| Path | Component | Description | Accessible By |
|------|-----------|-------------|---------------|
| `/` | LoginPage | Application login | All unauthenticated users |
| `/login` | LoginPage | Application login | All unauthenticated users |
| `/thesis` | ThesisPage | Thesis document management | Student, Adviser |

## Debug Routes

| Path | Component | Description | Accessible By |
|------|-----------|-------------|---------------|
| `/debug/group-proposals` | DebugGroupProposals | Debug group proposals | Admin |
| `/debug/test-data` | TestDataDisplay | Display test data | Admin |

## Route Protection

All routes (except login) are protected using the `ProtectedRoute` component which ensures:
- Users can only access routes that match their role
- Unauthorized access attempts are redirected to the user's dashboard
- Session authentication is validated before rendering protected content

## Component Locations

| Component | File Path |
|-----------|-----------|
| AdminDashboard | `src/components/dashboard/AdminDashboard.tsx` |
| AdviserDashboard | `src/components/dashboard/AdviserDashboard.tsx` |
| PanelDashboard | `src/components/dashboard/PanelDashboard.tsx` |
| StudentDashboard | `src/components/dashboard/StudentDashboard.tsx` |
| LoginPage | `src/components/users/Login.tsx` |
| ProfilePage | `src/components/users/Profile.tsx` |
| ManageUsersPage | `src/components/users/ManageUsers.tsx` |
| MyGroupsPage | `src/components/groups/MyGroups.tsx` |
| ReviewsPage | `src/components/users/Reviews.tsx` |
| ManageGroupsPage | `src/components/groups/ManageGroups.tsx` |
| ManageGroupProposals | `src/components/groups/GroupProposals/ManageGroupProposals.tsx` |
| ThesisPage | `src/components/thesis/ThesisPage.tsx` |
| DefenseScheduler | `src/components/thesis/DefenseScheduler.tsx` |
| PanelGroups | `src/components/groups/PanelGroups.tsx` |
| AdviserThesisView | `src/components/thesis/AdviserThesisView.tsx` |
| NotificationsPage | `src/App.tsx` (placeholder) |
| DefenseSchedulePage | `src/App.tsx` (placeholder) |
| ReportsPage | `src/App.tsx` (placeholder) |
| SystemLogsPage | `src/App.tsx` (placeholder) |
| DefenseEvaluationsPage | `src/App.tsx` (placeholder) |
| DefenseSchedulesPage | `src/App.tsx` (placeholder) |
| DebugGroupProposals | `src/components/groups/GroupProposals/DebugGroupProposals.tsx` |
| TestDataDisplay | `src/components/groups/GroupProposals/TestDataDisplay.tsx` |

## Authentication Flow

1. Unauthenticated users are redirected to `/login`
2. After successful authentication, users are redirected to their role-specific dashboard:
   - Students: `/dashboard/student`
   - Admins: `/dashboard/admin`
   - Advisers: `/dashboard/adviser`
   - Panel Members: `/dashboard/panel`
3. All navigation is protected by role-based access controls