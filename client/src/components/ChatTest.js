import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const ChatTest = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user, token } = useAuth();

  const testChat = async () => {
    setLoading(true);
    try {
      console.log('Testing chat API...');
      console.log('isAuthenticated:', isAuthenticated);
      console.log('user:', user);
      console.log('user.id:', user?.id);
      console.log('user._id:', user?._id);
      console.log('token:', token);
      console.log('axios headers:', axios.defaults.headers.common);
      
      // Test with explicit headers
      const result = await axios.post('/api/chat/message', {
        message: message || 'Hello, test message'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Chat API response:', result.data);
      setResponse(JSON.stringify(result.data, null, 2));
    } catch (error) {
      console.error('Chat API error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      setResponse(`Error: ${error.response?.data?.message || error.message}\n\nDetails: ${JSON.stringify({
        status: error.response?.status,
        data: error.response?.data
      }, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="p-4 bg-red-100 text-red-800">Not authenticated</div>;
  }

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Chat API Test</h3>
          <p className="text-dark-300 text-sm">Test the AI chatbot functionality</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-400 text-sm">Connected</span>
        </div>
      </div>

      {/* Authentication Status */}
      <div className="bg-dark-700 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-dark-300">Status:</span>
            <span className="text-green-400 ml-2 font-medium">Authenticated</span>
          </div>
          <div>
            <span className="text-dark-300">User:</span>
            <span className="text-white ml-2 font-medium">{user?.name || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-dark-300">Role:</span>
            <span className="text-white ml-2 font-medium capitalize">{user?.role || 'User'}</span>
          </div>
          <div>
            <span className="text-dark-300">Token:</span>
            <span className="text-green-400 ml-2 font-medium">Valid</span>
          </div>
        </div>
      </div>

      {/* Chat Test Interface */}
      <div className="space-y-4">
        <div>
          <label className="block text-white font-medium mb-2">Test Message</label>
          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your test message here..."
              className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={testChat}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Testing...
                </>
              ) : (
                'Send Test'
              )}
            </button>
          </div>
        </div>

        {/* Response Display */}
        {response && (
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">API Response</h4>
              <button
                onClick={() => setResponse('')}
                className="text-dark-300 hover:text-white text-sm"
              >
                Clear
              </button>
            </div>
            <div className="bg-dark-800 rounded p-3">
              <pre className="text-sm text-green-400 overflow-auto whitespace-pre-wrap">{response}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatTest;
