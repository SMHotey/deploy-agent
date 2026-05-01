'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function NotificationCenter() {
  const { getToken } = useAuth();
  const { success, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      // In a real implementation, this would fetch from an API endpoint
      // For now, we'll use mock data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'success',
          title: 'Deployment Successful',
          message: 'Your project "my-app" was deployed successfully.',
          timestamp: new Date().toISOString(),
          read: false,
        },
        {
          id: '2',
          type: 'error',
          title: 'Deployment Failed',
          message: 'Deployment failed for project "test-app". Check logs for details.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
        },
        {
          id: '3',
          type: 'info',
          title: 'New Feature Available',
          message: 'Try our new analytics dashboard with enhanced metrics.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: true,
        },
      ];
      
      setNotifications(mockNotifications);
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // In real implementation, call API to mark as read
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err: any) {
      toastError(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      // In real implementation, call API
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      success('All notifications marked as read');
    } catch (err: any) {
      toastError(err.message);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // In real implementation, call API
      setNotifications(prev => prev.filter(n => n.id !== id));
      success('Notification deleted');
    } catch (err: any) {
      toastError(err.message);
    }
  };

  const typeStyles = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  const filteredNotifications = showAll 
    ? notifications 
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Notifications {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showAll ? 'Show Unread' : 'Show All'}
            </button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-2xl mb-2">🔔</p>
            <p>No {showAll ? '' : 'unread '}notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg border transition-colors ${
                  n.read ? 'bg-background' : 'bg-muted/20'
                } hover:bg-muted/50`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{typeIcons[n.type]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${n.read ? '' : 'font-semibold'}`}>
                        {n.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for notification bell in navbar
export function useNotifications() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // In real implementation, fetch notification count
    const fetchCount = () => {
      // Mock: 2 unread notifications
      setCount(2);
    };
    fetchCount();
    
    // Could set up polling or WebSocket for real-time updates
    const interval = setInterval(fetchCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return { count };
}
