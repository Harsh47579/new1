import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import ChatTest from './components/ChatTest';
import Home from './pages/Home';
import IssuesMap from './pages/IssuesMap';
import ReportIssue from './pages/ReportIssue';
import UserDashboard from './pages/UserDashboard';
import DebugDashboard from './pages/DebugDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminDirect from './pages/AdminDirect';
import RewardsDashboard from './pages/RewardsDashboard';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import IssueDetail from './pages/IssueDetail';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="min-h-screen bg-dark-900">
              <Navbar />
              <main className="min-h-screen">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/map" element={<IssuesMap />} />
                  <Route path="/report" element={<ReportIssue />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/issue/:id" element={<IssueDetail />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <UserDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/debug"
                    element={
                      <ProtectedRoute>
                        <DebugDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin/direct" element={<AdminDirect />} />
                  <Route
                    path="/rewards"
                    element={
                      <ProtectedRoute>
                        <RewardsDashboard />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
              
              {/* Chatbot - Available on all pages */}
              <Chatbot />
              
              {/* Debug Chat Test - Remove this after fixing */}
              <ChatTest />
              
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#f8fafc',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#f8fafc',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
