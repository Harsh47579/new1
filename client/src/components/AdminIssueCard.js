import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Building2,
  ThumbsUp,
  MessageCircle,
  Eye,
  Edit,
  MoreVertical,
  Calendar,
  Flag
} from 'lucide-react';
import TaskManagement from './TaskManagement';

const AdminIssueCard = ({ issue, onUpdate }) => {
  const [showActions, setShowActions] = useState(false);
  const [showTaskManagement, setShowTaskManagement] = useState(false);

  // Safety check for issue data
  if (!issue) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="text-center text-gray-500">No issue data available</div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return AlertCircle;
      case 'in_progress': return Clock;
      case 'resolved': return CheckCircle;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-red-400';
      case 'in_progress': return 'text-yellow-400';
      case 'resolved': return 'text-green-400';
      case 'closed': return 'text-gray-400';
      case 'rejected': return 'text-red-600';
      default: return 'text-blue-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'text-blue-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const StatusIcon = getStatusIcon(issue.status);

  return (
    <div className="card hover:border-primary-500 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {issue.title}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-dark-400 mb-2">
            <span className="flex items-center">
              <Calendar size={14} className="mr-1" />
              {new Date(issue.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center">
              <MapPin size={14} className="mr-1" />
              {issue.location?.address || 'Location not specified'}
            </span>
            <span>ID: {issue._id?.slice(-6).toUpperCase() || 'N/A'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`status-${issue.status || 'unknown'}`}>
            {(issue.status || 'unknown').replace('_', ' ')}
          </span>
          {issue.priority && (
            <span className={`priority-${issue.priority}`}>
              {issue.priority}
            </span>
          )}
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-dark-400 hover:text-white transition-colors"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      <p className="text-dark-300 mb-4 line-clamp-2">
        {issue.description}
      </p>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4 text-sm text-dark-400">
          <span className="flex items-center">
            <User size={14} className="mr-1" />
            {issue.reporter?.name || 'Anonymous'}
          </span>
          <span className="flex items-center">
            <ThumbsUp size={14} className="mr-1" />
            {issue.upvoteCount || 0}
          </span>
          <span className="flex items-center">
            <MessageCircle size={14} className="mr-1" />
            {issue.commentCount || 0}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-dark-400">
            {issue.category}
          </span>
        </div>
      </div>

      {/* Assignment Info */}
      {issue.assignedTo && (
        <div className="bg-dark-700 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 size={16} className="text-primary-400" />
              <span className="text-white font-medium">
                {issue.assignedTo.department}
              </span>
              {issue.assignedTo.officer && (
                <>
                  <span className="text-dark-400">•</span>
                  <span className="text-dark-300">
                    {issue.assignedTo.officer.name}
                  </span>
                </>
              )}
            </div>
            <span className="text-dark-400 text-sm">
              Assigned: {new Date(issue.assignedTo.assignedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Progress Bar for In Progress Issues */}
      {issue.status === 'in_progress' && issue.estimatedResolution && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-dark-400 mb-1">
            <span>Progress</span>
            <span>Est. Resolution: {new Date(issue.estimatedResolution).toLocaleDateString()}</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowTaskManagement(true)}
            className="btn-outline text-sm flex items-center space-x-1"
          >
            <Eye size={14} />
            <span>Manage</span>
          </button>
          <button 
            onClick={() => setShowTaskManagement(true)}
            className="btn-outline text-sm flex items-center space-x-1"
          >
            <Edit size={14} />
            <span>Edit</span>
          </button>
          <button 
            onClick={() => setShowTaskManagement(true)}
            className="btn-outline text-sm flex items-center space-x-1"
          >
            <Flag size={14} />
            <span>Assign</span>
          </button>
        </div>

        <div className="text-sm text-dark-400">
          Last updated: {new Date(issue.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Dropdown Actions */}
      {showActions && (
        <div className="absolute right-4 top-16 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-10 min-w-48">
          <div className="py-2">
            <button className="w-full text-left px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors">
              Mark as In Progress
            </button>
            <button className="w-full text-left px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors">
              Mark as Resolved
            </button>
            <button className="w-full text-left px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors">
              Reject Issue
            </button>
            <hr className="border-dark-700 my-1" />
            <button className="w-full text-left px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors">
              Add Note
            </button>
            <button className="w-full text-left px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors">
              Contact Reporter
            </button>
            <hr className="border-dark-700 my-1" />
            <button className="w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-dark-700 transition-colors">
              Delete Issue
            </button>
          </div>
        </div>
      )}

      {/* Task Management Modal */}
      {showTaskManagement && (
        <TaskManagement
          issue={issue}
          onClose={() => setShowTaskManagement(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default AdminIssueCard;
