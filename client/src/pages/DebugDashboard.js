import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const DebugDashboard = () => {
  const { user, isAuthenticated, token } = useAuth();
  const [apiTest, setApiTest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API with user:', user);
        console.log('Token:', token);
        console.log('Is authenticated:', isAuthenticated);
        
        const response = await axios.get('/api/user/dashboard-stats');
        console.log('API Response:', response.data);
        setApiTest(response.data);
      } catch (err) {
        console.error('API Error:', err);
        setError(err.response?.data || err.message);
      }
    };

    if (isAuthenticated && user) {
      testAPI();
    }
  }, [isAuthenticated, user, token]);

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Debug Dashboard</h1>
        
        <div className="space-y-6">
          <div className="bg-dark-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <p className="text-white">Is Authenticated: <span className="text-green-400">{isAuthenticated ? 'Yes' : 'No'}</span></p>
              <p className="text-white">User ID: <span className="text-blue-400">{user?._id || user?.id || 'None'}</span></p>
              <p className="text-white">User Name: <span className="text-blue-400">{user?.name || 'None'}</span></p>
              <p className="text-white">User Email: <span className="text-blue-400">{user?.email || 'None'}</span></p>
              <p className="text-white">User Role: <span className="text-blue-400">{user?.role || 'None'}</span></p>
              <p className="text-white">Token: <span className="text-blue-400">{token ? 'Present' : 'None'}</span></p>
            </div>
          </div>

          <div className="bg-dark-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Test</h2>
            {error ? (
              <div className="text-red-400">
                <p>Error: {JSON.stringify(error, null, 2)}</p>
              </div>
            ) : apiTest ? (
              <div className="text-green-400">
                <p>API Response:</p>
                <pre className="text-white text-sm mt-2 bg-dark-700 p-4 rounded overflow-auto">
                  {JSON.stringify(apiTest, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-yellow-400">Loading...</div>
            )}
          </div>

          <div className="bg-dark-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Available Endpoints</h2>
            <div className="space-y-2 text-sm">
              <p className="text-white">GET /api/user/dashboard-stats</p>
              <p className="text-white">GET /api/user/reports</p>
              <p className="text-white">GET /api/user/notifications</p>
              <p className="text-white">GET /api/community/leaderboard</p>
              <p className="text-white">GET /api/community/feed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugDashboard;
