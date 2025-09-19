const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const ChatConversation = require('../models/ChatConversation');
const User = require('../models/User');
const AIService = require('../services/AIService');
const llmService = require('../services/llmService');

// @route   POST /api/chat/message
// @desc    Send a message to the AI chatbot with enhanced civic care NLP
// @access  Private
router.post('/message', auth, [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('conversationId').optional().isString()
], async (req, res) => {
  try {
    console.log('🔍 Chat message request received:', {
      headers: req.headers,
      body: req.body,
      userId: req.userId,
      user: req.user,
      timestamp: new Date().toISOString()
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        errors: errors.array(),
        message: 'Invalid message format'
      });
    }

    const { message, conversationId } = req.body;
    const userId = req.userId;
    
    console.log('💬 Processing message:', { 
      message: message.substring(0, 100) + '...', 
      conversationId, 
      userId 
    });

    // Enhanced NLP processing for civic care issues
    const nlpResponse = processCivicCareMessage(message);
    
    let aiResponse;
    let conversation;
    
    try {
      // Find or create conversation
      if (conversationId) {
        conversation = await ChatConversation.findOne({ 
          conversationId, 
          userId,
          isActive: true 
        });
      }
      
      if (!conversation) {
        conversation = await ChatConversation.findOrCreate(userId);
      }

      // Add user message
      await conversation.addMessage(message, 'user', userId);

      // Generate dynamic response using LLM
      console.log('🤖 Generating dynamic response using LLM');
      try {
        aiResponse = await llmService.generateResponse({
          userMessage: message,
          nlpData: {
            category: nlpResponse.category,
            department: nlpResponse.department,
            confidence: nlpResponse.confidence,
            followUp: nlpResponse.followUp,
            escalation: nlpResponse.escalation
          }
        });
        console.log('✅ LLM response generated:', aiResponse);
      } catch (llmError) {
        console.error('❌ LLM generation failed, using fallback:', llmError.message);
        // Fallback to enhanced rule-based response
        aiResponse = llmService.generateEnhancedFallback(message, {
          category: nlpResponse.category,
          department: nlpResponse.department,
          confidence: nlpResponse.confidence,
          followUp: nlpResponse.followUp,
          escalation: nlpResponse.escalation
        });
      }

      // Add AI response
      await conversation.addMessage(aiResponse, 'ai');

      // Get updated conversation
      const updatedConversation = await ChatConversation.findById(conversation._id)
        .populate('userId', 'name email')
        .populate('assignedAdmin', 'name email');

      // Emit real-time message to user
      const io = req.app.get('io');
      if (io) {
        io.to(`chat-${conversation.conversationId}`).emit('new-message', {
          conversationId: conversation.conversationId,
          message: {
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date()
          }
        });
      }

      console.log('✅ Chat response sent successfully');

      res.json({
        success: true,
        conversation: updatedConversation,
        message: {
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        },
        nlp: nlpResponse ? { 
          detected: true, 
          category: nlpResponse.category,
          department: nlpResponse.department,
          confidence: nlpResponse.confidence,
          followUp: nlpResponse.followUp,
          escalation: nlpResponse.escalation
        } : null,
        generation: {
          method: 'llm',
          timestamp: new Date(),
          provider: process.env.LLM_PROVIDER || 'ollama'
        }
      });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      
      // Fallback: Return NLP response without saving to database
      aiResponse = nlpResponse.message || nlpResponse;
      
      res.json({
        success: true,
        message: {
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        },
        fallback: true,
        nlp: nlpResponse ? { 
          detected: true, 
          category: nlpResponse.category,
          department: nlpResponse.department,
          confidence: nlpResponse.confidence,
          followUp: nlpResponse.followUp,
          escalation: nlpResponse.escalation
        } : null
      });
    }

  } catch (error) {
    console.error('🔥 Chat message critical error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    
    // Always return a valid JSON response, never crash
    res.json({
      success: true,
      message: {
        content: "I apologize, but I'm having trouble processing your message right now. Please try again or contact support directly.",
        sender: 'ai',
        timestamp: new Date()
      },
      error: true,
      fallback: true
    });
  }
});

// @route   GET /api/chat/conversations
// @desc    Get user's chat conversations
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const conversations = await ChatConversation.find({ 
      userId, 
      isActive: true 
    })
    .populate('userId', 'name email')
    .populate('assignedAdmin', 'name email')
    .sort({ lastMessageAt: -1 })
    .limit(10);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
});

// @route   GET /api/chat/conversation/:conversationId
// @desc    Get specific conversation with messages
// @access  Private
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await ChatConversation.findOne({
      conversationId,
      userId,
      isActive: true
    })
    .populate('userId', 'name email')
    .populate('assignedAdmin', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Mark messages as read
    await conversation.markAsRead();

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation'
    });
  }
});

// @route   POST /api/chat/admin/message
// @desc    Send admin message to user's conversation
// @access  Private (Admin only)
router.post('/admin/message', auth, [
  body('conversationId').isString().withMessage('Conversation ID is required'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
], async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId, message } = req.body;

    const conversation = await ChatConversation.findOne({
      conversationId,
      isActive: true
    }).populate('userId', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Add admin message
    await conversation.addMessage(message, 'admin', req.userId);

    // Get updated conversation
    const updatedConversation = await ChatConversation.findById(conversation._id)
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email');

    // Emit real-time message to user
    const io = req.app.get('io');
    if (io) {
      io.to(`chat-${conversation.conversationId}`).emit('new-message', {
        conversationId: conversation.conversationId,
        message: {
          content: message,
          sender: 'admin',
          senderId: req.userId,
          timestamp: new Date()
        }
      });
    }

    res.json({
      success: true,
      conversation: updatedConversation,
      message: {
        content: message,
        sender: 'admin',
        senderId: req.userId,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Admin message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending admin message'
    });
  }
});

// @route   GET /api/chat/admin/conversations
// @desc    Get all conversations for admin panel
// @access  Private (Admin only)
router.get('/admin/conversations', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { status = 'active', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const conversations = await ChatConversation.find({
      isActive: status === 'all' ? { $exists: true } : status === 'active'
    })
    .populate('userId', 'name email')
    .populate('assignedAdmin', 'name email')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await ChatConversation.countDocuments({
      isActive: status === 'all' ? { $exists: true } : status === 'active'
    });

    res.json({
      success: true,
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
});

// @route   PUT /api/chat/conversation/:conversationId/assign
// @desc    Assign conversation to admin
// @access  Private (Admin only)
router.put('/conversation/:conversationId/assign', auth, [
  body('adminId').isMongoId().withMessage('Valid admin ID is required')
], async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { adminId } = req.body;

    const conversation = await ChatConversation.findOneAndUpdate(
      { conversationId, isActive: true },
      { assignedAdmin: adminId },
      { new: true }
    )
    .populate('userId', 'name email')
    .populate('assignedAdmin', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Assign conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning conversation'
    });
  }
});

// @route   PUT /api/chat/conversation/:conversationId/status
// @desc    Update conversation status
// @access  Private (Admin only)
router.put('/conversation/:conversationId/status', auth, [
  body('status').isIn(['active', 'resolved', 'closed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { status } = req.body;

    const conversation = await ChatConversation.findOneAndUpdate(
      { conversationId },
      { status, isActive: status === 'active' },
      { new: true }
    )
    .populate('userId', 'name email')
    .populate('assignedAdmin', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Update conversation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating conversation status'
    });
  }
});

/**
 * Enhanced NLP processing for civic care issues
 * Detects common civic issues and provides intelligent responses
 */
function processCivicCareMessage(message) {
  try {
    const lowerMessage = message.toLowerCase();
    
    // Define civic care issue categories with keywords
    const civicCategories = {
      water: {
        keywords: ['water', 'drinking water', 'water supply', 'tap water', 'water pressure', 'water quality', 'leak', 'leakage', 'pipeline', 'water tank', 'water problem', 'water issue'],
        responses: [
          "It looks like your query is about water supply. Please provide location details to report this issue.",
          "Water issues are handled by the Water Department. Would you like me to help you file a report?",
          "I can help you report water-related issues. Please tell me your location and the specific problem."
        ],
        department: "Water Department",
        escalation: "Contact Water Department at +91-XXX-XXXX"
      },
      
      garbage: {
        keywords: ['garbage', 'waste', 'trash', 'rubbish', 'litter', 'dumping', 'collection', 'dustbin', 'bin', 'cleanliness'],
        responses: [
          "Garbage issues are usually handled by Waste Management. Do you want me to file a report?",
          "I can help you report waste management issues. Please specify your location and the type of problem.",
          "Waste collection problems can be reported through our system. Let me help you with that."
        ],
        department: "Waste Management",
        escalation: "Contact Waste Management at +91-XXX-XXXX"
      },
      
      pothole: {
        keywords: ['pothole', 'potholes', 'road', 'street', 'pavement', 'asphalt', 'crater', 'road damage', 'bumpy road', 'road repair', 'hole in road', 'road hole'],
        responses: [
          "I can help you report pothole issues! Potholes are a serious road safety concern. Please provide the exact location so we can get this fixed quickly.",
          "Pothole reports are prioritized for public safety. Tell me the street name and approximate location, and I'll help you file a report with the Roads Department.",
          "Road potholes can cause vehicle damage and accidents. I'll help you report this to the Roads Department right away. What's the exact location?"
        ],
        department: "Roads Department",
        escalation: "Contact Roads Department at +91-XXX-XXXX"
      },
      
      lighting: {
        keywords: ['light', 'street light', 'lamp', 'lighting', 'dark', 'broken light', 'flickering', 'power', 'electricity', 'outage'],
        responses: [
          "Street lighting issues are handled by the Electricity Department. Let me help you report this.",
          "I can help you report lighting problems. Please specify the location and describe the issue.",
          "Power and lighting issues can be reported through our system. What's the exact location?"
        ],
        department: "Electricity Department",
        escalation: "Contact Electricity Department at +91-XXX-XXXX"
      },
      
      traffic: {
        keywords: ['traffic', 'signal', 'jam', 'congestion', 'parking', 'vehicle', 'roadblock', 'accident', 'rush hour'],
        responses: [
          "Traffic issues are managed by Traffic Police. For urgent matters, contact them directly.",
          "I can help you report traffic-related problems. Please provide location and time details.",
          "Traffic management issues can be escalated to the Traffic Department. Let me help you report this."
        ],
        department: "Traffic Police",
        escalation: "Contact Traffic Police at +91-XXX-XXXX"
      },
      
      drainage: {
        keywords: ['drain', 'sewer', 'flooding', 'water logging', 'blocked drain', 'sewage', 'overflow', 'monsoon', 'rain'],
        responses: [
          "Drainage issues are critical during monsoon. Please provide immediate location details.",
          "I can help you report drainage problems. This is urgent - please specify the exact location.",
          "Drainage and sewage issues require immediate attention. Let me help you report this quickly."
        ],
        department: "Municipal Corporation",
        escalation: "Contact Municipal Corporation at +91-XXX-XXXX"
      }
    };
    
    // Detect issue category
    let detectedCategory = null;
    let confidence = 0;
    
    for (const [category, config] of Object.entries(civicCategories)) {
      const matches = config.keywords.filter(keyword => lowerMessage.includes(keyword));
      let categoryConfidence = matches.length / config.keywords.length;
      
      // Boost confidence for compound phrases
      if (matches.length > 0) {
        const compoundPhrases = lowerMessage.split(' ').filter(word => 
          config.keywords.some(keyword => keyword.includes(word) || word.includes(keyword))
        );
        if (compoundPhrases.length > 1) {
          categoryConfidence += 0.2; // Boost confidence for compound phrases
        }
      }
      
      if (categoryConfidence > confidence) {
        confidence = categoryConfidence;
        detectedCategory = category;
      }
    }
    
    // Generate response based on detected category
    if (detectedCategory && confidence > 0.1) {
      const categoryConfig = civicCategories[detectedCategory];
      const randomResponse = categoryConfig.responses[Math.floor(Math.random() * categoryConfig.responses.length)];
      
      return {
        message: randomResponse,
        category: detectedCategory,
        department: categoryConfig.department,
        escalation: categoryConfig.escalation,
        confidence: confidence,
        followUp: generateFollowUpQuestions(detectedCategory)
      };
    }
    
    // Default response for unrecognized messages
    return {
      message: "I'm here to help with civic care issues. You can ask about water supply, garbage collection, road problems, street lighting, traffic issues, or drainage problems. How can I assist you today?",
      category: 'general',
      department: 'General Support',
      confidence: 0,
      followUp: [
        "What type of civic issue are you facing?",
        "Please provide your location for better assistance",
        "Would you like to file a formal report?"
      ]
    };
    
  } catch (error) {
    console.error('NLP processing error:', error);
    return {
      message: "I didn't understand your query. Please try again with more details about your civic care issue.",
      category: 'error',
      confidence: 0
    };
  }
}

/**
 * Generate follow-up questions based on detected category
 */
function generateFollowUpQuestions(category) {
  const followUpMap = {
    water: [
      "What's your exact location?",
      "Is this affecting multiple households?",
      "How long has this issue been going on?",
      "Is the water completely unavailable or just low pressure?"
    ],
    garbage: [
      "Which area is affected?",
      "Is this about collection timing or overflowing bins?",
      "Are you reporting for a residential or commercial area?",
      "How many days has garbage not been collected?"
    ],
    pothole: [
      "What's the exact street name and area where the pothole is located?",
      "How big is the pothole? (small, medium, large)",
      "Is the pothole causing traffic problems or vehicle damage?",
      "Have you seen any accidents or near-misses due to this pothole?",
      "Is this pothole on a main road or residential street?"
    ],
    lighting: [
      "Which street or area is affected?",
      "Is the light completely off or flickering?",
      "How many street lights are not working?",
      "Is this a recurring problem?"
    ],
    traffic: [
      "What's the location of the traffic issue?",
      "What time of day does this usually happen?",
      "Is this about traffic signals or road congestion?",
      "Has this caused any accidents?"
    ],
    drainage: [
      "Which area is experiencing waterlogging?",
      "Is this blocking road access?",
      "Are homes getting flooded?",
      "Is this a recurring issue during rains?"
    ]
  };
  
  return followUpMap[category] || [
    "Can you provide more details?",
    "What's your location?",
    "How urgent is this issue?"
  ];
}

// @route   GET /api/chat/llm-health
// @desc    Check LLM service health
// @access  Private (Admin only)
router.get('/llm-health', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }

    const health = await llmService.checkHealth();
    
    res.json({
      success: true,
      llm: health,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('LLM health check error:', error);
    res.status(500).json({
      success: false,
      message: 'LLM health check failed',
      error: error.message
    });
  }
});

module.exports = router;
