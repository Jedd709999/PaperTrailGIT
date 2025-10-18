import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/api';
import "../styles/academic-theme.css";

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  is_read: boolean;
  thesis?: {
    id: number;
    title: string;
  };
}

const NotificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotificationsList();
    }
  }, [user]);

  const fetchNotificationsList = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'thesis_status': '📋',
      'comment': '💬',
      'evaluation': '⭐',
      'defense': '🎓',
      'assignment': '📝',
      'reminder': '⏰'
    };
    return icons[type] || '🔔';
  };

  const getNotificationClass = (type: string) => {
    const classes: { [key: string]: string } = {
      'thesis_status': 'bg-academic-primary bg-opacity-20 text-academic-primary',
      'comment': 'bg-academic-light text-academic-text',
      'evaluation': 'bg-academic-success bg-opacity-20 text-academic-success',
      'defense': 'bg-academic-accent bg-opacity-20 text-academic-accent',
      'assignment': 'bg-academic-border text-academic-text',
      'reminder': 'bg-academic-warning bg-opacity-20 text-academic-warning'
    };
    return classes[type] || 'bg-academic-border text-academic-text';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-academic-muted hover:text-academic-primary focus:outline-none focus:ring-2 focus:ring-academic-accent focus:ring-opacity-50 rounded-md transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-academic-primary text-academic-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-academic-white border border-academic-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-academic-border">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-academic-text">Notifications</h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-academic-primary hover:text-academic-secondary font-medium"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-academic-muted hover:text-academic-text"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="spinner-academic mx-auto mb-2"></div>
                <p className="text-academic-muted mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-academic-muted">
                <svg className="w-12 h-12 mx-auto mb-2 text-academic-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-academic-border hover:bg-academic-light transition-colors ${
                    !notification.is_read ? 'bg-academic-primary bg-opacity-5' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getNotificationClass(notification.notification_type)}`}>
                      <span className="text-sm">{getNotificationIcon(notification.notification_type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-academic-text">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-academic-muted mt-1">
                            {notification.message}
                          </p>
                          {notification.thesis && (
                            <p className="text-xs text-academic-muted mt-1">
                              Thesis: {notification.thesis.title}
                            </p>
                          )}
                          <p className="text-xs text-academic-muted mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="ml-2 text-xs text-academic-primary hover:text-academic-secondary font-medium"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;