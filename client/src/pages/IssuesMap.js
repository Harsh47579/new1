import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from 'react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import { 
  MapPin, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  X, 
  Eye,
  Calendar,
  User,
  ThumbsUp,
  MessageCircle,
  ChevronRight,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import axios from 'axios';
import L from 'leaflet';
import useGeolocation from '../hooks/useGeolocation';
import { MAPS_CONFIG } from '../config/maps';

const IssuesMap = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [hoveredIssue, setHoveredIssue] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef(null);
  const listRef = useRef(null);

  // Use the improved geolocation hook
  const {
    location: userLocation,
    isLoading: isLocationLoading,
    hasUserLocation,
    retryLocation
  } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    showToast: false,
    requireLocation: false
  });

  // Convert location to array format for Leaflet
  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : [MAPS_CONFIG.DEFAULT_LOCATION.lat, MAPS_CONFIG.DEFAULT_LOCATION.lng];

  // Fetch issues with optimized payload
  const { data: issuesData, isLoading } = useQuery(
    ['issues', selectedFilter, searchQuery],
    async () => {
      const params = new URLSearchParams();
      if (selectedFilter !== 'all') params.append('status', selectedFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (userLocation) {
        params.append('nearby', 'true');
        params.append('lat', userLocation[0]);
        params.append('lng', userLocation[1]);
      }
      // Request only essential fields for map and list
      params.append('fields', '_id,title,status,category,createdAt,location.coordinates,priority,upvoteCount,commentCount');
      
      const response = await axios.get(`/api/issues?${params.toString()}`);
      return response.data;
    },
    {
      retry: 2,
      staleTime: 30000,
      cacheTime: 300000
    }
  );

  const issues = issuesData?.issues || [];
  const filteredIssues = issues.filter(issue => 
    !searchQuery || 
    issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    issue._id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Utility functions
  const getMarkerColor = (status) => {
    switch (status) {
      case 'new': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return AlertCircle;
      case 'in_progress': return Clock;
      case 'resolved': return CheckCircle;
      default: return MapPin;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'new': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  // Event handlers
  const handleIssueClick = useCallback((issue) => {
    setSelectedIssue(issue);
    setHoveredIssue(null);
    
    // Center map on selected issue
    if (mapRef.current) {
      mapRef.current.setView([issue.location.coordinates[1], issue.location.coordinates[0]], 15);
    }
    
    // Scroll to issue in list
    if (listRef.current) {
      const issueElement = listRef.current.querySelector(`[data-issue-id="${issue._id}"]`);
      if (issueElement) {
        issueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  const handleMarkerHover = useCallback((issue) => {
    setHoveredIssue(issue);
  }, []);

  const handleMarkerLeave = useCallback(() => {
    setHoveredIssue(null);
  }, []);

  const handleCardHover = useCallback((issue) => {
    setHoveredIssue(issue);
  }, []);

  const handleCardLeave = useCallback(() => {
    setHoveredIssue(null);
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const resetMapView = () => {
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, 13);
    }
  };

  // Filter options
  const filters = [
    { value: 'all', label: 'All Issues', count: issuesData?.pagination?.total || 0, color: 'bg-gray-500' },
    { value: 'new', label: 'New', count: issues.filter(i => i.status === 'new').length, color: 'bg-red-500' },
    { value: 'in_progress', label: 'In Progress', count: issues.filter(i => i.status === 'in_progress').length, color: 'bg-yellow-500' },
    { value: 'resolved', label: 'Resolved', count: issues.filter(i => i.status === 'resolved').length, color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="flex h-screen">
        {/* Main Map Panel */}
        <div className="flex-1 relative">
          {/* Map Controls Overlay */}
          <div className="absolute top-4 left-4 z-10 space-y-3">
            {/* Header */}
            <div className="bg-dark-800/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-dark-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-xl flex items-center">
                  <MapPin size={24} className="mr-3 text-primary-400" />
                  Issues Map
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg transition-colors ${
                      showFilters ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    <Filter size={18} />
                  </button>
                  <button
                    onClick={resetMapView}
                    className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors"
                    title="Reset View"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search issues by title or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-dark-800/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-dark-700">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Layers size={18} className="mr-2" />
                  Filter by Status
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setSelectedFilter(filter.value)}
                      className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedFilter === filter.value
                          ? 'bg-primary-600 text-white shadow-lg scale-105'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:scale-102'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{filter.label}</span>
                        <div className={`w-2 h-2 rounded-full ${filter.color}`}></div>
                      </div>
                      <div className="text-xs opacity-75 mt-1">{filter.count} issues</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Map Stats */}
            <div className="bg-dark-800/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-dark-700">
              <div className="text-sm text-dark-300">
                <div className="flex items-center justify-between mb-2">
                  <span>Total Issues</span>
                  <span className="text-white font-semibold">{filteredIssues.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Map Zoom</span>
                  <span className="text-white font-semibold">{mapZoom}x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="h-full w-full">
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="h-full w-full"
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {filteredIssues.map((issue) => {
                const StatusIcon = getStatusIcon(issue.status);
                const isHovered = hoveredIssue?._id === issue._id;
                const isSelected = selectedIssue?._id === issue._id;
                
                return (
                  <CircleMarker
                    key={issue._id}
                    center={[issue.location.coordinates[1], issue.location.coordinates[0]]}
                    radius={isSelected ? 12 : isHovered ? 10 : 8}
                    pathOptions={{
                      fillColor: getMarkerColor(issue.status),
                      color: isSelected ? '#ffffff' : '#000000',
                      weight: isSelected ? 3 : 2,
                      opacity: isSelected ? 1 : 0.8,
                      fillOpacity: isSelected ? 0.9 : isHovered ? 0.8 : 0.7
                    }}
                    eventHandlers={{
                      click: () => handleIssueClick(issue),
                      mouseover: () => handleMarkerHover(issue),
                      mouseout: handleMarkerLeave
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-3 min-w-[200px]">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-sm text-gray-900 line-clamp-2">
                            {issue.title}
                          </h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(issue.status)}`}>
                            {issue.status.replace('_', ' ')}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{issue.category}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>ID: {issue._id.slice(-6).toUpperCase()}</span>
                          <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => handleIssueClick(issue)}
                          className="w-full mt-2 px-3 py-1 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Issues List Panel */}
        <div className="w-96 bg-dark-800 border-l border-dark-700 flex flex-col">
          {/* List Header */}
          <div className="p-4 border-b border-dark-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-lg">
                Issues List
              </h3>
              <div className="text-sm text-dark-400">
                {filteredIssues.length} of {issues.length}
              </div>
            </div>
            {searchQuery && (
              <div className="text-sm text-primary-400">
                Showing results for "{searchQuery}"
              </div>
            )}
          </div>
          
          {/* Issues List */}
          <div className="flex-1 overflow-y-auto" ref={listRef}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="loading-spinner mb-4"></div>
                  <p className="text-dark-400">Loading issues...</p>
                </div>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <MapPin size={48} className="mx-auto mb-4 text-dark-600" />
                  <h3 className="text-lg font-medium text-white mb-2">No Issues Found</h3>
                  <p className="text-dark-400">
                    {searchQuery ? 'Try adjusting your search terms' : 'No issues match the current filter'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredIssues.map((issue) => {
                  const StatusIcon = getStatusIcon(issue.status);
                  const isHovered = hoveredIssue?._id === issue._id;
                  const isSelected = selectedIssue?._id === issue._id;
                  
                  return (
                    <div
                      key={issue._id}
                      data-issue-id={issue._id}
                      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'bg-primary-600/20 border-primary-500/50 shadow-lg scale-[1.02]' 
                          : isHovered
                          ? 'bg-dark-700 border-dark-600 shadow-md scale-[1.01]'
                          : 'bg-dark-800 border-dark-700 hover:bg-dark-700 hover:border-dark-600'
                      }`}
                      onClick={() => handleIssueClick(issue)}
                      onMouseEnter={() => handleCardHover(issue)}
                      onMouseLeave={handleCardLeave}
                    >
                      {/* Status Indicator */}
                      <div className="absolute top-3 right-3">
                        <div className={`w-3 h-3 rounded-full ${getMarkerColor(issue.status)}`}></div>
                      </div>
                      
                      {/* Issue Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-8">
                          <h4 className="text-white font-semibold text-sm line-clamp-2 mb-1">
                            {issue.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-dark-400">
                            <span>ID: {issue._id.slice(-6).toUpperCase()}</span>
                            <span>•</span>
                            <span className={getPriorityColor(issue.priority)}>
                              {issue.priority || 'medium'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Issue Details */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(issue.status)}`}>
                            <StatusIcon size={12} className="inline mr-1" />
                            {issue.status.replace('_', ' ')}
                          </div>
                          <span className="text-xs text-dark-400">
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="text-xs text-dark-400">
                          {issue.category}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-dark-400">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              <ThumbsUp size={12} className="mr-1" />
                              <span>{issue.upvoteCount || 0}</span>
                            </div>
                            <div className="flex items-center">
                              <MessageCircle size={12} className="mr-1" />
                              <span>{issue.commentCount || 0}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-dark-500 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-dark-700">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2 line-clamp-2">
                    {selectedIssue.title}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(selectedIssue.status)}`}>
                      {(() => {
                        const StatusIcon = getStatusIcon(selectedIssue.status);
                        return <StatusIcon size={16} className="inline mr-2" />;
                      })()}
                      {selectedIssue.status.replace('_', ' ')}
                    </div>
                    <span className="text-dark-400 text-sm">
                      {selectedIssue.category}
                    </span>
                    <span className={`text-sm font-medium ${getPriorityColor(selectedIssue.priority)}`}>
                      {selectedIssue.priority || 'medium'} priority
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white hover:bg-dark-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <p className="text-dark-300 leading-relaxed">{selectedIssue.description}</p>
                </div>
                
                {/* Issue Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center">
                      <MapPin size={16} className="mr-2" />
                      Location
                    </h4>
                    <p className="text-dark-300 text-sm">{selectedIssue.location.address}</p>
                  </div>
                  
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center">
                      <Calendar size={16} className="mr-2" />
                      Reported
                    </h4>
                    <p className="text-dark-300 text-sm">
                      {new Date(selectedIssue.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center">
                      <User size={16} className="mr-2" />
                      Issue ID
                    </h4>
                    <p className="text-dark-300 text-sm font-mono">{selectedIssue._id}</p>
                  </div>
                  
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center">
                      <ThumbsUp size={16} className="mr-2" />
                      Engagement
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-dark-300">
                      <span>{selectedIssue.upvoteCount || 0} upvotes</span>
                      <span>•</span>
                      <span>{selectedIssue.commentCount || 0} comments</span>
                    </div>
                  </div>
                </div>
                
                {/* Media Gallery */}
                {selectedIssue.media && selectedIssue.media.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Attachments</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedIssue.media.map((media, index) => (
                        <div key={index} className="bg-dark-700/50 rounded-lg p-3">
                          {media.type === 'image' ? (
                            <img
                              src={media.url}
                              alt="Issue media"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-32 bg-dark-600 rounded-lg flex items-center justify-center">
                              <span className="text-dark-400 text-sm">
                                {media.type === 'video' ? '📹 Video' : '🎵 Audio'}
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-dark-400 mt-2 truncate">{media.filename}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-dark-700">
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Navigate to full issue detail page
                    window.open(`/issue/${selectedIssue._id}`, '_blank');
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                >
                  <Eye size={16} className="mr-2" />
                  View Full Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssuesMap;
