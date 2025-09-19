import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  ThumbsUp, 
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Camera,
  Play,
  Mic,
  Send,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import IssueAssignment from '../components/IssueAssignment';
import axios from 'axios';
import toast from 'react-hot-toast';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { joinIssue, leaveIssue } = useSocket();
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch issue details
  const { data: issueData, isLoading } = useQuery(
    ['issue', id],
    async () => {
      const response = await axios.get(`/api/issues/${id}`);
      return response.data.issue;
    }
  );

  // Join issue room for real-time updates
  React.useEffect(() => {
    if (issueData) {
      joinIssue(issueData._id);
      return () => leaveIssue(issueData._id);
    }
  }, [issueData, joinIssue, leaveIssue]);

  // Upvote mutation
  const upvoteMutation = useMutation(
    () => axios.put(`/api/issues/${id}/upvote`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['issue', id]);
        toast.success('Issue upvoted!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to upvote');
      }
    }
  );

  // Confirm mutation
  const confirmMutation = useMutation(
    () => axios.put(`/api/issues/${id}/confirm`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['issue', id]);
        toast.success('Issue confirmed!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to confirm');
      }
    }
  );

  // Add comment mutation
  const commentMutation = useMutation(
    (comment) => axios.post(`/api/issues/${id}/comments`, { text: comment }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['issue', id]);
        setNewComment('');
        setIsCommenting(false);
        toast.success('Comment added!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add comment');
        setIsCommenting(false);
      }
    }
  );

  const handleUpvote = () => {
    if (!isAuthenticated) {
      toast.error('Please login to upvote');
      return;
    }
    upvoteMutation.mutate();
  };

  const handleConfirm = () => {
    if (!isAuthenticated) {
      toast.error('Please login to confirm');
      return;
    }
    confirmMutation.mutate();
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to comment');
      return;
    }
    if (!newComment.trim()) return;
    
    setIsCommenting(true);
    commentMutation.mutate(newComment);
  };

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
      default: return 'text-blue-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!issueData) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={64} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Issue Not Found</h2>
          <p className="text-dark-300 mb-6">The issue you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(issueData.status);
  const isUpvoted = issueData.community?.upvotes?.some(
    upvote => upvote.user._id === user?.id
  );
  const isConfirmed = issueData.community?.confirmations?.some(
    conf => conf.user._id === user?.id
  );

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-dark-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        {/* Issue Header */}
        <div className="card mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {issueData.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-dark-400 mb-4">
                <span>ID: {issueData._id.slice(-6).toUpperCase()}</span>
                <span className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {new Date(issueData.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <MapPin size={14} className="mr-1" />
                  {issueData.location.address}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`status-${issueData.status}`}>
                {issueData.status.replace('_', ' ')}
              </span>
              {issueData.priority && (
                <span className={`priority-${issueData.priority}`}>
                  {issueData.priority}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <StatusIcon size={20} className={getStatusColor(issueData.status)} />
                <span className="text-dark-300">{issueData.category}</span>
              </div>
              {issueData.assignedTo && (
                <div className="text-sm text-dark-400">
                  Assigned to: <span className="text-white">{issueData.assignedTo.department}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleUpvote}
                disabled={upvoteMutation.isLoading}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                  isUpvoted
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                <ThumbsUp size={16} />
                <span>{issueData.upvoteCount || 0}</span>
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isLoading}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                  isConfirmed
                    ? 'bg-green-600 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                <CheckCircle size={16} />
                <span>{issueData.confirmationCount || 0}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Issue Description */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Description</h2>
          <p className="text-dark-300 leading-relaxed">
            {issueData.description}
          </p>
        </div>

        {/* Media Files */}
        {issueData.media && issueData.media.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Media</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issueData.media.map((media, index) => (
                <div key={index} className="bg-dark-700 rounded-lg overflow-hidden">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt="Issue media"
                      className="w-full h-48 object-cover"
                    />
                  ) : media.type === 'video' ? (
                    <div className="w-full h-48 bg-dark-600 flex items-center justify-center">
                      <Play size={48} className="text-dark-400" />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-dark-600 flex items-center justify-center">
                      <Mic size={48} className="text-dark-400" />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between text-sm text-dark-400">
                      <span className="flex items-center">
                        {media.type === 'image' ? <Camera size={14} className="mr-1" /> :
                         media.type === 'video' ? <Play size={14} className="mr-1" /> :
                         <Mic size={14} className="mr-1" />}
                        {media.type}
                      </span>
                      <span>{(media.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issue Assignment - Admin Only */}
        {user?.role === 'admin' && (
          <div className="mb-6">
            <IssueAssignment 
              issue={issueData} 
              onAssignmentChange={(updatedIssue) => {
                // Update the issue data in the query cache
                queryClient.setQueryData(['issue', id], { issue: updatedIssue });
              }}
            />
          </div>
        )}

        {/* Timeline */}
        {issueData.timeline && issueData.timeline.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Timeline</h2>
            <div className="space-y-4">
              {issueData.timeline.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">
                        {event.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-dark-400 text-sm">
                        {new Date(event.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-dark-300 text-sm">{event.description}</p>
                    )}
                    {event.updatedBy && (
                      <p className="text-dark-400 text-xs mt-1">
                        Updated by: {event.updatedBy.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">
            Comments ({issueData.commentCount || 0})
          </h2>

          {/* Add Comment Form */}
          {isAuthenticated && (
            <form onSubmit={handleComment} className="mb-6">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="input flex-1"
                  disabled={isCommenting}
                />
                <button
                  type="submit"
                  disabled={isCommenting || !newComment.trim()}
                  className="btn-primary flex items-center space-x-1"
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {issueData.community?.comments?.length === 0 ? (
              <p className="text-dark-400 text-center py-4">No comments yet</p>
            ) : (
              issueData.community?.comments?.map((comment, index) => (
                <div key={index} className="bg-dark-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <User size={16} className="text-dark-400" />
                    <span className="font-medium text-white">{comment.user.name}</span>
                    <span className="text-dark-400 text-sm">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-dark-300">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;
