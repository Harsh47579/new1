import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FileText, BarChart3, Settings, LogOut, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminDirect = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    console.log('🚀 AdminDirect: Starting data fetch...');
    setLoading(true);
    setError(null);

    try {
      console.log('📡 AdminDirect: Making API call to /api/admin/dashboard');
      console.log('🔄 AdminDirect: Retry count:', retryCount);
      
      const response = await axios.get('/api/admin/dashboard', {
        timeout: 15000, // 15 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ AdminDirect: API Response Status:', response.status);
      console.log('📊 AdminDirect: API Response Data:', response.data);
      
      if (response.data.success === false) {
        throw new Error(response.data.error || 'API returned error');
      }
      
      setAdminData(response.data);
      setError(null);
      setRetryCount(0);
      console.log('✅ AdminDirect: Data loaded successfully');
      
    } catch (error) {
      console.error('❌ AdminDirect: Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code,
        retryCount
      });
      
      setError({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Show specific error messages
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout - server is taking too long to respond');
      } else if (error.response?.status === 500) {
        toast.error('Server error - check console for details');
      } else if (error.response?.status === 404) {
        toast.error('API endpoint not found - check server routes');
      } else if (error.response?.status === 0) {
        toast.error('Cannot connect to server - is it running?');
      } else {
        toast.error(`Failed to load admin data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    console.log('🔄 AdminDirect: Retry button clicked');
    setRetryCount(prev => prev + 1);
    fetchAdminData();
  };

  const adminMenuItems = [
    {
      title: 'Dashboard',
      icon: BarChart3,
      path: '/admin',
      description: 'Overview and statistics'
    },
    {
      title: 'User Management',
      icon: Users,
      path: '/admin',
      description: 'Manage users and permissions'
    },
    {
      title: 'Issue Management',
      icon: FileText,
      path: '/admin',
      description: 'Review and manage issues'
    },
    {
      title: 'System Settings',
      icon: Settings,
      path: '/admin',
      description: 'Configure system settings'
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-white mb-2">Loading Admin Panel...</p>
          <p className="text-dark-300 text-sm">This may take a few moments</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Dashboard</h2>
          <p className="text-dark-300 mb-4">{error.message}</p>
          
          {error.status && (
            <div className="bg-dark-800 rounded-lg p-4 mb-4 text-left">
              <h3 className="text-sm font-medium text-white mb-2">Error Details:</h3>
              <div className="text-xs text-dark-300 space-y-1">
                <div><span className="text-white">Status:</span> {error.status}</div>
                <div><span className="text-white">Retry Count:</span> {retryCount}</div>
                {error.data && (
                  <div><span className="text-white">Response:</span> {JSON.stringify(error.data, null, 2)}</div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex space-x-4 justify-center">
            <button 
              onClick={handleRetry}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>Retry ({retryCount})</span>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                <p className="text-dark-300">Direct Access - No Authentication Required</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-dark-300 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Stats */}
      {adminData && (
        <div className="bg-dark-800 border-b border-dark-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{adminData.overview?.totalIssues || 0}</div>
                <div className="text-dark-300">Total Issues</div>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{adminData.overview?.resolvedIssues || 0}</div>
                <div className="text-dark-300">Resolved</div>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{adminData.overview?.totalUsers || 0}</div>
                <div className="text-dark-300">Total Users</div>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{adminData.overview?.departments || 0}</div>
                <div className="text-dark-300">Departments</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminMenuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(item.path)}
                className="bg-dark-800 hover:bg-dark-700 rounded-lg p-6 cursor-pointer transition-colors border border-dark-700 hover:border-primary-500"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-dark-300 text-sm">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            View All Issues
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            Manage Users
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            System Settings
          </button>
        </div>
      </div>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && adminData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <details className="bg-dark-800 rounded-lg p-4">
            <summary className="text-white cursor-pointer">Debug Info (Development Only)</summary>
            <pre className="text-xs text-dark-300 mt-2 overflow-auto">
              {JSON.stringify(adminData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default AdminDirect;