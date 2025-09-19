import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: {
          userId: user._id || user.id,
        },
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('new-issue', (data) => {
        toast.success(`New issue reported: ${data.title}`, {
          duration: 5000,
        });
      });

      newSocket.on('issue-status-update', (data) => {
        toast(`Issue status updated: ${data.status}`, {
          duration: 4000,
          icon: '📝',
        });
      });

      newSocket.on('new-comment', (data) => {
        toast('New comment on issue', {
          duration: 3000,
          icon: '💬',
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const joinIssue = (issueId) => {
    if (socket) {
      socket.emit('join-issue', issueId);
    }
  };

  const leaveIssue = (issueId) => {
    if (socket) {
      socket.emit('leave-issue', issueId);
    }
  };

  const value = {
    socket,
    isConnected,
    joinIssue,
    leaveIssue,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
