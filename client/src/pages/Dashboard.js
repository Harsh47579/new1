import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ThumbsUp,
  MessageCircle,
  Eye,
  Calendar,
  User,
  Bell,
  Trophy,
  Coins,
  TrendingUp,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import IssueCard from '../components/IssueCard';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch optimized dashboard data
  const { data: dashboardData, isLoading, error } = useQuery(
    'userDashboardData',
    async () => {
      console.log('🚀 Fetching user dashboard data...');
      const response = await axios.get('/api/user/dashboard-data');
      console.log('✅ Dashboard data received:', response.data);
      return response.data;
    },
    {
      retry: 2,
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      onError: (error) => {
        console.error('❌ Dashboard data fetch error:', error);
      }
    }
  );

  const overview = dashboardData?.overview || {};
  const recentReports = dashboardData?.recentReports || [];
  const userStats = dashboardData?.userStats || {};

  // Dynamic stat cards with real-time data
  const statCards = [
    {
      title: 'Total Reports',
      value: overview.totalReports || 0,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-600',
      change: '+12%'
    },
    {
      title: 'Resolved',
      value: overview.resolvedReports || 0,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-600',
      change: '+5%'
    },
    {
      title: 'Community Score',
      value: overview.communityScore || 0,
      icon: Trophy,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-600',
      change: '+8%'
    },
    {
      title: 'Unread Notifications',
      value: overview.unreadNotifications || 0,
      icon: Bell,
      color: 'text-red-400',
      bgColor: 'bg-red-600',
      change: '+3'
    }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-dark-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-dark-300 mb-4">
            {error.response?.data?.message || 'Failed to load dashboard data'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Dashboard</h1>
              <p className="text-dark-300">
                Track your civic issue reports and community engagement
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-dark-300">
                  <Coins size={16} className="text-yellow-500" />
                  <span>{userStats.coins || 0} coins</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-dark-300">
                  <TrendingUp size={16} className="text-green-500" />
                  <span>{userStats.points || 0} points</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card group hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm">{stat.title}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                  {stat.change && (
                    <div className="text-right">
                      <span className="text-xs text-green-400 font-medium">{stat.change}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-dark-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-dark-300 hover:border-dark-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('my-reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'my-reports'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-dark-300 hover:border-dark-300'
                }`}
              >
                My Reports
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'community'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-dark-300 hover:border-dark-300'
                }`}
              >
                Community Activity
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Reports Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Recent Reports</h2>
                <a
                  href="/my-reports"
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center"
                >
                  View All
                  <Eye size={16} className="ml-1" />
                </a>
              </div>
              
              {recentReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={64} className="text-dark-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">No Reports Yet</h3>
                  <p className="text-dark-400 mb-6">
                    Start by reporting your first civic issue!
                  </p>
                  <a
                    href="/report"
                    className="btn-primary inline-flex items-center space-x-2"
                  >
                    <span>Report an Issue</span>
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentReports.slice(0, 5).map((issue) => (
                    <div key={issue._id} className="bg-dark-800 rounded-lg p-4 border border-dark-700 hover:border-dark-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-2 line-clamp-1">
                            {issue.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-dark-400 mb-2">
                            <span>ID: {issue._id.slice(-6).toUpperCase()}</span>
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-xs bg-dark-700 px-2 py-1 rounded">
                              {issue.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            issue.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                            issue.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                            issue.status === 'new' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {issue.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-4 text-sm text-dark-400">
                          <span className="flex items-center">
                            <ThumbsUp size={14} className="mr-1" />
                            {issue.upvoteCount || 0} upvotes
                          </span>
                          <span className="flex items-center">
                            <MessageCircle size={14} className="mr-1" />
                            {issue.commentCount || 0} comments
                          </span>
                        </div>
                        <a
                          href={`/issue/${issue._id}`}
                          className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center"
                        >
                          View Details
                          <Eye size={14} className="ml-1" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card text-center">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Report Issue</h3>
                <p className="text-dark-400 text-sm mb-4">
                  Submit a new civic issue in your area
                </p>
                <a href="/report" className="btn-primary w-full">
                  Report Now
                </a>
              </div>
              
              <div className="card text-center">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">View Map</h3>
                <p className="text-dark-400 text-sm mb-4">
                  Explore issues on the interactive map
                </p>
                <a href="/issues-map" className="btn-outline w-full">
                  View Map
                </a>
              </div>
              
              <div className="card text-center">
                <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Trophy size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Rewards</h3>
                <p className="text-dark-400 text-sm mb-4">
                  Check your points and achievements
                </p>
                <a href="/rewards" className="btn-outline w-full">
                  View Rewards
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-reports' && (
          <div className="space-y-6">
            {recentReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={64} className="text-dark-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No Reports Yet</h3>
                <p className="text-dark-400 mb-6">
                  Start by reporting a civic issue in your area
                </p>
                <a
                  href="/report"
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <span>Report an Issue</span>
                </a>
              </div>
            ) : (
              <div className="grid gap-6">
                {recentReports.map((issue) => (
                  <div key={issue._id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {issue.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-dark-400 mb-2">
                          <span>ID: {issue._id.slice(-6).toUpperCase()}</span>
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`status-${issue.status}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                        {issue.priority && (
                          <span className={`priority-${issue.priority}`}>
                            {issue.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-dark-300 mb-4 line-clamp-2">
                      {issue.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-dark-400">
                        <span className="flex items-center">
                          <ThumbsUp size={14} className="mr-1" />
                          {issue.upvoteCount || 0} upvotes
                        </span>
                        <span className="flex items-center">
                          <MessageCircle size={14} className="mr-1" />
                          {issue.commentCount || 0} comments
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <a
                          href={`/issue/${issue._id}`}
                          className="btn-outline flex items-center space-x-1 text-sm"
                        >
                          <Eye size={14} />
                          <span>View Details</span>
                        </a>
                      </div>
                    </div>

                    {/* Progress Bar for In Progress Issues */}
                    {issue.status === 'in_progress' && issue.estimatedResolution && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-dark-400 mb-1">
                          <span>Progress</span>
                          <span>Estimated: {new Date(issue.estimatedResolution).toLocaleDateString()}</span>
                        </div>
                        <div className="w-full bg-dark-700 rounded-full h-2">
                          <div className="bg-primary-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                    )}

                    {/* Assignment Info */}
                    {issue.assignedTo && (
                      <div className="mt-4 p-3 bg-dark-700 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-dark-400">Assigned to: </span>
                            <span className="text-white font-medium">
                              {issue.assignedTo.department || 'Public Works Department'}
                            </span>
                          </div>
                          {issue.assignedTo.officer && (
                            <div className="flex items-center text-dark-400">
                              <User size={14} className="mr-1" />
                              <span>{issue.assignedTo.officer.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <BarChart3 size={64} className="text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Community Activity</h3>
              <p className="text-dark-400 mb-6">
                Engage with the community by upvoting and commenting on issues
              </p>
              <a
                href="/issues-map"
                className="btn-primary inline-flex items-center space-x-2"
              >
                <span>Explore Issues</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
