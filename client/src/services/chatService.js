import axios from 'axios';

class ChatService {
  // Send a message to the chatbot
  static async sendMessage(message, conversationId = null) {
    try {
      const response = await axios.post('/api/chat/message', {
        message,
        conversationId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get user's conversations
  static async getConversations() {
    try {
      const response = await axios.get('/api/chat/conversations');
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  // Get specific conversation
  static async getConversation(conversationId) {
    try {
      const response = await axios.get(`/api/chat/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  // Admin: Send message to user's conversation
  static async sendAdminMessage(conversationId, message) {
    try {
      const response = await axios.post('/api/chat/admin/message', {
        conversationId,
        message
      });
      return response.data;
    } catch (error) {
      console.error('Error sending admin message:', error);
      throw error;
    }
  }

  // Admin: Get all conversations
  static async getAdminConversations(status = 'active', page = 1, limit = 20) {
    try {
      const response = await axios.get('/api/chat/admin/conversations', {
        params: { status, page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching admin conversations:', error);
      throw error;
    }
  }

  // Admin: Assign conversation to admin
  static async assignConversation(conversationId, adminId) {
    try {
      const response = await axios.put(`/api/chat/conversation/${conversationId}/assign`, {
        adminId
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning conversation:', error);
      throw error;
    }
  }

  // Admin: Update conversation status
  static async updateConversationStatus(conversationId, status) {
    try {
      const response = await axios.put(`/api/chat/conversation/${conversationId}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating conversation status:', error);
      throw error;
    }
  }
}

export default ChatService;
