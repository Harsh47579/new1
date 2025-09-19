import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  User, 
  Building2, 
  Calendar,
  MessageSquare,
  Flag,
  Save,
  X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const TaskManagement = ({ issue, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: issue.status || 'new',
    priority: issue.priority || 'medium',
    department: issue.assignedTo?.department || '',
    officer: issue.assignedTo?.officer?._id || '',
    estimatedResolution: issue.estimatedResolution || '',
    notes: '',
    resolution: {
      description: issue.resolution?.description || '',
      beforeImages: issue.resolution?.beforeImages || [],
      afterImages: issue.resolution?.afterImages || []
    }
  });

  const queryClient = useQueryClient();

  const updateIssueMutation = useMutation(
    (data) => axios.put(`/api/admin/issues/${issue._id}/status`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['adminIssues']);
        queryClient.invalidateQueries(['issue', issue._id]);
        toast.success('Issue updated successfully');
        onUpdate?.();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update issue');
      }
    }
  );

  const assignIssueMutation = useMutation(
    (data) => axios.put(`/api/admin/issues/${issue._id}/assign`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['adminIssues']);
        queryClient.invalidateQueries(['issue', issue._id]);
        toast.success('Issue assigned successfully');
        onUpdate?.();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to assign issue');
      }
    }
  );

  const handleStatusChange = (newStatus) => {
    const statusMessages = {
      'in_progress': 'Issue is now being worked on',
      'resolved': 'Issue has been resolved',
      'closed': 'Issue has been closed',
      'rejected': 'Issue has been rejected'
    };

    updateIssueMutation.mutate({
      status: newStatus,
      description: statusMessages[newStatus] || `Status changed to ${newStatus}`,
      resolution: newStatus === 'resolved' ? formData.resolution : undefined
    });
  };

  const handleAssign = () => {
    if (!formData.department) {
      toast.error('Please select a department');
      return;
    }

    assignIssueMutation.mutate({
      department: formData.department,
      officer: formData.officer || null,
      priority: formData.priority,
      estimatedResolution: formData.estimatedResolution,
      notes: formData.notes
    });
  };

  const handleSave = () => {
    updateIssueMutation.mutate({
      status: formData.status,
      description: formData.notes,
      resolution: formData.status === 'resolved' ? formData.resolution : undefined
    });
    setIsEditing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return Flag;
      case 'in_progress': return Clock;
      case 'resolved': return CheckCircle;
      case 'rejected': return XCircle;
      default: return Flag;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-blue-400';
      case 'in_progress': return 'text-yellow-400';
      case 'resolved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const StatusIcon = getStatusIcon(issue.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{issue.title}</h2>
              <div className="flex items-center space-x-4 text-sm text-dark-400">
                <span>ID: {issue._id.slice(-6).toUpperCase()}</span>
                <span className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {new Date(issue.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <User size={14} className="mr-1" />
                  {issue.reporter?.name || 'Anonymous'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Current Status */}
          <div className="bg-dark-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <StatusIcon size={24} className={getStatusColor(issue.status)} />
                <div>
                  <h3 className="text-white font-medium">Current Status</h3>
                  <p className="text-dark-300 capitalize">{issue.status.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`priority-${issue.priority}`}>
                  {issue.priority}
                </span>
                {issue.assignedTo && (
                  <span className="text-dark-400 text-sm">
                    {issue.assignedTo.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => handleStatusChange('in_progress')}
              disabled={updateIssueMutation.isLoading}
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <Clock size={16} />
              <span>Start Work</span>
            </button>
            <button
              onClick={() => handleStatusChange('resolved')}
              disabled={updateIssueMutation.isLoading}
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <CheckCircle size={16} />
              <span>Resolve</span>
            </button>
            <button
              onClick={() => handleStatusChange('rejected')}
              disabled={updateIssueMutation.isLoading}
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <XCircle size={16} />
              <span>Reject</span>
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-primary flex items-center justify-center space-x-2"
            >
              <MessageSquare size={16} />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Issue Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                <p className="text-dark-300 bg-dark-700 rounded-lg p-4">
                  {issue.description}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Location</h3>
                <div className="bg-dark-700 rounded-lg p-4">
                  {issue.location ? (
                    <>
                      <p className="text-dark-300">{issue.location.address}</p>
                      <p className="text-dark-400 text-sm mt-1">
                        {issue.location.city}, {issue.location.state}
                      </p>
                    </>
                  ) : (
                    <p className="text-dark-400">Location not available</p>
                  )}
                </div>
              </div>

              {/* Media Files */}
              {issue.media && issue.media.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Media</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {issue.media.map((media, index) => (
                      <div key={index} className="bg-dark-700 rounded-lg p-2">
                        {media.type === 'image' ? (
                          <img
                            src={media.url}
                            alt="Issue media"
                            className="w-full h-24 object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-24 bg-dark-600 rounded flex items-center justify-center">
                            <span className="text-dark-400 text-sm">
                              {media.type === 'video' ? 'Video' : 'Audio'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Assignment Form */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Assignment</h3>
                <div className="bg-dark-700 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="input"
                    >
                      <option value="">Select Department</option>
                      <option value="Public Works">Public Works</option>
                      <option value="Sanitation">Sanitation</option>
                      <option value="Water Board">Water Board</option>
                      <option value="Traffic Police">Traffic Police</option>
                      <option value="Municipal Corporation">Municipal Corporation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Estimated Resolution
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.estimatedResolution}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedResolution: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <button
                    onClick={handleAssign}
                    disabled={assignIssueMutation.isLoading}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <Flag size={16} />
                    <span>Assign Issue</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Notes</h3>
                <div className="bg-dark-700 rounded-lg p-4">
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add private notes about this issue..."
                    className="textarea w-full h-24"
                  />
                </div>
              </div>

              {/* Resolution Details (for resolved issues) */}
              {issue.status === 'resolved' && issue.resolution && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Resolution</h3>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-dark-300">{issue.resolution.description}</p>
                    <p className="text-dark-400 text-sm mt-2">
                      Resolved on: {new Date(issue.resolution.resolvedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-dark-700">
            <button
              onClick={onClose}
              className="btn-outline"
            >
              Close
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={updateIssueMutation.isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
