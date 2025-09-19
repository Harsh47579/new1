import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Filter,
  Search,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminAnnouncements = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [filters, setFilters] = useState({
    audience: '',
    priority: '',
    status: '',
    search: ''
  });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'all',
    priority: 'medium',
    expiresAt: '',
    tags: ''
  });

  const queryClient = useQueryClient();

  // Fetch announcements
  const { data, isLoading, error } = useQuery(
    ['adminAnnouncements', filters],
    async () => {
      const params = new URLSearchParams();
      if (filters.audience) params.append('audience', filters.audience);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`/api/announcements?${params}&limit=50`);
      return response.data;
    }
  );

  // Create announcement mutation
  const createMutation = useMutation(
    async (data) => {
      // Convert data to FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('audience', data.audience);
      formData.append('priority', data.priority);
      if (data.expiresAt) {
        formData.append('expiresAt', data.expiresAt);
      }
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', data.tags.join(','));
      } else {
        formData.append('tags', '');
      }

      // Debug FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await axios.post('/api/announcements', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Announcement created successfully');
        setShowCreateModal(false);
        resetForm();
        queryClient.invalidateQueries('adminAnnouncements');
      },
      onError: (error) => {
        console.error('Create announcement error:', error);
        
        if (error.response?.data?.errors) {
          // Handle validation errors
          const errorMessages = error.response.data.errors.map(err => 
            `${err.field}: ${err.message}`
          ).join(', ');
          toast.error(`Validation failed: ${errorMessages}`);
        } else if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error('Failed to create announcement. Please try again.');
        }
      }
    }
  );

  // Update announcement mutation
  const updateMutation = useMutation(
    async ({ id, data }) => {
      // Convert data to FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('audience', data.audience);
      formData.append('priority', data.priority);
      if (data.expiresAt) {
        formData.append('expiresAt', data.expiresAt);
      }
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', data.tags.join(','));
      } else {
        formData.append('tags', '');
      }

      const response = await axios.put(`/api/announcements/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Announcement updated successfully');
        setEditingAnnouncement(null);
        resetForm();
        queryClient.invalidateQueries('adminAnnouncements');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update announcement');
      }
    }
  );

  // Delete announcement mutation
  const deleteMutation = useMutation(
    async (id) => {
      const response = await axios.delete(`/api/announcements/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Announcement deleted successfully');
        queryClient.invalidateQueries('adminAnnouncements');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete announcement');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      audience: 'all',
      priority: 'medium',
      expiresAt: '',
      tags: ''
    });
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      audience: announcement.audience,
      priority: announcement.priority,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : '',
      tags: announcement.tags.join(', ')
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
    };

    console.log('Submitting announcement data:', submitData);

    if (editingAnnouncement) {
      await updateMutation.mutateAsync({ id: editingAnnouncement._id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500/50 bg-red-500/10';
      case 'high':
        return 'border-orange-500/50 bg-orange-500/10';
      case 'medium':
        return 'border-blue-500/50 bg-blue-500/10';
      default:
        return 'border-green-500/50 bg-green-500/10';
    }
  };

  const getAudienceIcon = (audience) => {
    switch (audience) {
      case 'all':
        return <Users className="w-4 h-4" />;
      case 'citizens':
        return <Users className="w-4 h-4" />;
      case 'workers':
        return <Users className="w-4 h-4" />;
      case 'admins':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
          <span className="text-dark-300">Loading announcements...</span>
        </div>
      </div>
    );
  }

  const announcements = data?.data?.announcements || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Megaphone className="w-6 h-6 text-primary-500 mr-2" />
          <h2 className="text-xl font-semibold text-white">Announcements</h2>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Announcement
        </button>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filters.audience}
            onChange={(e) => setFilters(prev => ({ ...prev, audience: e.target.value }))}
            className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Audiences</option>
            <option value="all">All Users</option>
            <option value="citizens">Citizens</option>
            <option value="workers">Workers</option>
            <option value="admins">Admins</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📢</div>
            <h3 className="text-xl font-medium text-white mb-2">No Announcements</h3>
            <p className="text-dark-300">Create your first announcement to get started!</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement._id}
              className={`bg-dark-800 rounded-lg border p-6 ${getPriorityColor(announcement.priority)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {getPriorityIcon(announcement.priority)}
                  <div>
                    <h3 className="text-white font-medium text-lg">{announcement.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-dark-300 mt-1">
                      <span className="flex items-center">
                        {getAudienceIcon(announcement.audience)}
                        <span className="ml-1 capitalize">{announcement.audience}</span>
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {announcement.readCount || 0} reads
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 text-dark-300 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement._id)}
                    className="p-2 text-dark-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-white/80 mb-4">{announcement.content}</p>

              {announcement.tags && announcement.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {announcement.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white/10 text-white text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-dark-300">
                  <span>By: {announcement.author?.name}</span>
                  {announcement.expiresAt && (
                    <span className="ml-4">
                      Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    announcement.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {announcement.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg border border-dark-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-dark-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-dark-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter announcement title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    placeholder="Enter announcement content"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Audience *</label>
                    <select
                      value={formData.audience}
                      onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="all">All Users</option>
                      <option value="citizens">Citizens</option>
                      <option value="workers">Workers</option>
                      <option value="admins">Admins</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Priority *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Expiration Date</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center"
                >
                  {(createMutation.isLoading || updateMutation.isLoading) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingAnnouncement ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
