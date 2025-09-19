import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  UserCheck,
  Building2,
  Activity,
  X,
  Megaphone
} from 'lucide-react';
import axios from 'axios';
import IssueCard from '../components/IssueCard';
import AdminIssueCard from '../components/AdminIssueCard';
import AdminChatbot from '../components/AdminChatbot';
import AnalyticsChart from '../components/AnalyticsChart';
import HeatMap from '../components/HeatMap';
import IssuesMap from '../components/IssuesMap';
import AIPredictionsWidget from '../components/AIPredictionsWidget';
import AdminAnnouncements from '../components/AdminAnnouncements';
import Departments from './Departments';
import UserManagement from './UserManagement';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    department: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery(
    'adminDashboard',
    async () => {
      console.log('🚀 React Query: Starting admin dashboard API call...');
      console.log('📡 React Query: API URL:', '/api/admin/dashboard');
      
      try {
        const response = await axios.get('/api/admin/dashboard');
        console.log('✅ React Query: API Response Status:', response.status);
        console.log('📊 React Query: API Response Data:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ React Query: API Error:', error);
        console.error('🔍 React Query: Error Details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        throw error;
      }
    },
    {
      retry: 2,
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      onError: (error) => {
        console.error('❌ React Query: Query failed:', error);
      },
      onSuccess: (data) => {
        console.log('✅ React Query: Query succeeded:', data);
      }
    }
  );

  // Fetch issues with filters
  const { data: issuesData, isLoading: issuesLoading, error: issuesError } = useQuery(
    ['adminIssues', filters, sortBy, sortOrder],
    async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await axios.get(`/api/admin/issues?${params.toString()}`);
      return response.data;
    },
    {
      retry: 1,
      staleTime: 60000, // 1 minute
      cacheTime: 300000 // 5 minutes
    }
  );

  // Fetch departments for filtering
  const { data: departmentsData } = useQuery(
    'departments',
    async () => {
      const response = await axios.get('/api/departments');
      return response.data;
    }
  );

  // Fetch analytics data
  const { data: analyticsData } = useQuery(
    'adminAnalytics',
    async () => {
      const response = await axios.get('/api/admin/analytics');
      return response.data;
    }
  );

  const overview = dashboardData?.overview || {};
  const recentIssues = dashboardData?.recentIssues || [];
  const issues = issuesData?.issues || [];
  const filterOptions = issuesData?.filterOptions || {};

  const statCards = [
    {
      title: 'Total Issues',
      value: overview.totalIssues || 0,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-600',
      change: '+12%'
    },
    {
      title: 'New Issues',
      value: overview.newIssues || 0,
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-600',
      change: '+5%'
    },
    {
      title: 'In Progress',
      value: overview.inProgressIssues || 0,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-600',
      change: '+8%'
    },
    {
      title: 'Resolved',
      value: overview.resolvedIssues || 0,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-600',
      change: '+15%'
    },
    {
      title: 'Total Users',
      value: overview.totalUsers || 0,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-600',
      change: '+3%'
    },
    {
      title: 'Departments',
      value: overview.departments || 0,
      icon: Building2,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-600',
      change: '0%'
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      priority: '',
      department: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-white">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Dashboard</h2>
          <p className="text-dark-300 mb-4">There was an error loading the admin dashboard data.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Retry
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
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-dark-300">
            Manage civic issues, departments, and system analytics
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-400 text-sm">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-green-400 text-xs">{stat.change}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon size={24} className="text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-dark-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'issues', label: 'Issues Management', icon: FileText },
                { id: 'map', label: 'Issues Map', icon: MapPin },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'departments', label: 'Departments', icon: Building2 },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'announcements', label: 'Announcements', icon: Megaphone }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-dark-400 hover:text-dark-300 hover:border-dark-300'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* AI Predictions Widget */}
            <AIPredictionsWidget />

            {/* Recent Issues */}
            <div className="card">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Issues</h2>
              <div className="space-y-4">
                {recentIssues.slice(0, 5).map((issue) => (
                  <AdminIssueCard key={issue._id} issue={issue} />
                ))}
              </div>
            </div>

            {/* Quick Stats Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Issues by Status</h3>
                <AnalyticsChart
                  data={dashboardData?.charts?.issuesByStatus || []}
                  type="doughnut"
                />
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Top Categories</h3>
                <AnalyticsChart
                  data={dashboardData?.charts?.issuesByCategory || []}
                  type="bar"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="card">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Search size={20} className="text-dark-400" />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="input w-64"
                  />
                </div>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="input w-40"
                >
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="input w-48"
                >
                  <option value="">All Categories</option>
                  {filterOptions.categories?.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="input w-32"
                >
                  <option value="">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="input w-48"
                >
                  <option value="">All Departments</option>
                  <option value="unassigned">Unassigned</option>
                  {departmentsData?.departments?.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={clearFilters}
                  className="btn-outline text-sm"
                >
                  Clear Filters
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-dark-400">
                    {issuesData?.pagination?.total || 0} issues found
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input w-32"
                  >
                    <option value="createdAt">Date</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="input w-24"
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                  <button className="btn-outline text-sm">
                    <Download size={16} className="mr-1" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Issues List */}
            <div className="space-y-4">
              {issuesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={64} className="text-dark-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">No Issues Found</h3>
                  <p className="text-dark-400">Try adjusting your filters</p>
                </div>
              ) : (
                issues.map((issue) => (
                  <AdminIssueCard key={issue._id} issue={issue} />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Issue Trends</h3>
                <AnalyticsChart
                  data={analyticsData?.topCategories || []}
                  type="line"
                />
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Department Performance</h3>
                <AnalyticsChart
                  data={analyticsData?.departmentPerformance || []}
                  type="bar"
                />
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Issue Heat Map</h3>
              <HeatMap showFilters={true} />
            </div>
          </div>
        )}

        {activeTab === 'departments' && <Departments />}

        {activeTab === 'users' && <UserManagement />}

        {activeTab === 'announcements' && <AdminAnnouncements />}

        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Issues Map</h2>
              <div className="flex space-x-2">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="input text-sm"
                >
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="input text-sm"
                >
                  <option value="">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            
            <div className="card p-0 overflow-hidden">
              <div className="h-96">
                <IssuesMap
                  issues={issues || []}
                  onIssueSelect={setSelectedIssue}
                  selectedIssue={selectedIssue}
                />
              </div>
            </div>

            {selectedIssue && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Selected Issue Details</h3>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-dark-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <AdminIssueCard issue={selectedIssue} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Users</h2>
              <button className="btn-primary">
                <UserCheck size={16} className="mr-2" />
                Add User
              </button>
            </div>
            <div className="text-center py-12">
              <Users size={64} className="text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">User Management</h3>
              <p className="text-dark-400">Manage user accounts and roles</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Admin Chatbot */}
      <AdminChatbot />
    </div>
  );
};

export default AdminDashboard;
