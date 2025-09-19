import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Shield,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  UserMinus,
  Ban,
  AlertCircle,
  Eye,
  Settings,
  Activity,
  Flag,
  AlertOctagon
} from 'lucide-react';
import clsx from 'clsx';

const UserManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState('');

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersData, isLoading } = useQuery(
    ['admin-users', searchTerm, filterRole, filterStatus, filterDepartment, sortBy, sortOrder],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterRole) params.append('role', filterRole);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDepartment) params.append('department', filterDepartment);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await axios.get(`/api/admin/users?${params.toString()}`);
      return response.data;
    },
    {
      refetchOnWindowFocus: false
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

  // Create user mutation
  const createUserMutation = useMutation(
    async (userData) => {
      const response = await axios.post('/api/admin/users', userData);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User created successfully!');
        queryClient.invalidateQueries('admin-users');
        setIsModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create user');
      }
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/admin/users/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User updated successfully!');
        queryClient.invalidateQueries('admin-users');
        setIsModalOpen(false);
        setEditingUser(null);
      },
      onError: (error) => {
        console.error('User update error:', error);
        console.error('Error response:', error.response?.data);
        
        // Handle validation errors
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
          const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
          toast.error(`Validation errors: ${validationErrors}`);
        } else if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error('Failed to update user');
        }
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    async (id) => {
      const response = await axios.delete(`/api/admin/users/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User deactivated successfully!');
        queryClient.invalidateQueries('admin-users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to deactivate user');
      }
    }
  );

  // Suspend user mutation
  const suspendUserMutation = useMutation(
    async ({ id, reason, duration }) => {
      const response = await axios.post(`/api/admin/users/${id}/suspend`, { reason, duration });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User suspended successfully!');
        queryClient.invalidateQueries('admin-users');
        setShowModerationModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to suspend user');
      }
    }
  );

  // Ban user mutation
  const banUserMutation = useMutation(
    async ({ id, reason }) => {
      const response = await axios.post(`/api/admin/users/${id}/ban`, { reason });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User banned successfully!');
        queryClient.invalidateQueries('admin-users');
        setShowModerationModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to ban user');
      }
    }
  );

  // Lift suspension mutation
  const liftSuspensionMutation = useMutation(
    async (id) => {
      const response = await axios.post(`/api/admin/users/${id}/lift-suspension`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User suspension lifted successfully!');
        queryClient.invalidateQueries('admin-users');
        setShowModerationModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to lift suspension');
      }
    }
  );

  // Warn user mutation
  const warnUserMutation = useMutation(
    async ({ id, reason, description }) => {
      const response = await axios.post(`/api/admin/users/${id}/warn`, { reason, description });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Warning issued successfully!');
        queryClient.invalidateQueries('admin-users');
        setShowModerationModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to issue warning');
      }
    }
  );

  const handleSubmit = (formData) => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser._id,
        data: formData
      });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user) => {
    if (window.confirm(`Are you sure you want to deactivate "${user.name}"?`)) {
      deleteUserMutation.mutate(user._id);
    }
  };

  const handleModeration = (user, action) => {
    setSelectedUser(user);
    setModerationAction(action);
    setShowModerationModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'suspended': return AlertTriangle;
      case 'banned': return XCircle;
      case 'pending_verification': return Clock;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'suspended': return 'text-yellow-500';
      case 'banned': return 'text-red-500';
      case 'pending_verification': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-600';
      case 'admin': return 'bg-blue-600';
      case 'department': return 'bg-green-600';
      case 'worker': return 'bg-orange-600';
      case 'citizen': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const users = usersData?.users || [];
  const stats = usersData?.stats || {};
  const departments = departmentsData?.departments || [];

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-dark-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-dark-400">Manage user accounts, roles, and permissions</p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center space-x-2 mt-4 sm:mt-0"
          >
            <Plus size={20} />
            <span>Add User</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-primary-400" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeUsers || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Suspended</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.suspendedUsers || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Banned</p>
                <p className="text-2xl font-bold text-red-400">{stats.bannedUsers || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input"
            >
              <option value="">All Roles</option>
              <option value="citizen">Citizen</option>
              <option value="worker">Worker</option>
              <option value="department">Department</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
              <option value="pending_verification">Pending Verification</option>
            </select>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="input"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="lastLogin-desc">Last Active</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-dark-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-dark-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const StatusIcon = getStatusIcon(user.accountStatus);
                    return (
                      <tr key={user._id} className="hover:bg-dark-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">{user.name}</div>
                              <div className="text-sm text-dark-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getRoleColor(user.role)}`}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon size={16} className={`mr-2 ${getStatusColor(user.accountStatus)}`} />
                            <span className={`text-sm ${getStatusColor(user.accountStatus)}`}>
                              {user.accountStatus.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {user.department?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserDetails(true);
                              }}
                              className="text-blue-400 hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-yellow-400 hover:text-yellow-300"
                              title="Edit User"
                            >
                              <Edit2 size={16} />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="text-dark-400 hover:text-white"
                                title="More Actions"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {/* Dropdown menu would go here */}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
            <p className="text-dark-400 mb-6">Get started by creating your first user.</p>
            <button
              onClick={() => {
                setEditingUser(null);
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <Plus size={20} />
              <span>Add User</span>
            </button>
          </div>
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <UserModal
          user={editingUser}
          departments={departments}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={handleSubmit}
          isLoading={createUserMutation.isLoading || updateUserMutation.isLoading}
        />
      )}

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

      {/* Moderation Modal */}
      {showModerationModal && selectedUser && (
        <ModerationModal
          user={selectedUser}
          action={moderationAction}
          onClose={() => {
            setShowModerationModal(false);
            setSelectedUser(null);
            setModerationAction('');
          }}
          onSuspend={suspendUserMutation.mutate}
          onBan={banUserMutation.mutate}
          onLiftSuspension={liftSuspensionMutation.mutate}
          onWarn={warnUserMutation.mutate}
          isLoading={suspendUserMutation.isLoading || banUserMutation.isLoading || liftSuspensionMutation.isLoading || warnUserMutation.isLoading}
        />
      )}
    </div>
  );
};

// User Modal Component
const UserModal = ({ user, departments, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: user?.role || 'citizen',
    department: user?.department?._id || '',
    permissions: user?.permissions || [],
    location: {
      address: user?.location?.address || '',
      city: user?.location?.city || 'Ranchi',
      state: user?.location?.state || 'Jharkhand',
      coordinates: user?.location?.coordinates || [85.3316, 23.3441]
    },
    profile: {
      bio: user?.profile?.bio || '',
      occupation: user?.profile?.occupation || '',
      organization: user?.profile?.organization || ''
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const rolePermissions = {
    'citizen': ['report_issues', 'view_own_issues'],
    'worker': ['view_assigned_issues', 'update_issue_status'],
    'department': ['issue_management', 'view_assigned_issues', 'update_issue_status', 'assign_issues'],
    'admin': ['user_management', 'issue_management', 'department_management', 'analytics_access', 'moderation_tools', 'view_all_issues', 'assign_issues', 'manage_departments', 'delete_issues', 'ban_users', 'warn_users'],
    'super_admin': ['*']
  };

  const allPermissions = [
    'user_management', 'issue_management', 'department_management', 
    'analytics_access', 'system_settings', 'moderation_tools',
    'report_issues', 'view_own_issues', 'view_assigned_issues', 
    'update_issue_status', 'assign_issues', 'manage_departments', 
    'view_all_issues', 'delete_issues', 'ban_users', 'warn_users'
  ];

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: rolePermissions[role] || [],
      department: ['worker', 'department'].includes(role) ? prev.department : ''
    }));
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-2xl font-bold text-white">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input w-full"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input w-full"
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input w-full"
                placeholder="10-digit phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Password {!user && '*'}</label>
              <input
                type="password"
                required={!user}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="input w-full"
                placeholder={user ? "Leave blank to keep current" : "Password"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="input w-full"
                required
              >
                <option value="citizen">Citizen</option>
                <option value="worker">Worker</option>
                <option value="department">Department</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="input w-full"
                disabled={!['worker', 'department'].includes(formData.role)}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Permissions</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {allPermissions.map(permission => (
                <label key={permission} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    className="rounded border-dark-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-white">{permission.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-dark-700">
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
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (user ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
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
                  <label className="text-sm text-dark-400">Phone</label>
                  <p className="text-white">{user.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Role</label>
                  <p className="text-white">{user.role.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Department</label>
                  <p className="text-white">{user.department?.name || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Account Status</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-dark-400">Status</label>
                  <p className="text-white">{user.accountStatus.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Last Login</label>
                  <p className="text-white">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Created At</label>
                  <p className="text-white">{new Date(user.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">Login Count</label>
                  <p className="text-white">{user.activity?.loginCount || 0}</p>
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

// Moderation Modal Component
const ModerationModal = ({ user, action, onClose, onSuspend, onBan, onLiftSuspension, onWarn, isLoading }) => {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    duration: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    switch (action) {
      case 'suspend':
        onSuspend({ id: user._id, reason: formData.reason, duration: parseInt(formData.duration) });
        break;
      case 'ban':
        onBan({ id: user._id, reason: formData.reason });
        break;
      case 'lift':
        onLiftSuspension(user._id);
        break;
      case 'warn':
        onWarn({ id: user._id, reason: formData.reason, description: formData.description });
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-bold text-white">
            {action === 'suspend' && 'Suspend User'}
            {action === 'ban' && 'Ban User'}
            {action === 'lift' && 'Lift Suspension'}
            {action === 'warn' && 'Issue Warning'}
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

export default UserManagement;
