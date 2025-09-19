import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  MapPin,
  Camera,
  MessageSquare,
  ThumbsUp,
  Eye,
  Calendar,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

const MyReportsTimeline = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Fetch user reports
  const { data: reportsData, isLoading, error, refetch } = useQuery(
    ['user-reports', searchTerm, statusFilter, sortBy, sortOrder, page],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page);
      params.append('limit', 10);
      
      const response = await axios.get(`/api/user/reports?${params.toString()}`);
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000 // 30 seconds
    }
  );

  // Set up Socket.IO listeners for real-time updates
  useEffect(() => {
    if (socket) {
      const handleIssueUpdate = (data) => {
        console.log('Issue update received in timeline:', data);
        
        // Update the specific issue in the query cache
        queryClient.setQueryData(['user-reports', searchTerm, statusFilter, sortBy, sortOrder, page], (oldData) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            reports: oldData.reports.map(report => 
              report._id === data.issueId 
                ? { 
                    ...report, 
                    status: data.status, 
                    updatedAt: data.updatedAt,
                    timeline: data.timeline || report.timeline
                  }
                : report
            )
          };
        });
      };

      socket.on('issue_update', handleIssueUpdate);

      return () => {
        socket.off('issue_update', handleIssueUpdate);
      };
    }
  }, [socket, queryClient, searchTerm, statusFilter, sortBy, sortOrder, page]);

  const reports = reportsData?.reports || [];
  const stats = reportsData?.stats || {};
  const pagination = reportsData?.pagination || {};

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return Clock;
      case 'in_progress': return AlertCircle;
      case 'resolved': return CheckCircle;
      case 'closed': return CheckCircle;
      case 'rejected': return XCircle;
      default: return FileText;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-blue-400 bg-blue-900/20';
      case 'in_progress': return 'text-yellow-400 bg-yellow-900/20';
      case 'resolved': return 'text-green-400 bg-green-900/20';
      case 'closed': return 'text-green-400 bg-green-900/20';
      case 'rejected': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const handleReportClick = (reportId) => {
    navigate(`/issue/${reportId}`);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Reports</h3>
        <p className="text-dark-400 mb-4">{error.message}</p>
        <button onClick={handleRefresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">My Reports</h2>
          <p className="text-dark-400">Track the status of your submitted issues</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center space-x-2 text-primary-400 hover:text-primary-300 transition-colors"
        >
          <RefreshCw size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Total Reports</p>
              <p className="text-2xl font-bold text-white">{stats.totalReports || 0}</p>
            </div>
            <FileText className="w-8 h-8 text-primary-400" />
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Resolved</p>
              <p className="text-2xl font-bold text-green-400">{stats.resolvedReports || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Community Score</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.communityScore || 0}</p>
            </div>
            <ThumbsUp className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Points Earned</p>
              <p className="text-2xl font-bold text-purple-400">{stats.points || 0}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
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
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="status-asc">Status A-Z</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setSortBy('createdAt');
              setSortOrder('desc');
            }}
            className="btn-outline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Reports Found</h3>
            <p className="text-dark-400 mb-6">
              {searchTerm || statusFilter 
                ? 'No reports match your current filters.' 
                : 'You haven\'t submitted any reports yet.'
              }
            </p>
            <button
              onClick={() => navigate('/report')}
              className="btn-primary"
            >
              Report Your First Issue
            </button>
          </div>
        ) : (
          reports.map((report) => {
            const StatusIcon = getStatusIcon(report.status);
            const lastUpdate = report.timeline?.[report.timeline.length - 1];
            
            return (
              <div
                key={report._id}
                onClick={() => handleReportClick(report._id)}
                className="bg-dark-800 rounded-lg p-6 hover:bg-dark-700 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{report.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(report.priority)}`}>
                        {report.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-dark-300 text-sm mb-3 line-clamp-2">{report.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-dark-400">
                      <div className="flex items-center space-x-1">
                        <MapPin size={14} />
                        <span>{report.location?.address || 'Location not specified'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      {report.media?.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Camera size={14} />
                          <span>{report.media.length} photo(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <StatusIcon size={20} className={getStatusColor(report.status).split(' ')[0]} />
                    <Eye size={16} className="text-dark-400" />
                  </div>
                </div>

                {/* Timeline Preview */}
                {lastUpdate && (
                  <div className="border-t border-dark-700 pt-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{lastUpdate.description}</p>
                        <p className="text-dark-400 text-xs">
                          {new Date(lastUpdate.timestamp || report.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Community Stats */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
                  <div className="flex items-center space-x-4 text-sm text-dark-400">
                    <div className="flex items-center space-x-1">
                      <ThumbsUp size={14} />
                      <span>{report.community?.upvotes?.length || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle size={14} />
                      <span>{report.community?.confirmations?.length || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare size={14} />
                      <span>{report.community?.comments?.length || 0}</span>
                    </div>
                  </div>
                  <div className="text-sm text-dark-400">
                    {report.assignedTo?.department?.name && (
                      <span>Assigned to {report.assignedTo.department.name}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-dark-400 text-sm">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MyReportsTimeline;
