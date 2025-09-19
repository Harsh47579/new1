import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ThumbsUp, 
  MessageCircle,
  Eye
} from 'lucide-react';

const IssueCard = ({ issue, onClick, isSelected }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return AlertCircle;
      case 'in_progress': return Clock;
      case 'resolved': return CheckCircle;
      default: return MapPin;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-red-400';
      case 'in_progress': return 'text-yellow-400';
      case 'resolved': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const StatusIcon = getStatusIcon(issue.status);

  return (
    <div
      className={`card-hover p-4 cursor-pointer ${
        isSelected ? 'border-primary-500 bg-dark-700' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-medium text-sm line-clamp-2">
          {issue.title}
        </h3>
        <span className={`status-${issue.status} ml-2 flex-shrink-0`}>
          {issue.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center text-dark-400 text-xs mb-2">
        <MapPin size={12} className="mr-1" />
        <span className="truncate">{issue.location.address}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-dark-400 mb-3">
        <span>ID: {issue._id.slice(-6).toUpperCase()}</span>
        <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-dark-400">
          <div className="flex items-center">
            <ThumbsUp size={12} className="mr-1" />
            <span>{issue.upvoteCount || 0}</span>
          </div>
          <div className="flex items-center">
            <MessageCircle size={12} className="mr-1" />
            <span>{issue.commentCount || 0}</span>
          </div>
        </div>

        <Link
          to={`/issue/${issue._id}`}
          className="flex items-center text-primary-400 hover:text-primary-300 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye size={12} className="mr-1" />
          View
        </Link>
      </div>
    </div>
  );
};

export default IssueCard;
