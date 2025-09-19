/**
 * Enhanced Predictive Analytics Dashboard
 * Advanced visualization component with heatmaps, charts, and real-time predictions
 */

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Map, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Settings,
  Download,
  Eye,
  EyeOff,
  Layers,
  Filter
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Chart libraries (you'll need to install these)
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// import HeatmapLayer from 'react-leaflet-heatmap-layer';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const PredictiveAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('predictions');
  const [predictions, setPredictions] = useState(null);
  const [riskAreas, setRiskAreas] = useState([]);
  const [heatmapData, setHeatmapData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    timeframe: '7_days',
    includeWeather: true,
    includeHistorical: true,
    riskThreshold: 0.6
  });
  const [viewSettings, setViewSettings] = useState({
    showHeatmap: true,
    showRiskAreas: true,
    showPredictions: true,
    heatmapOpacity: 0.7
  });

  // Sample data for demonstration (replace with real API calls)
  const samplePredictions = [
    {
      category: 'Water Supply',
      probability: 0.75,
      confidence: 0.85,
      risk_score: 0.72,
      reasoning: 'Heavy rainfall predicted, high risk of water-related issues',
      recommended_actions: ['Check drainage systems', 'Monitor water levels', 'Prepare emergency response'],
      timeframe: '7_days'
    },
    {
      category: 'Road & Pothole Issues',
      probability: 0.45,
      confidence: 0.70,
      risk_score: 0.48,
      reasoning: 'Historical pattern suggests moderate risk of road issues',
      recommended_actions: ['Regular road inspections', 'Preventive maintenance'],
      timeframe: '7_days'
    },
    {
      category: 'Waste Management',
      probability: 0.30,
      confidence: 0.65,
      risk_score: 0.35,
      reasoning: 'Standard risk level based on location and historical data',
      recommended_actions: ['Schedule collection', 'Monitor bins'],
      timeframe: '7_days'
    }
  ];

  const sampleRiskAreas = [
    {
      location: { lat: 23.3441, lng: 85.3096, address: 'City Center' },
      risk_level: 'high',
      risk_score: 0.78,
      predicted_issues: ['Water Supply', 'Traffic Management'],
      population_density: 4500
    },
    {
      location: { lat: 23.35, lng: 85.32, address: 'Industrial Area' },
      risk_level: 'medium',
      risk_score: 0.65,
      predicted_issues: ['Road & Pothole Issues'],
      population_density: 2100
    },
    {
      location: { lat: 23.33, lng: 85.30, address: 'Old Market' },
      risk_level: 'critical',
      risk_score: 0.85,
      predicted_issues: ['Waste Management', 'Public Safety'],
      population_density: 6200
    }
  ];

  const sampleTrendData = {
    timeframe: '30_days',
    trends: {
      dates: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
      issue_counts: [12, 15, 18, 14, 16],
      risk_scores: [0.45, 0.52, 0.58, 0.49, 0.55],
      resolution_times: [3.2, 3.5, 3.8, 3.1, 3.4]
    },
    summary: {
      avg_issues_per_day: 15.0,
      avg_risk_score: 0.52,
      avg_resolution_time: 3.4,
      trend_direction: {
        issues: 'increasing',
        risk: 'increasing',
        resolution_time: 'worsening'
      }
    }
  };

  useEffect(() => {
    // Initialize with sample data
    setPredictions(samplePredictions);
    setRiskAreas(sampleRiskAreas);
    setTrendData(sampleTrendData);
    generateHeatmapData();
  }, []);

  const generateHeatmapData = async () => {
    try {
      // In a real implementation, this would call your ML service
      const centerLat = 23.3441;
      const centerLng = 85.3096;
      const radiusKm = 10;
      
      // Generate sample heatmap data
      const sampleHeatmap = {
        heatmap_data: generateSampleHeatmapData(centerLat, centerLng, radiusKm),
        bounds: {
          north: centerLat + (radiusKm / 111.0),
          south: centerLat - (radiusKm / 111.0),
          east: centerLng + (radiusKm / (111.0 * Math.cos(centerLat * Math.PI / 180))),
          west: centerLng - (radiusKm / (111.0 * Math.cos(centerLat * Math.PI / 180)))
        },
        center: { lat: centerLat, lng: centerLng },
        radius_km: radiusKm
      };
      
      setHeatmapData(sampleHeatmap);
    } catch (error) {
      console.error('Error generating heatmap:', error);
    }
  };

  const generateSampleHeatmapData = (centerLat, centerLng, radiusKm) => {
    const data = [];
    const resolution = 50;
    const latOffset = radiusKm / 111.0;
    const lngOffset = radiusKm / (111.0 * Math.cos(centerLat * Math.PI / 180));
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const lat = centerLat + (i / resolution - 0.5) * latOffset * 2;
        const lng = centerLng + (j / resolution - 0.5) * lngOffset * 2;
        
        // Generate risk score based on distance from center and random factors
        const distance = Math.sqrt((lat - centerLat) ** 2 + (lng - centerLng) ** 2);
        const riskScore = Math.max(0, Math.min(1, 0.3 + Math.random() * 0.6 - distance * 10));
        
        const riskLevel = riskScore >= 0.8 ? 'critical' : 
                         riskScore >= 0.6 ? 'high' : 
                         riskScore >= 0.4 ? 'medium' : 'low';
        
        const colors = {
          low: '#4CAF50',
          medium: '#FF9800', 
          high: '#F44336',
          critical: '#9C27B0'
        };
        
        data.push({
          lat,
          lng,
          risk_score: riskScore,
          risk_level: riskLevel,
          color: colors[riskLevel],
          intensity: riskScore
        });
      }
    }
    
    return data;
  };

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call your ML service
      // const response = await axios.post('/api/ml/predict', {
      //   location: { lat: 23.3441, lng: 85.3096 },
      //   timeframe: filters.timeframe,
      //   include_weather: filters.includeWeather,
      //   include_historical: filters.includeHistorical
      // });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use sample data for now
      setPredictions(samplePredictions);
      setRiskAreas(sampleRiskAreas);
      
      toast.success('Predictions updated successfully');
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setError('Failed to fetch predictions');
      toast.error('Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    const colors = {
      low: 'text-green-400 bg-green-500/20',
      medium: 'text-yellow-400 bg-yellow-500/20',
      high: 'text-red-400 bg-red-500/20',
      critical: 'text-purple-400 bg-purple-500/20'
    };
    return colors[riskLevel] || colors.low;
  };

  const getRiskIcon = (riskLevel) => {
    if (riskLevel === 'critical') return '🔴';
    if (riskLevel === 'high') return '🟠';
    if (riskLevel === 'medium') return '🟡';
    return '🟢';
  };

  const renderPredictions = () => (
    <div className="space-y-4">
      {predictions?.map((prediction, index) => (
        <div key={index} className="bg-dark-700 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">{prediction.category}</h4>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(prediction.risk_score >= 0.7 ? 'high' : prediction.risk_score >= 0.4 ? 'medium' : 'low')}`}>
                {Math.round(prediction.probability * 100)}% probability
              </span>
              <span className="text-dark-300 text-xs">
                {Math.round(prediction.confidence * 100)}% confidence
              </span>
            </div>
          </div>
          
          <p className="text-dark-300 text-sm mb-3">{prediction.reasoning}</p>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 bg-dark-600 rounded-full h-2 mr-3">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${prediction.risk_score * 100}%` }}
              />
            </div>
            <span className="text-white font-medium">
              {Math.round(prediction.risk_score * 100)}% risk
            </span>
          </div>
          
          <div className="space-y-2">
            <h5 className="text-dark-300 text-xs font-medium">Recommended Actions:</h5>
            <div className="flex flex-wrap gap-2">
              {prediction.recommended_actions.map((action, actionIndex) => (
                <span key={actionIndex} className="px-2 py-1 bg-dark-600 text-dark-300 text-xs rounded">
                  {action}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRiskAreas = () => (
    <div className="space-y-4">
      {riskAreas?.map((area, index) => (
        <div key={index} className="bg-dark-700 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">{area.location.address}</h4>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getRiskIcon(area.risk_level)}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(area.risk_level)}`}>
                {area.risk_level.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <span className="text-dark-300 text-xs">Risk Score</span>
              <div className="text-white font-medium">
                {Math.round(area.risk_score * 100)}%
              </div>
            </div>
            <div>
              <span className="text-dark-300 text-xs">Population Density</span>
              <div className="text-white font-medium">
                {area.population_density?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 bg-dark-600 rounded-full h-2 mr-3">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  area.risk_level === 'critical' ? 'bg-purple-500' :
                  area.risk_level === 'high' ? 'bg-red-500' :
                  area.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${area.risk_score * 100}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h5 className="text-dark-300 text-xs font-medium">Predicted Issues:</h5>
            <div className="flex flex-wrap gap-2">
              {area.predicted_issues.map((issue, issueIndex) => (
                <span key={issueIndex} className="px-2 py-1 bg-dark-600 text-dark-300 text-xs rounded">
                  {issue}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-300 text-sm">Avg Issues/Day</p>
              <p className="text-white text-2xl font-bold">
                {trendData?.summary?.avg_issues_per_day || 0}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className={`text-xs ${
              trendData?.summary?.trend_direction?.issues === 'increasing' 
                ? 'text-red-400' : 'text-green-400'
            }`}>
              {trendData?.summary?.trend_direction?.issues === 'increasing' ? '↗️' : '↘️'} 
              {trendData?.summary?.trend_direction?.issues}
            </span>
          </div>
        </div>
        
        <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-300 text-sm">Avg Risk Score</p>
              <p className="text-white text-2xl font-bold">
                {Math.round((trendData?.summary?.avg_risk_score || 0) * 100)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="mt-2">
            <span className={`text-xs ${
              trendData?.summary?.trend_direction?.risk === 'increasing' 
                ? 'text-red-400' : 'text-green-400'
            }`}>
              {trendData?.summary?.trend_direction?.risk === 'increasing' ? '↗️' : '↘️'} 
              {trendData?.summary?.trend_direction?.risk}
            </span>
          </div>
        </div>
        
        <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-300 text-sm">Resolution Time</p>
              <p className="text-white text-2xl font-bold">
                {trendData?.summary?.avg_resolution_time?.toFixed(1) || 0}d
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-green-400" />
          </div>
          <div className="mt-2">
            <span className={`text-xs ${
              trendData?.summary?.trend_direction?.resolution_time === 'improving' 
                ? 'text-green-400' : 'text-red-400'
            }`}>
              {trendData?.summary?.trend_direction?.resolution_time === 'improving' ? '↗️' : '↘️'} 
              {trendData?.summary?.trend_direction?.resolution_time}
            </span>
          </div>
        </div>
      </div>
      
      {/* Trend Chart Placeholder */}
      <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
        <h3 className="text-white font-medium mb-4">Trend Analysis</h3>
        <div className="h-64 bg-dark-600 rounded-lg flex items-center justify-center">
          <p className="text-dark-300">
            📊 Interactive trend charts will be rendered here
            <br />
            <span className="text-xs">(Chart.js or Recharts integration needed)</span>
          </p>
        </div>
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="bg-dark-700 rounded-lg p-6 border border-dark-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Risk Heatmap</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewSettings(prev => ({ ...prev, heatmapOpacity: Math.max(0.1, prev.heatmapOpacity - 0.1) }))}
            className="p-1 text-dark-300 hover:text-white"
          >
            -
          </button>
          <span className="text-dark-300 text-sm w-12 text-center">
            {Math.round(viewSettings.heatmapOpacity * 100)}%
          </span>
          <button
            onClick={() => setViewSettings(prev => ({ ...prev, heatmapOpacity: Math.min(1, prev.heatmapOpacity + 0.1) }))}
            className="p-1 text-dark-300 hover:text-white"
          >
            +
          </button>
        </div>
      </div>
      
      <div className="h-96 bg-dark-600 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Map className="w-16 h-16 text-dark-400 mx-auto mb-4" />
          <p className="text-dark-300">
            🗺️ Interactive map with risk heatmap will be rendered here
            <br />
            <span className="text-xs">(Leaflet/MapBox integration needed)</span>
          </p>
          {heatmapData && (
            <div className="mt-4 text-xs text-dark-400">
              Heatmap data ready: {heatmapData.heatmap_data.length} points
            </div>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-dark-300 text-xs">Low Risk</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-dark-300 text-xs">Medium Risk</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-dark-300 text-xs">High Risk</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-dark-300 text-xs">Critical Risk</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Brain className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Predictive Analytics</h1>
              <p className="text-dark-300">AI-powered civic issue predictions and risk analysis</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPredictions}
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            
            <button className="btn-outline flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            <button className="btn-outline flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-lg p-4 mb-6 border border-dark-700">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-dark-300" />
              <span className="text-dark-300 text-sm">Filters:</span>
            </div>
            
            <select
              value={filters.timeframe}
              onChange={(e) => setFilters(prev => ({ ...prev, timeframe: e.target.value }))}
              className="bg-dark-700 border border-dark-600 text-white rounded px-3 py-1 text-sm"
            >
              <option value="1_day">1 Day</option>
              <option value="7_days">7 Days</option>
              <option value="30_days">30 Days</option>
            </select>
            
            <label className="flex items-center space-x-2 text-dark-300 text-sm">
              <input
                type="checkbox"
                checked={filters.includeWeather}
                onChange={(e) => setFilters(prev => ({ ...prev, includeWeather: e.target.checked }))}
                className="rounded"
              />
              <span>Include Weather</span>
            </label>
            
            <label className="flex items-center space-x-2 text-dark-300 text-sm">
              <input
                type="checkbox"
                checked={filters.includeHistorical}
                onChange={(e) => setFilters(prev => ({ ...prev, includeHistorical: e.target.checked }))}
                className="rounded"
              />
              <span>Include Historical</span>
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-dark-800 rounded-lg p-1 border border-dark-700">
          {[
            { id: 'predictions', label: 'Predictions', icon: Brain },
            { id: 'risk-areas', label: 'Risk Areas', icon: Map },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'map', label: 'Heatmap', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-300 hover:text-white hover:bg-dark-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeTab === 'predictions' && renderPredictions()}
            {activeTab === 'risk-areas' && renderRiskAreas()}
            {activeTab === 'trends' && renderTrends()}
            {activeTab === 'map' && renderMap()}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Overall Risk Score */}
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <h3 className="text-white font-medium mb-4">Overall Risk Score</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-500 mb-2">
                  {predictions ? Math.round(predictions.reduce((acc, p) => acc + p.risk_score, 0) / predictions.length * 100) : 0}%
                </div>
                <div className="w-full bg-dark-700 rounded-full h-3 mb-4">
                  <div 
                    className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${predictions ? predictions.reduce((acc, p) => acc + p.risk_score, 0) / predictions.length * 100 : 0}%` }}
                  />
                </div>
                <p className="text-dark-300 text-sm">
                  Based on {predictions?.length || 0} predictions
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <h3 className="text-white font-medium mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-300">High Risk Areas</span>
                  <span className="text-white font-medium">
                    {riskAreas?.filter(area => area.risk_level === 'high' || area.risk_level === 'critical').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Total Predictions</span>
                  <span className="text-white font-medium">{predictions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Avg Confidence</span>
                  <span className="text-white font-medium">
                    {predictions ? Math.round(predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Last Updated</span>
                  <span className="text-white font-medium">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Model Info */}
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <h3 className="text-white font-medium mb-4">Model Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-300">Model Version</span>
                  <span className="text-white">v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Accuracy</span>
                  <span className="text-green-400">85.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Last Trained</span>
                  <span className="text-white">2 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Data Points</span>
                  <span className="text-white">5,000+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalyticsDashboard;
