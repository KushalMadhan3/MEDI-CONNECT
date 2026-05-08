import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Loader2 } from 'lucide-react';
import { doctorAPI, type Notification } from '../../src/services/doctorService';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onRefresh?: () => void;
}

export function NotificationDropdown({ 
  notifications, 
  unreadCount, 
  onMarkAsRead, 
  onMarkAllAsRead,
  onRefresh 
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (markingAsRead) return;
    
    setMarkingAsRead(notificationId);
    try {
      await doctorAPI.markNotificationAsRead(notificationId);
      onMarkAsRead?.(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAsRead) return;
    
    setMarkingAsRead('all');
    try {
      await doctorAPI.markAllNotificationsAsRead();
      onMarkAllAsRead?.();
    } catch (error) {
      console.error('Failed to mark all as read', error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return '📅';
      case 'prescription':
        return '💊';
      case 'patient':
        return '👤';
      case 'payment':
        return '💳';
      case 'order':
        return '📦';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 hover:bg-[#F5F3FA] rounded-lg transition-all"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && onRefresh) onRefresh();
        }}
      >
        <Bell className="w-6 h-6 text-[#6E6E6E]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#E53935] rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-[#E8EAFF] z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E8EAFF] flex items-center justify-between">
            <h3 className="font-semibold text-[#333]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAsRead === 'all'}
                  className="text-xs text-[#3F53D9] hover:text-[#3346B8] font-medium disabled:opacity-50"
                >
                  {markingAsRead === 'all' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Mark all read'
                  )}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#6E6E6E] hover:text-[#333] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#6E6E6E]">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8EAFF]">
                {notifications.map((notification) => (
                  <div
                    key={notification._id || notification.id}
                    className={`px-4 py-3 hover:bg-[#F5F3FA] transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${!notification.isRead ? 'text-[#333]' : 'text-[#6E6E6E]'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-[#6E6E6E] mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-[#6E6E6E] mt-1">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id || notification.id)}
                              disabled={markingAsRead === (notification._id || notification.id)}
                              className="flex-shrink-0 p-1 hover:bg-[#E8EAFF] rounded transition-colors disabled:opacity-50"
                              title="Mark as read"
                            >
                              {markingAsRead === (notification._id || notification.id) ? (
                                <Loader2 className="w-3 h-3 animate-spin text-[#3F53D9]" />
                              ) : (
                                <Check className="w-3 h-3 text-[#3F53D9]" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#E8EAFF] text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page if needed
                }}
                className="text-xs text-[#3F53D9] hover:text-[#3346B8] font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}








