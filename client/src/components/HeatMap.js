import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useQuery } from 'react-query';
import { Filter, Clock, MapPin, AlertCircle } from 'lucide-react';
import axios from 'axios';

const HeatMap = ({ showFilters = true }) => {
  const [filters, setFilters] = useState({
    timeframe: '30d',
    category: ''
  });

  // Fetch heatmap data with filters
  const { data: heatmapResponse, isLoading, error } = useQuery(
    ['heatmapData', filters],
    async () => {
      const params = new URLSearchParams();
      if (filters.timeframe) params.append('timeframe', filters.timeframe);
      if (filters.category) params.append('category', filters.category);
      
      const response = await axios.get(`/api/issues/heatmap-data?${params.toString()}`);
      return response.data;
    },
    {
      retry: 2,
      staleTime: 60000, // 1 minute
      cacheTime: 300000 // 5 minutes
    }
  );

  const heatmapData = heatmapResponse?.data || [];
  const totalIssues = heatmapResponse?.total || 0;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      timeframe: '30d',
      category: ''
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-400">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading heatmap data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p>Error loading heatmap data</p>
          <p className="text-sm text-dark-400 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show no data state with better messaging
  if (!heatmapData || heatmapData.length === 0) {
    const timeframeLabels = {
      '24h': 'last 24 hours',
      '7d': 'last 7 days',
      '30d': 'last 30 days',
      '90d': 'last 90 days'
    };
    
    const categoryLabel = filters.category ? ` in the "${filters.category}" category` : '';
    const timeframeLabel = timeframeLabels[filters.timeframe] || 'the selected time period';
    
    return (
      <div className="space-y-4">
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 p-4 bg-dark-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-dark-400" />
              <span className="text-sm text-dark-300">Filters:</span>
            </div>
            
            <select
              value={filters.timeframe}
              onChange={(e) => handleFilterChange('timeframe', e.target.value)}
              className="input text-sm w-32"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input text-sm w-48"
            >
              <option value="">All Categories</option>
              <option value="Road & Pothole Issues">Road & Pothole Issues</option>
              <option value="Streetlight Problems">Streetlight Problems</option>
              <option value="Waste Management">Waste Management</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Sewage & Drainage">Sewage & Drainage</option>
              <option value="Public Safety">Public Safety</option>
              <option value="Parks & Recreation">Parks & Recreation</option>
              <option value="Traffic Management">Traffic Management</option>
              <option value="Other">Other</option>
            </select>
            
            <button
              onClick={clearFilters}
              className="btn-outline text-sm"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-center h-64 text-dark-400">
          <div className="text-center">
            <MapPin size={48} className="mx-auto mb-4 text-dark-600" />
            <h3 className="text-lg font-medium text-white mb-2">No Issues Found</h3>
            <p className="text-dark-400">
              No issues reported {categoryLabel} in {timeframeLabel}.
            </p>
            <p className="text-sm text-dark-500 mt-2">
              Try adjusting your filters or check back later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getMarkerColor = (count) => {
    if (count >= 10) return '#ef4444'; // Red for high density
    if (count >= 5) return '#f59e0b';  // Orange for medium-high density
    if (count >= 2) return '#10b981';  // Green for medium density
    return '#3b82f6'; // Blue for low density
  };

  const getMarkerRadius = (count) => {
    return Math.min(Math.max(count * 2, 5), 20); // Scale between 5-20
  };

  // Calculate center point (average of all coordinates)
  const centerLat = heatmapData.reduce((sum, item) => sum + item.coordinates[1], 0) / heatmapData.length;
  const centerLng = heatmapData.reduce((sum, item) => sum + item.coordinates[0], 0) / heatmapData.length;

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-dark-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-dark-400" />
            <span className="text-sm text-dark-300">Filters:</span>
          </div>
          
          <select
            value={filters.timeframe}
            onChange={(e) => handleFilterChange('timeframe', e.target.value)}
            className="input text-sm w-32"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="input text-sm w-48"
          >
            <option value="">All Categories</option>
            <option value="Road & Pothole Issues">Road & Pothole Issues</option>
            <option value="Streetlight Problems">Streetlight Problems</option>
            <option value="Waste Management">Waste Management</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Sewage & Drainage">Sewage & Drainage</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Parks & Recreation">Parks & Recreation</option>
            <option value="Traffic Management">Traffic Management</option>
            <option value="Other">Other</option>
          </select>
          
          <button
            onClick={clearFilters}
            className="btn-outline text-sm"
          >
            Clear Filters
          </button>
          
          <div className="ml-auto flex items-center gap-2 text-sm text-dark-300">
            <MapPin size={16} />
            <span>{totalIssues} locations</span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="w-full h-96 rounded-lg overflow-hidden border border-dark-700">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {heatmapData.map((item, index) => (
            <CircleMarker
              key={index}
              center={[item.coordinates[1], item.coordinates[0]]}
              radius={getMarkerRadius(item.count)}
              pathOptions={{
                fillColor: getMarkerColor(item.count),
                color: '#ffffff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Issue Density
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {item.count} issues reported
                  </p>
                  <div className="text-xs text-gray-500">
                    <p>Categories: {item.categories.join(', ')}</p>
                    <p>Coordinates: {item.coordinates[1].toFixed(4)}, {item.coordinates[0].toFixed(4)}</p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-dark-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>1-2 issues</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>3-4 issues</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>5-9 issues</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>10+ issues</span>
        </div>
      </div>
    </div>
  );
};

export default HeatMap;
