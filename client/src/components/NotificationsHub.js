import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  MessageSquare,
  FileText,
  Award,
  Calendar,
  Filter,
  Check,
  Trash2,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

const NotificationsHub = () => {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Socket.IO listeners for real-time announcements
  useEffect(() => {
    if (!socket) return;

    const handleNewAnnouncement = (announcement) => {
      // Create a notification for the announcement
      const notification = {
        _id: `announcement-${announcement.id}`,
        type: 'announcement',
        title: `New Announcement: ${announcement.title}`,
        message: announcement.content,
        data: {
          announcementId: announcement.id,
          priority: announcement.priority,
          audience: announcement.audience
        },
        read: false,
        createdAt: new Date(announcement.createdAt)
      };

      // Show toast notification
      toast.success(`New announcement: ${announcement.title}`, {
        duration: 5000,
        position: 'top-right'
      });

      // Invalidate queries to refresh the notifications list
      queryClient.invalidateQueries('user-notifications');
    };

    socket.on('new_announcement', handleNewAnnouncement);

    return () => {
      socket.off('new_announcement', handleNewAnnouncement);
    };
  }, [socket, queryClient]);

  // Fetch notifications
  const { data: notificationsData, isLoading, error, refetch } = useQuery(
    ['user-notifications', filter, page],
    async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (filter === 'unread') params.append('unread', 'true');
      params.append('page', page);
      params.append('limit', 20);
      
      const response = await axios.get(`/api/user/notifications?${params.toString()}`);
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000 // 30 seconds
    }
  );

  // Mark notification as read mutation
  const markAsReadMutation = useMutation(
    async (notificationId) => {
      const response = await axios.put(`/api/user/notifications/${notificationId}/read`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('user-notifications');
        queryClient.invalidateQueries('user-dashboard-stats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to mark notification as read');
      }
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    async () => {
      const response = await axios.put('/api/user/notifications/read-all');
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('All notifications marked as read');
        queryClient.invalidateQueries('user-notifications');
        queryClient.invalidateQueries('user-dashboard-stats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to mark all notifications as read');
      }
    }
  );

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination || {};
  const unreadCount = notificationsData?.unreadCount || 0;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'issue_submitted': return FileText;
      case 'issue_assigned': return CheckCircle;
      case 'issue_resolved': return Award;
      case 'issue_rejected': return XCircle;
      case 'issue_update': return AlertCircle;
      case 'message': return MessageSquare;
      case 'announcement': return Bell;
      case 'warning_issued': return AlertCircle;
      case 'account_suspended': return XCircle;
      case 'account_banned': return XCircle;
      case 'account_restored': return CheckCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'issue_submitted': return 'text-blue-400 bg-blue-900/20';
      case 'issue_assigned': return 'text-green-400 bg-green-900/20';
      case 'issue_resolved': return 'text-green-400 bg-green-900/20';
      case 'issue_rejected': return 'text-red-400 bg-red-900/20';
      case 'issue_update': return 'text-yellow-400 bg-yellow-900/20';
      case 'message': return 'text-purple-400 bg-purple-900/20';
      case 'announcement': return 'text-yellow-400 bg-yellow-900/20';
      case 'warning_issued': return 'text-orange-400 bg-orange-900/20';
      case 'account_suspended': return 'text-red-400 bg-red-900/20';
      case 'account_banned': return 'text-red-400 bg-red-900/20';
      case 'account_restored': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'issue_submitted': return 'Issue Submitted';
      case 'issue_assigned': return 'Issue Assigned';
      case 'issue_resolved': return 'Issue Resolved';
      case 'issue_rejected': return 'Issue Rejected';
      case 'issue_update': return 'Issue Updated';
      case 'message': return 'Message';
      case 'announcement': return 'Announcement';
      case 'warning_issued': return 'Warning Issued';
      case 'account_suspended': return 'Account Suspended';
      case 'account_banned': return 'Account Banned';
      case 'account_restored': return 'Account Restored';
      default: return 'Notification';
    }
  };

  const handleMarkAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Bell className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Notifications</h3>
        <p className="text-dark-400 mb-4">{error.message}</p>
        <button onClick={refetch} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Notifications</h2>
          <p className="text-dark-400">
            {unreadCount > 0 
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'All caught up!'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refetch}
            className="flex items-center space-x-2 text-primary-400 hover:text-primary-300 transition-colors"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isLoading}
              className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
            >
              <Check size={18} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 rounded-lg p-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'issue_submitted', label: 'Issues', count: 0 },
            { id: 'message', label: 'Messages', count: 0 },
            { id: 'announcement', label: 'Announcements', count: 0 },
            { id: 'warning_issued', label: 'Warnings', count: 0 }
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => handleFilterChange(filterOption.id)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === filterOption.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white'
              )}
            >
              {filterOption.label}
              {filterOption.count > 0 && (
                <span className="ml-2 bg-dark-600 text-white text-xs px-2 py-1 rounded-full">
                  {filterOption.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            </h3>
            <p className="text-dark-400">
              {filter === 'unread' 
                ? 'You\'re all caught up!'
                : 'You haven\'t received any notifications yet.'
              }
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const isUnread = !notification.read;
            
            return (
              <div
                key={notification._id}
                className={clsx(
                  'bg-dark-800 rounded-lg p-6 transition-colors',
                  isUnread ? 'border-l-4 border-primary-500' : 'hover:bg-dark-700'
                )}
              >
                <div className="flex items-start space-x-4">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    getNotificationColor(notification.type)
                  )}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-white font-semibold">
                            {notification.title}
                          </h3>
                          {isUnread && (
                            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                          )}
                        </div>
                        <p className="text-dark-300 text-sm mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-dark-400">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>
                              {new Date(notification.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <span className={clsx(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            getNotificationColor(notification.type)
                          )}>
                            {getTypeLabel(notification.type)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            disabled={markAsReadMutation.isLoading}
                            className="text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                            title="Mark as read"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional Data */}
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <div className="mt-3 p-3 bg-dark-700 rounded-lg">
                        <div className="text-xs text-dark-400 mb-2">Additional Information:</div>
                        <div className="space-y-1">
                          {Object.entries(notification.data).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-dark-300 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>
                              <span className="text-white">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-dark-400 text-sm">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsHub;
