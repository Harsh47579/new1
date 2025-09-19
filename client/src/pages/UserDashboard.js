import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  User, 
  Bell, 
  Settings, 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Camera,
  MessageSquare,
  Heart,
  ThumbsUp
} from 'lucide-react';
import MyReportsTimeline from '../components/MyReportsTimeline';
import Leaderboard from '../components/Leaderboard';
import NotificationsHub from '../components/NotificationsHub';
import AccountSettings from '../components/AccountSettings';
import FundableProjects from '../components/FundableProjects';
import AnnouncementBanner from '../components/AnnouncementBanner';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats, error: statsError } = useQuery(
    'user-dashboard-stats',
    async () => {
      console.log('Fetching dashboard stats...');
      const response = await axios.get('/api/user/dashboard-stats');
      console.log('Dashboard stats response:', response.data);
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  // Fetch notifications count
  const { data: notificationsData } = useQuery(
    'user-notifications-count',
    async () => {
      const response = await axios.get('/api/user/notifications?limit=1');
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000 // 2 minutes
    }
  );

  // Set up Socket.IO listeners for real-time updates
  useEffect(() => {
    if (socket && user) {
      // Join user's personal room for notifications
      socket.emit('join-user', user._id || user.id);

      // Listen for issue updates
      socket.on('issue_update', (data) => {
        console.log('Issue update received:', data);
        // Refetch dashboard stats when issue is updated
        refetchStats();
      });

      // Listen for notifications
      socket.on('notification', (notification) => {
        console.log('New notification received:', notification);
        // Refetch notifications
        refetchStats();
      });

      return () => {
        socket.off('issue_update');
        socket.off('notification');
        socket.emit('leave-user', user._id || user.id);
      };
    }
  }, [socket, user, refetchStats]);

  const stats = dashboardStats?.stats || {};
  const unreadNotifications = notificationsData?.unreadCount || 0;

  // Debug logging
  console.log('UserDashboard - User:', user);
  console.log('UserDashboard - Stats:', stats);
  console.log('UserDashboard - Dashboard Stats:', dashboardStats);

  // Quick action handlers
  const handleQuickAction = (action) => {
    switch (action) {
      case 'report':
        navigate('/report');
        break;
      case 'reports':
        setActiveTab('reports');
        break;
      case 'community':
        setActiveTab('community');
        break;
      case 'notifications':
        setActiveTab('notifications');
        break;
      default:
        break;
    }
  };

  // Get button loading state
  const getButtonLoadingState = (action) => {
    // You can add loading states here if needed
    return false;
  };

  // Community engagement handlers
  const handleEngagementClick = (type) => {
    switch (type) {
      case 'upvotes':
        // Navigate to community tab to see upvoted content
        setActiveTab('community');
        break;
      case 'confirmations':
        // Navigate to reports tab to see confirmed reports
        setActiveTab('reports');
        break;
      case 'comments':
        // Navigate to community tab to see comments
        setActiveTab('community');
        break;
      default:
        break;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'reports', label: 'My Reports', icon: FileText },
    { id: 'funding', label: 'Fund Projects', icon: TrendingUp },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-dark-400 mb-4">{statsError.message}</p>
          <button onClick={() => refetchStats()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Announcement Banner */}
      <AnnouncementBanner />
      
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-0 sm:h-16 gap-4 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-sm sm:text-lg">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-white truncate">Welcome back, {user?.name}!</h1>
                <p className="text-dark-400 text-xs sm:text-sm">Civic Issue Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2 text-dark-400">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm">{stats.user?.points || 0} points</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 text-dark-400">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm">{stats.user?.coins || 0} coins</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Navigation Tabs */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex flex-wrap gap-2 sm:gap-4 lg:gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasNotification = tab.id === 'notifications' && unreadNotifications > 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {hasNotification && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-[16px] sm:min-w-[20px] text-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-dark-800 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-400 text-xs sm:text-sm">Total Reports</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.reports?.total || 0}</p>
                  </div>
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400 flex-shrink-0" />
                </div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-400 text-xs sm:text-sm">Resolved</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-400">{stats.reports?.resolved || 0}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" />
                </div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-400 text-xs sm:text-sm">Community Score</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-400">{stats.user?.communityScore || 0}</p>
                  </div>
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0" />
                </div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-400 text-xs sm:text-sm">Unread Notifications</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-400">{unreadNotifications}</p>
                  </div>
                  <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-dark-800 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">Recent Reports</h2>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                >
                  View All →
                </button>
              </div>
              {stats.reports?.recent?.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {stats.reports.recent.map((report) => (
                    <div 
                      key={report._id} 
                      onClick={() => setActiveTab('reports')}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-dark-700 rounded-lg gap-3 sm:gap-4 hover:bg-dark-600 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          report.status === 'resolved' ? 'bg-green-500' :
                          report.status === 'in_progress' ? 'bg-yellow-500' :
                          report.status === 'new' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-medium text-sm sm:text-base truncate">{report.title}</h3>
                          <p className="text-dark-400 text-xs sm:text-sm">{report.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right">
                        <p className="text-dark-400 text-xs sm:text-sm">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          report.status === 'resolved' ? 'bg-green-900 text-green-300' :
                          report.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' :
                          report.status === 'new' ? 'bg-blue-900 text-blue-300' :
                          'bg-gray-900 text-gray-300'
                        }`}>
                          {report.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Reports Yet</h3>
                  <p className="text-dark-400">Start by reporting your first civic issue!</p>
                </div>
              )}
            </div>

            {/* Community Engagement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-dark-800 rounded-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Community Engagement</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div 
                    onClick={() => handleEngagementClick('upvotes')}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                      <span className="text-white text-sm sm:text-base">Upvotes Received</span>
                    </div>
                    <span className="text-white font-semibold text-sm sm:text-base">{stats.community?.totalUpvotes || 0}</span>
                  </div>
                  <div 
                    onClick={() => handleEngagementClick('confirmations')}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white text-sm sm:text-base">Confirmations</span>
                    </div>
                    <span className="text-white font-semibold text-sm sm:text-base">{stats.community?.totalConfirmations || 0}</span>
                  </div>
                  <div 
                    onClick={() => handleEngagementClick('comments')}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                      <span className="text-white text-sm sm:text-base">Comments</span>
                    </div>
                    <span className="text-white font-semibold text-sm sm:text-base">{stats.community?.totalComments || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-dark-800 rounded-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-3">
                  <button 
                    onClick={() => handleQuickAction('report')}
                    disabled={getButtonLoadingState('report')}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:opacity-50 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium flex items-center justify-center space-x-2 transform hover:scale-105 disabled:transform-none"
                    title="Report a new civic issue"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Report Issue</span>
                  </button>
                  <button 
                    onClick={() => handleQuickAction('reports')}
                    disabled={getButtonLoadingState('reports')}
                    className="w-full bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 disabled:opacity-50 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium flex items-center justify-center space-x-2 transform hover:scale-105 disabled:transform-none"
                    title="View your submitted reports"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>My Reports</span>
                  </button>
                  <button 
                    onClick={() => handleQuickAction('community')}
                    disabled={getButtonLoadingState('community')}
                    className="w-full bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 disabled:opacity-50 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium flex items-center justify-center space-x-2 transform hover:scale-105 disabled:transform-none"
                    title="View community leaderboard and activity"
                  >
                    <Users className="w-4 h-4" />
                    <span>Community</span>
                  </button>
                  <button 
                    onClick={() => handleQuickAction('notifications')}
                    disabled={getButtonLoadingState('notifications')}
                    className="w-full bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 disabled:opacity-50 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium flex items-center justify-center space-x-2 transform hover:scale-105 disabled:transform-none relative"
                    title="View your notifications"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center animate-pulse">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && <MyReportsTimeline />}
        {activeTab === 'funding' && <FundableProjects />}
        {activeTab === 'community' && <Leaderboard />}
        {activeTab === 'notifications' && <NotificationsHub />}
        {activeTab === 'settings' && <AccountSettings />}
      </div>
    </div>
  );
};

export default UserDashboard;
