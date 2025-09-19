import React, { useState, useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

const MapComponent = ({ issues, onIssueSelect, selectedIssue }) => {
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 23.3441, lng: 85.3096 }, // Ranchi coordinates
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(newMap);
    }
  }, [map]);

  useEffect(() => {
    if (map && issues) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add markers for each issue
      issues.forEach(issue => {
        if (issue.location && issue.location.coordinates) {
          const [lng, lat] = issue.location.coordinates;
          
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: issue.title,
            icon: {
              url: getMarkerIcon(issue.status, issue.priority),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 32)
            }
          });

          // Add click listener
          marker.addListener('click', () => {
            onIssueSelect(issue);
          });

          markersRef.current.push(marker);
        }
      });

      // Fit map to show all markers
      if (issues.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        issues.forEach(issue => {
          if (issue.location && issue.location.coordinates) {
            const [lng, lat] = issue.location.coordinates;
            bounds.extend({ lat, lng });
          }
        });
        map.fitBounds(bounds);
      }
    }
  }, [map, issues, onIssueSelect]);

  const getMarkerIcon = (status, priority) => {
    const colors = {
      'new': '#3B82F6',      // Blue
      'in_progress': '#F59E0B', // Yellow
      'resolved': '#10B981',   // Green
      'closed': '#6B7280'     // Gray
    };

    const priorityColors = {
      'low': '#10B981',       // Green
      'medium': '#F59E0B',    // Yellow
      'high': '#EF4444',      // Red
      'urgent': '#DC2626'     // Dark Red
    };

    const color = priority === 'urgent' || priority === 'high' ? priorityColors[priority] : colors[status];
    
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="4" fill="white"/>
      </svg>
    `)}`;
  };

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
};

const IssueDetails = ({ issue, onClose }) => {
  if (!issue) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed': return <X className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-red-500 bg-red-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-dark-800 rounded-lg shadow-xl border border-dark-600 z-10">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon(issue.status)}
            <h3 className="font-semibold text-white text-sm">{issue.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-dark-300">Category:</span>
            <span className="text-white">{issue.category}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-dark-300">Priority:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
              {issue.priority}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-dark-300">Status:</span>
            <span className="text-white capitalize">{issue.status.replace('_', ' ')}</span>
          </div>

          {issue.location && issue.location.address && (
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
              <span className="text-dark-300 text-xs">{issue.location.address}</span>
            </div>
          )}

          <div className="pt-2 border-t border-dark-600">
            <p className="text-dark-300 text-xs line-clamp-3">{issue.description}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-dark-400">
              {new Date(issue.createdAt).toLocaleDateString()}
            </span>
            <button className="text-xs text-primary-500 hover:text-primary-400 transition-colors">
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const IssuesMap = ({ issues = [], onIssueSelect, selectedIssue }) => {
  const [showIssueDetails, setShowIssueDetails] = useState(false);

  const handleIssueSelect = (issue) => {
    setShowIssueDetails(true);
    if (onIssueSelect) {
      onIssueSelect(issue);
    }
  };

  const handleCloseDetails = () => {
    setShowIssueDetails(false);
  };

  const render = (status) => {
    switch (status) {
      case Status.LOADING:
        return (
          <div className="w-full h-full bg-dark-700 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
              <p className="text-dark-300">Loading map...</p>
            </div>
          </div>
        );
      case Status.FAILURE:
        return (
          <div className="w-full h-full bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500">Failed to load map</p>
              <p className="text-sm text-red-400 mt-1">Please check your internet connection</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="relative w-full h-full">
            <MapComponent
              issues={issues}
              onIssueSelect={handleIssueSelect}
              selectedIssue={selectedIssue}
            />
            {showIssueDetails && selectedIssue && (
              <IssueDetails
                issue={selectedIssue}
                onClose={handleCloseDetails}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full">
      <Wrapper
        apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}
        render={render}
        libraries={['places']}
      />
    </div>
  );
};

export default IssuesMap;
