import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Shield,
  Minimize2,
  Maximize2,
  Loader2,
  Bell
} from 'lucide-react';
import { formatAIResponse, generateActionButtons } from '../utils/formatAIResponse';

const Chatbot = ({ isAdmin = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { isAuthenticated, user } = useAuth();
  const { socket } = useSocket();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewMessage = (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => [...prev, data.message]);
        setIsTyping(false);
      }
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      }
    };

    const handleUserStoppedTyping = (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    const handleNewAnnouncement = (announcement) => {
      // Add announcement as a special message in the chat
      const announcementMessage = {
        content: `📢 **${announcement.title}**\n\n${announcement.content}`,
        sender: 'announcement',
        timestamp: new Date(),
        announcement: announcement
      };
      
      setMessages(prev => [...prev, announcementMessage]);
      toast.success(`New announcement: ${announcement.title}`);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stopped-typing', handleUserStoppedTyping);
    socket.on('new_announcement', handleNewAnnouncement);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stopped-typing', handleUserStoppedTyping);
      socket.off('new_announcement', handleNewAnnouncement);
    };
  }, [socket, isAuthenticated, conversationId, user?.id]);

  // Join chat room when conversation is loaded
  useEffect(() => {
    if (socket && conversationId) {
      socket.emit('join-chat', conversationId);
      return () => {
        socket.emit('leave-chat', conversationId);
      };
    }
  }, [socket, conversationId]);

  // Join announcement audience room based on user role
  useEffect(() => {
    if (!socket || !isAuthenticated || !user) return;

    const audience = user.role === 'admin' || user.role === 'super_admin' ? 'admins' : 'citizens';
    socket.emit('join-audience', audience);
    
    // Also join 'all' audience
    socket.emit('join-audience', 'all');

    return () => {
      socket.emit('leave-audience', audience);
      socket.emit('leave-audience', 'all');
    };
  }, [socket, isAuthenticated, user]);

  // Fetch conversations
  const { refetch: refetchConversations } = useQuery(
    'chat-conversations',
    async () => {
      const response = await axios.get('/api/chat/conversations');
      return response.data.conversations;
    },
    {
      enabled: isAuthenticated,
      refetchOnWindowFocus: false
    }
  );

  // Fetch specific conversation
  useQuery(
    ['chat-conversation', conversationId],
    async () => {
      if (!conversationId) return null;
      const response = await axios.get(`/api/chat/conversation/${conversationId}`);
      return response.data.conversation;
    },
    {
      enabled: !!conversationId,
      onSuccess: (data) => {
        if (data) {
          setMessages(data.messages || []);
        }
      }
    }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    async (messageData) => {
      console.log('Sending message with data:', messageData);
      console.log('User authenticated:', isAuthenticated);
      console.log('User:', user);
      console.log('Token in headers:', axios.defaults.headers.common['Authorization']);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token);
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.post('/api/chat/message', messageData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        console.log('Message sent successfully:', data);
        
        // Store the full response data including NLP metadata
        const enhancedMessage = {
          ...data.message,
          nlp: data.nlp,
          fallback: data.fallback,
          error: data.error
        };
        
        setMessages(prev => [...prev, enhancedMessage]);
        setMessage('');
        setIsTyping(false);
        refetchConversations();
        
        // If this was a new conversation, set the conversationId
        if (data.conversation && !conversationId) {
          setConversationId(data.conversation.conversationId);
        }
      },
      onError: (error) => {
        console.error('Send message error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        toast.error('Failed to send message');
        setIsTyping(false);
      }
    }
  );

  // Admin send message mutation
  const sendAdminMessageMutation = useMutation(
    async (messageData) => {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/chat/admin/message', messageData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        setMessages(prev => [...prev, data.message]);
        setMessage('');
        setIsTyping(false);
        refetchConversations();
      },
      onError: (error) => {
        console.error('Send admin message error:', error);
        toast.error('Failed to send message');
        setIsTyping(false);
      }
    }
  );

  // Handle message send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    console.log('Handle send message called');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user);
    console.log('user.id:', user?.id);
    console.log('isAdmin:', isAdmin);
    
    // Check if user is properly authenticated
    if (!isAuthenticated || !user || !user.id) {
      console.error('User not properly authenticated');
      toast.error('Please login to send messages');
      return;
    }
    
    // Check if token is present
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      toast.error('Please login again');
      return;
    }

    const messageText = message.trim();
    setMessage('');
    setIsTyping(true);

    // Add user message to UI immediately
    const userMessage = {
      content: messageText,
      sender: 'user',
      senderId: user?.id,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send typing indicator
    if (socket && conversationId) {
      socket.emit('typing', { conversationId, userId: user?.id, isTyping: true });
    }

    try {
      if (isAdmin) {
        console.log('Sending admin message');
        await sendAdminMessageMutation.mutateAsync({
          conversationId,
          message: messageText
        });
      } else {
        console.log('Sending user message');
        const response = await sendMessageMutation.mutateAsync({
          message: messageText,
          conversationId
        });
        
        // If this was a new conversation, set the conversationId
        if (response.conversation && !conversationId) {
          setConversationId(response.conversation.conversationId);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      // Stop typing indicator
      if (socket && conversationId) {
        socket.emit('stop-typing', { conversationId, userId: user?.id });
      }
    }
  };

  // Handle typing
  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (socket && conversationId) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send typing indicator
      socket.emit('typing', { conversationId, userId: user?.id, isTyping: true });
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { conversationId, userId: user?.id });
      }, 1000);
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setIsOpen(true);
    // Add a welcome message
    const welcomeMessage = {
      content: "Hello! How can I help you report an issue today? 😊",
      sender: 'ai',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  // Select conversation (currently unused but kept for future admin features)
  // const selectConversation = (conv) => {
  //   setConversationId(conv.conversationId);
  //   setIsOpen(true);
  // };

  // Get message sender info
  const getMessageSender = (message) => {
    if (message.sender === 'user') {
      return { name: 'You', icon: User, color: 'bg-blue-500' };
    } else if (message.sender === 'admin') {
      return { name: 'Admin', icon: Shield, color: 'bg-purple-500' };
    } else if (message.sender === 'announcement') {
      return { name: 'Announcement', icon: Bell, color: 'bg-yellow-500' };
    } else {
      return { name: 'Civic Assistant', icon: Bot, color: 'bg-green-500' };
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Handle action button clicks
  const handleActionButton = (button, message) => {
    switch (button.action) {
      case 'report':
        // Navigate to report issue page with pre-filled category
        toast.success(`Redirecting to report ${button.category} issue...`);
        // You can implement navigation here
        break;
      case 'status':
        // Navigate to status page
        toast.success('Redirecting to status page...');
        break;
      case 'escalate':
        // Show escalation information
        toast.success(`Escalating to ${message.nlp.department}...`);
        break;
      case 'categories':
        // Show all issue categories
        toast.success('Showing all issue categories...');
        break;
      default:
        toast.info('Action not implemented yet');
    }
  };

  if (!isAuthenticated) {
    console.log('User not authenticated, chatbot not rendered');
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 ${
            isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <MessageCircle size={24} />
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl transition-all duration-300 ${
          isMinimized ? 'h-16 w-80' : 'h-96 w-80'
        }`}>
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot size={20} />
              <span className="font-semibold">
                {isAdmin ? 'Admin Chat' : 'Civic Assistant'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-primary-700 rounded p-1"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-primary-700 rounded p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 h-64">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Bot size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">
                      {isAdmin 
                        ? 'Select a conversation to start chatting'
                        : 'Hello! How can I help you report an issue today?'
                      }
                    </p>
                    {!isAdmin && (
                      <button
                        onClick={startNewConversation}
                        className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Start new conversation
                      </button>
                    )}
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const sender = getMessageSender(msg);
                    const SenderIcon = sender.icon;
                    const isUser = msg.sender === 'user';
                    
                    // Format AI responses for better readability
                    const displayContent = isUser ? msg.content : formatAIResponse(msg);
                    
                    return (
                      <div
                        key={index}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg ${
                            isUser
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <SenderIcon size={14} className={isUser ? 'text-white' : 'text-gray-600'} />
                            <span className="text-xs font-medium">
                              {sender.name}
                            </span>
                          </div>
                          <p className="text-sm">{displayContent}</p>
                          
                          {/* Show action buttons for AI responses */}
                          {!isUser && msg.nlp && msg.nlp.detected && (
                            <div className="mt-2 space-y-1">
                              {generateActionButtons(msg).slice(0, 2).map((button, btnIndex) => (
                                <button
                                  key={btnIndex}
                                  onClick={() => handleActionButton(button, msg)}
                                  className={`text-xs px-2 py-1 rounded ${
                                    button.variant === 'primary' 
                                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                                      : button.variant === 'urgent'
                                      ? 'bg-red-500 text-white hover:bg-red-600'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {button.text}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-sm">Someone is typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={handleTyping}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || isTyping}
                    className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    {isTyping ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Chatbot;
