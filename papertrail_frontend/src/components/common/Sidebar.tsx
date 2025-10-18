import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/academic-theme.css";

interface SidebarProps {
  role: string;
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
}

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  // ... other user properties
}

export default function Sidebar({ role, isOpen, toggleSidebar }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: "Thesis Submission Approved",
      message: "Your thesis proposal has been approved by your adviser.",
      time: "2 hours ago",
      read: false,
      type: "success"
    },
    {
      id: 2,
      title: "New Document Review",
      message: "A new document requires your review.",
      time: "1 day ago",
      read: true,
      type: "info"
    },
    {
      id: 3,
      title: "Upcoming Defense Schedule",
      message: "Your thesis defense is scheduled for next week.",
      time: "2 days ago",
      read: false,
      type: "warning"
    }
  ]);

  // Calculate unread count based on notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // Get user's full name or username
  const getUserDisplayName = () => {
    if (user) {
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      } else if (user.first_name) {
        return user.first_name;
      } else if (user.username) {
        return user.username;
      }
    }
    return "User";
  };

  // Get user's initials
  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    if (displayName === "User") {
      return "U";
    }
    
    const names = displayName.split(" ");
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    } else {
      return `${names[0].charAt(0).toUpperCase()}${names[names.length - 1].charAt(0).toUpperCase()}`;
    }
  };

  const getNavLinkClass = (path: string) => {
    return location.pathname === path 
      ? "sidebar-item-academic sidebar-item-academic-active" 
      : "sidebar-item-academic";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNotifications(!showNotifications);
    // Close user menu if open
    if (showUserMenu) {
      setShowUserMenu(false);
    }
    // Close the sidebar on mobile
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  const handleUserMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
    // Close notifications if open
    if (showNotifications) {
      setShowNotifications(false);
    }
  };

  const closeMenus = () => {
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  // Close menus when clicking outside
  const handleOutsideClick = (e: React.MouseEvent) => {
    closeMenus();
  };

  // Mark a single notification as read
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    // Navigate to the appropriate profile page based on user role
    switch (role) {
      case "student":
        navigate("/dashboard/student/profile");
        break;
      case "admin":
        navigate("/dashboard/admin/profile");
        break;
      case "adviser":
        navigate("/dashboard/adviser/profile");
        break;
      case "panel":
        navigate("/dashboard/panel/profile");
        break;
      default:
        navigate("/dashboard");
    }
    closeMenus();
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  // Define navigation items for each role based on their features
  const navItems = {
    student: [
      { name: "Dashboard", path: "/dashboard/student", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" },
      { name: "My Group", path: "/dashboard/student/groups", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
      { name: "Thesis", path: "/thesis", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { name: "Defense Schedule", path: "/dashboard/student/defense", icon: "M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6 2a2 2 0 11-4 0 2 2 0 014 0z" },
    ],
    admin: [
      { name: "Dashboard", path: "/dashboard/admin", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" },
      { name: "Manage Users", path: "/dashboard/admin/users", icon: "M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
      { name: "Manage Groups", path: "/dashboard/admin/groups", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
      { name: "Group Proposals", path: "/dashboard/admin/group-proposals", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
      { name: "Defense Schedules", path: "/dashboard/admin/defense", icon: "M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6 2a2 2 0 11-4 0 2 2 0 014 0z" },
      { name: "Reports", path: "/dashboard/admin/reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
      { name: "System Logs", path: "/dashboard/admin/logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    ],
    adviser: [
      { name: "Dashboard", path: "/dashboard/adviser", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" },
      { name: "My Groups", path: "/dashboard/adviser/groups", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
      { name: "Thesis Review", path: "/adviser/thesis", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { name: "Defense Schedules", path: "/dashboard/adviser/defense", icon: "M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6 2a2 2 0 11-4 0 2 2 0 014 0z" },
    ],
    panel: [
      { name: "Dashboard", path: "/dashboard/panel", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" },
      { name: "My Groups", path: "/dashboard/panel/groups", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
      { name: "Document Reviews", path: "/dashboard/panel/documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { name: "Defense Evaluations", path: "/dashboard/panel/defense", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
      { name: "Defense Schedules", path: "/dashboard/panel/schedules", icon: "M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6 2a2 2 0 11-4 0 2 2 0 014 0z" },
    ],
  };

  const items = navItems[role as keyof typeof navItems] || navItems.student;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`sidebar-academic transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:transform-none`}
        onClick={handleOutsideClick}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header - made more compact */}
          <div className="sidebar-header-academic flex items-center justify-between p-3">
            <div className="flex items-center mb-2">
              <h1 className="text-lg font-bold text-academic-primary">PaperTrail</h1>
              {/* Notification icon - made bigger */}
              <div className="relative ml-3">
                <button 
                  className="notification-icon p-2" 
                  onClick={handleNotificationClick}
                >
                  <svg className="w-5 h-5 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Notification badge */}
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification popup - made more compact */}
                {showNotifications && (
                  <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-academic-border z-50">
                    <div className="p-2 border-b border-academic-border">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-academic-text">Notifications</h3>
                        <button 
                          onClick={closeMenus}
                          className="text-academic-muted hover:text-academic-text p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-3 text-center">
                          <svg className="mx-auto h-8 w-8 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <h3 className="mt-1 text-xs font-medium text-academic-text">No notifications</h3>
                          <p className="mt-1 text-xs text-academic-muted">You're all caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-academic-border">
                          {notifications.map((notification) => (
                            <div 
                              key={notification.id} 
                              className={`p-2 hover:bg-academic-light cursor-pointer ${
                                !notification.read ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="flex items-start">
                                <div className={`flex-shrink-0 p-1 rounded-full ${
                                  notification.type === 'success' ? 'bg-green-100 text-green-600' :
                                  notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {notification.type === 'success' && (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  {notification.type === 'warning' && (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                  {notification.type === 'info' && (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="ml-2 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className={`text-xs font-medium ${
                                      notification.read ? 'text-academic-text' : 'text-academic-primary'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    {!notification.read && (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        New
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs text-academic-muted">
                                    {notification.message}
                                  </p>
                                  <p className="mt-1 text-xs text-academic-muted">
                                    {notification.time}
                                  </p>
                                  {!notification.read && (
                                    <button
                                      className="mt-1 text-xs text-academic-primary hover:text-academic-secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-academic-border text-center">
                      <button 
                        className="text-xs text-academic-primary hover:text-academic-secondary mr-2"
                        onClick={markAllAsRead}
                        disabled={notifications.every(n => n.read)}
                      >
                        Mark all as read
                      </button>
                      <button 
                        className="text-xs text-academic-primary hover:text-academic-secondary"
                        onClick={() => {
                          // Navigate to full notifications page
                          switch (role) {
                            case "student":
                              navigate("/dashboard/student/notifications");
                              break;
                            case "adviser":
                              navigate("/dashboard/adviser/notifications");
                              break;
                            case "panel":
                              navigate("/dashboard/panel/notifications");
                              break;
                            default:
                              navigate("/dashboard");
                          }
                          closeMenus();
                          if (window.innerWidth < 1024) {
                            toggleSidebar();
                          }
                        }}
                      >
                        View all
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={toggleSidebar}
              className="lg:hidden text-academic-text hover:text-academic-primary p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation menu - made more compact with left-aligned text */}
          <nav className="flex-1 sidebar-menu-academic py-2 px-0">
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={getNavLinkClass(item.path)}
                    onClick={toggleSidebar}
                  >
                    <svg 
                      className="sidebar-icon-academic w-4 h-4 flex-shrink-0"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span className="sidebar-text-academic text-sm ml-2">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sidebar footer with logout - made more compact */}
          <div className="p-2 border-t border-academic-border">
            <div className="relative">
              {/* User menu button */}
              <button
                className="w-full flex items-center space-x-1 p-1.5 rounded-lg hover:bg-academic-border transition-colors duration-200 group"
                onClick={handleUserMenuClick}
              >
                <div className="w-6 h-6 rounded-full bg-academic-primary text-academic-white font-medium flex items-center justify-center border border-academic-primary flex-shrink-0 text-xs">
                  {getUserInitials()}
                </div>
                <div className="text-left flex-1 min-w-0 -space-y-1">
                  <p className="text-xs font-medium text-academic-text truncate">{getUserDisplayName()}</p>
                  <p className="text-xs text-academic-muted capitalize truncate">{role}</p>
                </div>
                <svg className="w-3 h-3 text-academic-muted transform transition-transform duration-200 group-hover:text-academic-text -mr-0.5" 
                     fill="none" 
                     stroke="currentColor" 
                     viewBox="0 0 24 24"
                     style={{ transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* User menu popup - made more compact */}
              {showUserMenu && (
                <div className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-lg shadow-lg border border-academic-border z-50">
                  <div className="p-1">
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg bg-academic-light hover:bg-academic-theses hover:text-academic-white transition-all duration-300 ease-in-out text-academic-text transform hover:scale-[1.02] hover:shadow-sm hover:border-academic-primary text-sm"
                    >
                      <svg className="w-4 h-4 text-academic-primary hover:text-academic-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg bg-academic-light hover:bg-academic-theses hover:text-academic-white transition-all duration-300 ease-in-out text-academic-danger transform hover:scale-[1.02] hover:shadow-sm hover:border-academic-primary text-sm"
                    >
                      <svg className="w-4 h-4 text-academic-danger hover:text-academic-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}