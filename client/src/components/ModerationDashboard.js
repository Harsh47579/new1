import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  Flag, 
  Ban, 
  UserX, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  Search,
  Filter,
  AlertCircle,
  Shield,
  Activity,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';
import clsx from 'clsx';

const ModerationDashboard = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  const queryClient = useQueryClient();

  // Fetch flagged users
  const { data: flaggedUsers, isLoading: flaggedLoading } = useQuery(
    ['flagged-users', searchTerm, filterStatus, filterSeverity],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterSeverity) params.append('severity', filterSeverity);
      
      const response = await axios.get(`/api/admin/users?${params.toString()}&flags=pending`);
      return response.data;
    }
  );

  // Fetch suspicious activities
  const { data: suspiciousActivities } = useQuery(
    'suspicious-activities',
    async () => {
      const response = await axios.get('/api/activity/suspicious');
      return response.data;
    }
  );

  // Fetch moderation stats
  const { data: moderationStats } = useQuery(
    'moderation-stats',
    async () => {
      const response = await axios.get('/api/admin/users?stats=true');
      return response.data;
    }
  );

  // Review flag mutation
  const reviewFlagMutation = useMutation(
    async ({ userId, flagId, action, notes }) => {
      const response = await axios.put(`/api/admin/users/${userId}/flags/${flagId}/review`, {
        action,
        notes
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Flag reviewed successfully!');
        queryClient.invalidateQueries('flagged-users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to review flag');
      }
    }
  );

  // Take moderation action mutation
  const moderationActionMutation = useMutation(
    async ({ userId, action, data }) => {
      let endpoint = '';
      switch (action) {
        case 'warn':
          endpoint = `/api/admin/users/${userId}/warn`;
          break;
        case 'suspend':
          endpoint = `/api/admin/users/${userId}/suspend`;
          break;
        case 'ban':
          endpoint = `/api/admin/users/${userId}/ban`;
          break;
        case 'lift':
          endpoint = `/api/admin/users/${userId}/lift-suspension`;
          break;
        default:
          throw new Error('Invalid action');
      }
      
      const response = await axios.post(endpoint, data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Action completed successfully!');
        queryClient.invalidateQueries('flagged-users');
        setShowActionModal(false);
        setSelectedUser(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to complete action');
      }
    }
  );

  const handleReviewFlag = (userId, flagId, action, notes) => {
    reviewFlagMutation.mutate({ userId, flagId, action, notes });
  };

  const handleModerationAction = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setShowActionModal(true);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'reviewed': return 'text-blue-400';
      case 'dismissed': return 'text-gray-400';
      case 'action_taken': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const users = flaggedUsers?.users || [];
  const stats = moderationStats?.stats || {};
  const suspicious = suspiciousActivities?.suspiciousActivities || [];

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Moderation Dashboard</h1>
          <p className="text-dark-400">Monitor user behavior and manage content moderation</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Pending Flags</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingFlags || 0}</p>
              </div>
              <Flag className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Suspended Users</p>
                <p className="text-2xl font-bold text-orange-400">{stats.suspendedUsers || 0}</p>
              </div>
              <UserX className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Banned Users</p>
                <p className="text-2xl font-bold text-red-400">{stats.bannedUsers || 0}</p>
              </div>
              <Ban className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Suspicious Activities</p>
                <p className="text-2xl font-bold text-purple-400">{suspicious.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="action_taken">Action Taken</option>
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="input"
            >
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="space-y-6">
          {/* Flagged Users */}
          <div className="bg-dark-800 rounded-lg">
            <div className="p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Flag className="w-5 h-5 mr-2 text-yellow-400" />
                Flagged Users
              </h2>
            </div>
            <div className="p-6">
              {flaggedLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Flagged Users</h3>
                  <p className="text-dark-400">All users are in good standing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user._id} className="bg-dark-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{user.name}</h3>
                            <p className="text-dark-400 text-sm">{user.email}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(user.flags?.[0]?.severity || 'low')} bg-opacity-20`}>
                                {user.flags?.[0]?.type?.replace('_', ' ').toUpperCase() || 'FLAGGED'}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(user.flags?.[0]?.status || 'pending')} bg-opacity-20`}>
                                {user.flags?.[0]?.status?.toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserDetails(true);
                            }}
                            className="p-2 text-blue-400 hover:text-blue-300"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleModerationAction(user, 'warn')}
                            className="p-2 text-yellow-400 hover:text-yellow-300"
                            title="Issue Warning"
                          >
                            <AlertTriangle size={16} />
                          </button>
                          <button
                            onClick={() => handleModerationAction(user, 'suspend')}
                            className="p-2 text-orange-400 hover:text-orange-300"
                            title="Suspend User"
                          >
                            <UserX size={16} />
                          </button>
                          <button
                            onClick={() => handleModerationAction(user, 'ban')}
                            className="p-2 text-red-400 hover:text-red-300"
                            title="Ban User"
                          >
                            <Ban size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Flag Details */}
                      {user.flags && user.flags.length > 0 && (
                        <div className="mt-4 pl-14">
                          <div className="space-y-2">
                            {user.flags.map((flag, index) => (
                              <div key={index} className="bg-dark-600 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-white">
                                    {flag.type.replace('_', ' ').toUpperCase()}
                                  </span>
                                  <span className="text-xs text-dark-400">
                                    {new Date(flag.flaggedAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-dark-300 text-sm mb-2">{flag.description}</p>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(flag.status)} bg-opacity-20`}>
                                    {flag.status.toUpperCase()}
                                  </span>
                                  {flag.status === 'pending' && (
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => handleReviewFlag(user._id, flag._id, 'dismissed', 'Flag dismissed')}
                                        className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                                      >
                                        Dismiss
                                      </button>
                                      <button
                                        onClick={() => handleReviewFlag(user._id, flag._id, 'action_taken', 'Action taken')}
                                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                                      >
                                        Take Action
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Suspicious Activities */}
          {suspicious.length > 0 && (
            <div className="bg-dark-800 rounded-lg">
              <div className="p-6 border-b border-dark-700">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-purple-400" />
                  Suspicious Activities
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {suspicious.map((activity, index) => (
                    <div key={index} className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-red-400 font-medium">
                          {activity._id.action?.toUpperCase() || 'SUSPICIOUS ACTIVITY'}
                        </h3>
                        <span className="text-sm text-dark-400">
                          {activity.failureCount} failed attempts
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-dark-400">User:</span>
                          <p className="text-white">
                            {activity.user?.[0]?.name || 'Unknown'} ({activity.user?.[0]?.email || 'N/A'})
                          </p>
                        </div>
                        <div>
                          <span className="text-dark-400">IP Address:</span>
                          <p className="text-white">{activity._id.ipAddress || 'Unknown'}</p>
                        </div>
                        <div>
                          <span className="text-dark-400">Last Attempt:</span>
                          <p className="text-white">
                            {new Date(activity.lastAttempt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {activity.errorMessages && activity.errorMessages.length > 0 && (
                        <div className="mt-2">
                          <span className="text-dark-400 text-sm">Error Messages:</span>
                          <div className="mt-1 space-y-1">
                            {activity.errorMessages.map((error, idx) => (
                              <p key={idx} className="text-red-300 text-xs">{error}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowUserDetails(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Action Modal */}
      {showActionModal && selectedUser && (
        <ModerationActionModal
          user={selectedUser}
          action={actionType}
          onClose={() => {
            setShowActionModal(false);
            setSelectedUser(null);
            setActionType('');
          }}
          onSubmit={(data) => {
            moderationActionMutation.mutate({
              userId: selectedUser._id,
              action: actionType,
              data
            });
          }}
          isLoading={moderationActionMutation.isLoading}
        />
      )}
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-2xl font-bold text-white">User Details</h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-dark-400">Name</label>
                  <p className="text-white">{user.name}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Email</label>
                  <p className="text-white">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Role</label>
                  <p className="text-white">{user.role.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Account Status</label>
                  <p className="text-white">{user.accountStatus.replace('_', ' ').toUpperCase()}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Activity Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-dark-400">Last Login</label>
                  <p className="text-white">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Created At</label>
                  <p className="text-white">{new Date(user.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Warnings</label>
                  <p className="text-white">{user.warnings?.length || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Flags</label>
                  <p className="text-white">{user.flags?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings and Flags */}
          {(user.warnings?.length > 0 || user.flags?.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Moderation History</h3>
              <div className="space-y-4">
                {user.warnings?.map((warning, index) => (
                  <div key={index} className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-yellow-400 font-medium">Warning</h4>
                      <span className="text-sm text-dark-400">
                        {new Date(warning.issuedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white text-sm">{warning.reason}</p>
                    <p className="text-dark-300 text-sm mt-1">{warning.description}</p>
                  </div>
                ))}
                
                {user.flags?.map((flag, index) => (
                  <div key={index} className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-red-400 font-medium">Flag: {flag.type.replace('_', ' ').toUpperCase()}</h4>
                      <span className="text-sm text-dark-400">
                        {new Date(flag.flaggedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white text-sm">{flag.description}</p>
                    <p className="text-dark-300 text-sm mt-1">Status: {flag.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-dark-700 flex justify-end">
          <button
            onClick={onClose}
            className="btn-outline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Moderation Action Modal Component
const ModerationActionModal = ({ user, action, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    duration: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-bold text-white">
            {action === 'warn' && 'Issue Warning'}
            {action === 'suspend' && 'Suspend User'}
            {action === 'ban' && 'Ban User'}
            {action === 'lift' && 'Lift Suspension'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              User: {user.name}
            </label>
            <p className="text-dark-400 text-sm">{user.email}</p>
          </div>

          {action !== 'lift' && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Reason *
              </label>
              <input
                type="text"
                required
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="input w-full"
                placeholder="Reason for this action"
              />
            </div>
          )}

          {action === 'suspend' && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Duration (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="input w-full"
                placeholder="Leave empty for indefinite"
              />
            </div>
          )}

          {action === 'warn' && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input w-full"
                placeholder="Detailed description of the warning"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-primary ${
                action === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                action === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700' :
                action === 'warn' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-green-600 hover:bg-green-700'
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 
                action === 'suspend' ? 'Suspend' :
                action === 'ban' ? 'Ban' :
                action === 'lift' ? 'Lift Suspension' :
                'Issue Warning'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModerationDashboard;
