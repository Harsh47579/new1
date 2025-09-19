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
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';

const AdminChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const { user } = useAuth();
  const { socket } = useSocket();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (selectedConversation && data.conversationId === selectedConversation.conversationId) {
        setSelectedConversation(prev => ({
          ...prev,
          messages: [...prev.messages, data.message]
        }));
        refetchConversations();
      }
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, selectedConversation]);

  // Fetch conversations
  const { data: conversationsData, refetch: refetchConversations } = useQuery(
    ['admin-conversations', statusFilter],
    async () => {
      const response = await axios.get('/api/chat/admin/conversations', {
        params: { status: statusFilter, page: 1, limit: 50 }
      });
      return response.data;
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchOnWindowFocus: true
    }
  );

  // Fetch specific conversation
  const { data: conversationData, refetch: refetchConversation } = useQuery(
    ['admin-conversation', selectedConversation?.conversationId],
    async () => {
      if (!selectedConversation) return null;
      const response = await axios.get(`/api/chat/conversation/${selectedConversation.conversationId}`);
      return response.data.conversation;
    },
    {
      enabled: !!selectedConversation,
      onSuccess: (data) => {
        if (data) {
          setSelectedConversation(data);
        }
      }
    }
  );

  // Send admin message mutation
  const sendMessageMutation = useMutation(
    async (messageData) => {
      const response = await axios.post('/api/chat/admin/message', messageData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setSelectedConversation(prev => ({
          ...prev,
          messages: [...prev.messages, data.message]
        }));
        setMessage('');
        setIsTyping(false);
        refetchConversations();
      },
      onError: (error) => {
        console.error('Send message error:', error);
        toast.error('Failed to send message');
        setIsTyping(false);
      }
    }
  );

  // Update conversation status mutation
  const updateStatusMutation = useMutation(
    async ({ conversationId, status }) => {
      const response = await axios.put(`/api/chat/conversation/${conversationId}/status`, {
        status
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Status updated successfully');
        refetchConversations();
      },
      onError: (error) => {
        console.error('Update status error:', error);
        toast.error('Failed to update status');
      }
    }
  );

  // Handle message send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedConversation || isTyping) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(true);

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversation.conversationId,
        message: messageText
      });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversationsData?.conversations?.filter(conv => {
    const matchesSearch = !searchTerm || 
      conv.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.conversationId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  // Get message sender info
  const getMessageSender = (message) => {
    if (message.sender === 'user') {
      return { name: 'User', icon: User, color: 'bg-blue-500' };
    } else if (message.sender === 'admin') {
      return { name: 'You', icon: Shield, color: 'bg-purple-500' };
    } else {
      return { name: 'AI Assistant', icon: Bot, color: 'bg-green-500' };
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      {/* Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 ${
            isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <MessageCircle size={24} />
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl transition-all duration-300 ${
          isMinimized ? 'h-16 w-96' : 'h-[600px] w-[800px]'
        }`}>
          {/* Header */}
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield size={20} />
              <span className="font-semibold">Admin Chat Panel</span>
              <span className="text-sm bg-purple-500 px-2 py-1 rounded">
                {conversationsData?.conversations?.length || 0} conversations
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-purple-700 rounded p-1"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-purple-700 rounded p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex h-[540px]">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Search and Filter */}
                <div className="p-3 border-b border-gray-200">
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="all">All</option>
                  </select>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.conversationId}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation?.conversationId === conv.conversationId
                          ? 'bg-purple-50 border-purple-200'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {conv.userId?.name || 'Unknown User'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          conv.status === 'active' ? 'bg-green-100 text-green-800' :
                          conv.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {conv.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {conv.userId?.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(conv.lastMessageAt)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                          <span className="text-xs text-red-600">
                            {conv.unreadCount} unread
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-sm">
                            {selectedConversation.userId?.name || 'Unknown User'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {selectedConversation.userId?.email}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={selectedConversation.status}
                            onChange={(e) => updateStatusMutation.mutate({
                              conversationId: selectedConversation.conversationId,
                              status: e.target.value
                            })}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="active">Active</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {selectedConversation.messages?.map((msg, index) => {
                        const sender = getMessageSender(msg);
                        const SenderIcon = sender.icon;
                        const isAdmin = msg.sender === 'admin';
                        
                        return (
                          <div
                            key={index}
                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-3 py-2 rounded-lg ${
                                isAdmin
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                <SenderIcon size={14} className={isAdmin ? 'text-white' : 'text-gray-600'} />
                                <span className="text-xs font-medium">
                                  {sender.name}
                                </span>
                              </div>
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {formatTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t p-3">
                      <form onSubmit={handleSendMessage} className="flex space-x-2">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={isTyping}
                        />
                        <button
                          type="submit"
                          disabled={!message.trim() || isTyping}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg px-3 py-2 transition-colors"
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
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Select a conversation to start chatting</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AdminChatbot;
