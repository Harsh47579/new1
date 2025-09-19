import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  MapPin, 
  BarChart3, 
  RefreshCw,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AIPredictionsWidget = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch predictive analytics data
  const { data, isLoading, error, refetch } = useQuery(
    'predictiveAnalytics',
    async () => {
      try {
        console.log('🔄 Fetching predictive analytics...');
        const response = await axios.get('/api/issues/predictive-analytics', {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('✅ Predictive analytics response:', response.data);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Server returned unsuccessful response');
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Predictive analytics API error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            timeout: error.config?.timeout
          }
        });
        
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new Error('Cannot connect to server. Please check if the backend is running.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The server is taking too long to respond.');
        } else if (error.response?.status === 401) {
          throw new Error('Authentication required. Please log in as an admin.');
        } else if (error.response?.status === 403) {
          throw new Error('Admin privileges required to view predictions.');
        } else if (error.response?.status === 404) {
          throw new Error('Predictive analytics endpoint not found. Please check server configuration.');
        } else if (error.response?.status === 500) {
          throw new Error(`Server error: ${error.response?.data?.message || 'Internal server error'}`);
        } else if (error.response?.status >= 400) {
          throw new Error(`HTTP ${error.response.status}: ${error.response?.data?.message || error.response.statusText}`);
        } else if (!error.response) {
          throw new Error('Network error. Please check your internet connection.');
        } else {
          throw new Error(`Failed to load predictions: ${error.message}`);
        }
      }
    },
    {
      refetchInterval: 300000, // Refetch every 5 minutes
      onSuccess: () => {
        setLastUpdated(new Date());
        console.log('✅ Predictive analytics loaded successfully');
      },
      onError: (error) => {
        console.error('❌ Query error:', error);
      },
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error.message.includes('Authentication') || error.message.includes('Admin privileges')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  );

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Predictive analytics updated');
    } catch (error) {
      toast.error('Failed to refresh analytics');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
          <span className="text-dark-300">Loading AI predictions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.message.includes('Authentication') || error.message.includes('Admin privileges');
    const isNetworkError = error.message.includes('Cannot connect') || error.message.includes('Network error');
    const isTimeoutError = error.message.includes('timeout');
    const isServerError = error.message.includes('Server error') || error.message.includes('HTTP 5');
    
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Brain className="w-6 h-6 text-primary-500 mr-2" />
            <h3 className="text-lg font-semibold text-white">AI Predictions</h3>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-dark-300 hover:text-white transition-colors"
            title="Retry loading predictions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-center py-4">
          <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${
            isAuthError ? 'text-red-500' : 
            isNetworkError ? 'text-orange-500' : 
            isTimeoutError ? 'text-yellow-500' : 
            'text-yellow-500'
          }`} />
          
          <p className={`font-medium mb-2 ${
            isAuthError ? 'text-red-400' : 
            isNetworkError ? 'text-orange-400' : 
            isTimeoutError ? 'text-yellow-400' : 
            'text-yellow-400'
          }`}>
            Failed to load predictions
          </p>
          
          <p className="text-dark-300 text-sm mb-4">{error.message}</p>
          
          {/* Debugging information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-dark-700 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-dark-400 mb-2">Debug Info:</p>
              <div className="text-xs text-dark-300 space-y-1">
                <p>Error Type: {isAuthError ? 'Authentication' : isNetworkError ? 'Network' : isTimeoutError ? 'Timeout' : isServerError ? 'Server' : 'Unknown'}</p>
                <p>Timestamp: {new Date().toLocaleTimeString()}</p>
                <p>Endpoint: /api/issues/predictive-analytics</p>
              </div>
            </div>
          )}
          
          {/* Specific troubleshooting steps */}
          <div className="text-left mb-4">
            <p className="text-xs text-dark-400 mb-2">Troubleshooting:</p>
            <div className="text-xs text-dark-300 space-y-1">
              {isAuthError && (
                <p>• Make sure you're logged in as an admin user</p>
              )}
              {isNetworkError && (
                <p>• Check if the backend server is running on port 5000</p>
              )}
              {isTimeoutError && (
                <p>• The server might be overloaded, try again in a moment</p>
              )}
              {isServerError && (
                <p>• Check server logs for detailed error information</p>
              )}
              <p>• Open browser Developer Tools (F12) and check the Network tab</p>
              <p>• Check the Console tab for additional error details</p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            className="mt-2 text-primary-500 hover:text-primary-400 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Handle different response formats
  const predictions = data?.data?.predictedIssueTypes || data?.prediction;
  const statistics = data?.data?.statistics;
  const futurePredictions = data?.data?.futurePredictions;
  const aiInsights = data?.data?.aiInsights;
  const aiModel = data?.data?.aiModel || data?.source;
  const dataPoints = data?.data?.dataPoints || data?.dataPoints || 0;
  
  // Check for insufficient data or empty predictions
  const hasData = data && (data.data || data.prediction);
  const hasHighRiskAreas = data?.data?.highRiskAreas?.length > 0 || data?.prediction?.hotspotAreas?.length > 0;
  const totalIssuesNeeded = 50; // Threshold for meaningful predictions
  
  // Show insufficient data state (no data at all)
  if (!hasData) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Brain className="w-6 h-6 text-primary-500 mr-2" />
            <h3 className="text-lg font-semibold text-white">AI Predictions</h3>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-dark-300 hover:text-white transition-colors"
            title="Refresh predictions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-center py-6">
          <div className="text-4xl mb-4">🤖</div>
          <h4 className="text-white font-medium mb-2">No Data Available</h4>
          <p className="text-dark-300 text-sm mb-4">
            AI predictions will appear here once there's sufficient historical data.
          </p>
          <button
            onClick={handleRefresh}
            className="text-primary-500 hover:text-primary-400 text-sm font-medium px-4 py-2 border border-primary-500/30 rounded-lg hover:border-primary-500/50 transition-all"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700">
      {/* Header */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-6 h-6 text-primary-500 mr-2" />
            <div>
              <h3 className="text-lg font-semibold text-white">AI Predictions</h3>
              <p className="text-sm text-dark-300">
                Proactive insights for the next 4 weeks
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-dark-300 hover:text-white transition-colors"
              title="Refresh predictions"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-dark-300 hover:text-white transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-dark-400 mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Data Progress Indicator (when we have some data but not enough) */}
        {dataPoints > 0 && dataPoints < totalIssuesNeeded && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Brain className="w-4 h-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium text-blue-300">Building AI Predictions</span>
              </div>
              <span className="text-xs text-blue-400">{dataPoints}/{totalIssuesNeeded} reports</span>
            </div>
            <div className="bg-dark-700/50 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((dataPoints / totalIssuesNeeded) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-blue-300">
              {totalIssuesNeeded - dataPoints} more reports needed for comprehensive predictions
            </p>
          </div>
        )}

        {/* Risk Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-dark-300">Overall Risk Score</span>
            <span className="text-lg font-bold text-white">
              {Math.round((predictions?.riskScore || 0) * 100)}/100
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                (predictions?.riskScore || 0) >= 0.7 ? 'bg-red-500' :
                (predictions?.riskScore || 0) >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((predictions?.riskScore || 0) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Current Prediction (Simple Format) */}
        {data?.prediction && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
              Current Prediction
            </h4>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="text-white font-medium">{predictions?.issue}</h5>
                  <p className="text-dark-300 text-sm">Predicted Date: {predictions?.predictedDate}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-500">
                    {Math.round((predictions?.riskScore || 0) * 100)}%
                  </div>
                  <div className="text-xs text-dark-300">Risk Level</div>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-sm text-white font-medium mb-1">Recommended Action:</p>
                <p className="text-dark-300 text-sm">{predictions?.recommendedAction}</p>
              </div>
              
              {predictions?.hotspotAreas && predictions.hotspotAreas.length > 0 && (
                <div>
                  <p className="text-sm text-white font-medium mb-2">Hotspot Areas:</p>
                  <div className="flex flex-wrap gap-2">
                    {predictions.hotspotAreas.map((area, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* High Risk Areas (Complex Format) */}
        {predictions?.highRiskAreas && predictions.highRiskAreas.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-red-500" />
              High Risk Areas
            </h4>
            <div className="space-y-2">
              {predictions.highRiskAreas.slice(0, isExpanded ? 10 : 3).map((area, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <span className="text-white font-medium">{area.area}</span>
                    <span className="text-dark-300 text-sm ml-2">({area.issueCount} issues)</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    area.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                    area.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {area.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Predicted Issue Types */}
        {predictions?.predictedIssueTypes && predictions.predictedIssueTypes.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
              Predicted Issue Types
            </h4>
            <div className="space-y-2">
              {predictions.predictedIssueTypes.slice(0, isExpanded ? 10 : 3).map((prediction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <span className="text-white font-medium">{prediction.category}</span>
                    <p className="text-dark-300 text-xs">{prediction.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-primary-500 font-medium">
                      {Math.round(prediction.probability * 100)}%
                    </span>
                    <div className="w-16 bg-dark-600 rounded-full h-1 mt-1">
                      <div 
                        className="bg-primary-500 h-1 rounded-full"
                        style={{ width: `${prediction.probability * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {predictions?.recommendations && predictions.recommendations.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
              AI Recommendations
            </h4>
            <div className="space-y-2">
              {predictions.recommendations.slice(0, isExpanded ? 10 : 3).map((rec, index) => (
                <div key={index} className="flex items-start p-3 bg-dark-700 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                    rec.priority === 'high' ? 'bg-red-500' :
                    rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="text-white text-sm">{rec.message}</p>
                    <span className="text-xs text-dark-400 capitalize">{rec.type.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Future Predictions */}
        {futurePredictions && futurePredictions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <Eye className="w-4 h-4 mr-2 text-purple-500" />
              Future Predictions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {futurePredictions.map((prediction, index) => (
                <div key={index} className="p-4 bg-dark-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium capitalize">
                      {prediction.timeframe.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-dark-300">
                      {prediction.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-primary-500 mb-2">
                    {prediction.predictedIssues} issues
                  </div>
                  <div className="text-xs text-dark-300">
                    Top categories: {prediction.topCategories.map(c => c.category).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights */}
        {aiInsights && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <Brain className="w-4 h-4 mr-2 text-cyan-500" />
              AI Insights
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-dark-700 rounded-lg">
                <div className="text-sm text-dark-300 mb-2">Model Accuracy</div>
                <div className="text-2xl font-bold text-cyan-500">
                  {aiInsights.modelAccuracy}%
                </div>
                <div className="text-xs text-dark-400 mt-1">
                  Based on {data?.dataPoints || 0} data points
                </div>
              </div>
              <div className="p-4 bg-dark-700 rounded-lg">
                <div className="text-sm text-dark-300 mb-2">Confidence Score</div>
                <div className="text-2xl font-bold text-green-500">
                  {aiInsights.confidence}%
                </div>
                <div className="text-xs text-dark-400 mt-1">
                  Prediction reliability
                </div>
              </div>
            </div>
            
            {/* Anomaly Detection */}
            {aiInsights.anomalyDetection && aiInsights.anomalyDetection.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-dark-300 mb-2">Detected Anomalies</div>
                <div className="space-y-2">
                  {aiInsights.anomalyDetection.slice(0, 3).map((anomaly, index) => (
                    <div key={index} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-red-400 text-sm font-medium">
                          {anomaly.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          anomaly.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {anomaly.severity}
                        </span>
                      </div>
                      <div className="text-xs text-dark-300 mt-1">
                        {anomaly.type === 'spike' ? 
                          `${anomaly.count} issues on ${anomaly.date} (expected: ${anomaly.expected})` :
                          `${anomaly.category}: ${anomaly.percentage}% of total issues`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Model Info & Data Status */}
        <div className="mb-4 p-3 bg-dark-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Brain className="w-4 h-4 mr-2 text-primary-500" />
              <span className="text-sm text-dark-300">AI Model:</span>
              <span className="text-sm text-white ml-2 font-medium">{aiModel || 'Dummy ML Predictor'}</span>
            </div>
            <div className="text-xs text-dark-400">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            </div>
          </div>
          
          {/* Data Points Status */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-600">
            <div className="flex items-center">
              <BarChart3 className="w-3 h-3 mr-2 text-dark-400" />
              <span className="text-xs text-dark-400">Data Points:</span>
              <span className="text-xs text-white ml-1 font-medium">{dataPoints}</span>
            </div>
            {dataPoints < totalIssuesNeeded && (
              <span className="text-xs text-orange-400">
                {totalIssuesNeeded - dataPoints} more needed
              </span>
            )}
            {dataPoints >= totalIssuesNeeded && (
              <span className="text-xs text-green-400">✓ Sufficient data</span>
            )}
          </div>
        </div>

        {/* Statistics Summary */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dark-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{statistics.totalIssues}</div>
              <div className="text-xs text-dark-300">Total Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{statistics.resolvedIssues}</div>
              <div className="text-xs text-dark-300">Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{statistics.inProgressIssues}</div>
              <div className="text-xs text-dark-300">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-500">{Math.round(statistics.resolutionRate)}%</div>
              <div className="text-xs text-dark-300">Resolution Rate</div>
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        {((predictions?.highRiskAreas?.length > 3) || 
          (predictions?.predictedIssueTypes?.length > 3) || 
          (predictions?.recommendations?.length > 3)) && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary-500 hover:text-primary-400 text-sm font-medium"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPredictionsWidget;
