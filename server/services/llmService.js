const axios = require('axios');
const logger = require('../utils/logger');

/**
 * LLM Service for generating dynamic, engaging chatbot responses
 * This service interfaces with various LLM providers to generate unique responses
 */
class LLMService {
  constructor() {
    this.providers = {
      // OpenAI GPT-3.5/4
      openai: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY
      },
      // Anthropic Claude
      claude: {
        apiUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-sonnet-20240229',
        apiKey: process.env.ANTHROPIC_API_KEY
      },
      // Local LLM (Ollama)
      ollama: {
        apiUrl: 'http://localhost:11434/api/generate',
        model: 'llama3.1:8b'
      }
    };
    
    this.defaultProvider = process.env.LLM_PROVIDER || 'ollama';
    this.fallbackEnabled = true;
  }

  /**
   * Generate a dynamic response using LLM
   * @param {Object} params - Response generation parameters
   * @param {string} params.userMessage - The user's original message
   * @param {Object} params.nlpData - NLP analysis data
   * @param {string} params.nlpData.category - Detected category
   * @param {string} params.nlpData.department - Relevant department
   * @param {number} params.nlpData.confidence - Detection confidence
   * @param {Array} params.nlpData.followUp - Follow-up questions
   * @param {string} params.nlpData.escalation - Escalation contact
   * @returns {Promise<string>} Generated response
   */
  async generateResponse({ userMessage, nlpData }) {
    try {
      const prompt = this.buildPrompt(userMessage, nlpData);
      
      // Try primary provider first
      let response = await this.callLLM(this.defaultProvider, prompt);
      
      // If primary fails and fallback is enabled, try fallback providers
      if (!response && this.fallbackEnabled) {
        response = await this.tryFallbackProviders(prompt);
      }
      
      // If all LLM providers fail, try simple text generation
      if (!response) {
        response = this.generateSimpleDynamicResponse(userMessage, nlpData);
      }
      
      // Final fallback to enhanced rule-based responses
      if (!response) {
        response = this.generateEnhancedFallback(userMessage, nlpData);
      }
      
      return response;
      
    } catch (error) {
      logger.error('LLM generation error:', error);
      return this.generateEnhancedFallback(userMessage, nlpData);
    }
  }

  /**
   * Build the prompt for LLM generation
   */
  buildPrompt(userMessage, nlpData) {
    const systemPrompt = `You are a friendly, empathetic, and intelligent civic assistant for a smart city platform. Your role is to help citizens report and resolve civic issues like water supply, garbage collection, road problems, street lighting, traffic issues, and drainage problems.

IMPORTANT INSTRUCTIONS:
1. Generate a UNIQUE, CONVERSATIONAL response for each interaction - NEVER repeat the same message
2. Be warm, helpful, and empathetic
3. Show that you understand the user's issue by referencing the detected category
4. Mention the relevant department to demonstrate your intelligence
5. Ask ONE engaging follow-up question to continue the conversation
6. Keep responses concise (2-3 sentences maximum)
7. Use a natural, conversational tone
8. Avoid robotic or template-like language

CONTEXT:
- User's message: "${userMessage}"
- Detected category: ${nlpData.category}
- Relevant department: ${nlpData.department}
- Confidence level: ${Math.round(nlpData.confidence * 100)}%
- Follow-up questions available: ${nlpData.followUp.join(', ')}

Generate a unique, engaging response that acknowledges their issue, shows understanding, and asks a helpful follow-up question.`;

    return {
      system: systemPrompt,
      user: userMessage
    };
  }

  /**
   * Call the specified LLM provider
   */
  async callLLM(provider, prompt) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unknown LLM provider: ${provider}`);
    }

    try {
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(config, prompt);
        case 'claude':
          return await this.callClaude(config, prompt);
        case 'ollama':
          return await this.callOllama(config, prompt);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error(`${provider} API error:`, error.message);
      return null;
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(config, prompt) {
    const response = await axios.post(config.apiUrl, {
      model: config.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      max_tokens: 150,
      temperature: 0.8,
      presence_penalty: 0.6
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Call Claude API
   */
  async callClaude(config, prompt) {
    const response = await axios.post(config.apiUrl, {
      model: config.model,
      max_tokens: 150,
      temperature: 0.8,
      messages: [
        { role: 'user', content: `${prompt.system}\n\nUser message: ${prompt.user}` }
      ]
    }, {
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });

    return response.data.content[0].text.trim();
  }

  /**
   * Call Ollama (local LLM)
   */
  async callOllama(config, prompt) {
    const response = await axios.post(config.apiUrl, {
      model: config.model,
      prompt: `${prompt.system}\n\nUser: ${prompt.user}\n\nAssistant:`,
      stream: false,
      options: {
        temperature: 0.8,
        top_p: 0.9,
        max_tokens: 150
      }
    }, {
      timeout: 15000
    });

    return response.data.response.trim();
  }

  /**
   * Try fallback providers if primary fails
   */
  async tryFallbackProviders(prompt) {
    const fallbackProviders = Object.keys(this.providers).filter(p => p !== this.defaultProvider);
    
    for (const provider of fallbackProviders) {
      try {
        const response = await this.callLLM(provider, prompt);
        if (response) {
          logger.info(`Fallback to ${provider} successful`);
          return response;
        }
      } catch (error) {
        logger.warn(`Fallback ${provider} failed:`, error.message);
      }
    }
    
    return null;
  }

  /**
   * Enhanced rule-based fallback with more variety and context awareness
   */
  generateEnhancedFallback(userMessage, nlpData) {
    // Create a more dynamic response based on the user's message and context
    const contextualResponse = this.generateContextualResponse(userMessage, nlpData);
    const dynamicFollowUp = this.generateDynamicFollowUp(nlpData, userMessage);
    
    return `${contextualResponse} ${dynamicFollowUp}`;
  }

  /**
   * Generate simple dynamic response without external LLM
   */
  generateSimpleDynamicResponse(userMessage, nlpData) {
    const userWords = userMessage.toLowerCase().split(' ');
    const category = nlpData.category;
    const department = nlpData.department;
    
    // Create dynamic templates based on user input
    const templates = {
      water: [
        `I understand you're dealing with water issues - that can be really frustrating!`,
        `Water problems are definitely something we need to address quickly.`,
        `I can see this is about water supply, and I want to help you get this resolved.`,
        `Water issues affect daily life significantly, so let's get this sorted out.`,
        `I hear you on the water problem - these are critical issues that need immediate attention.`
      ],
      garbage: [
        `Garbage collection issues are important for community health - let's tackle this together.`,
        `I understand your concern about waste management - it's a vital service.`,
        `Garbage problems can really impact the neighborhood, so I'm here to help.`,
        `Waste management is crucial for our city's cleanliness - let's resolve this.`,
        `I can help you with this garbage collection issue right away.`
      ],
      pothole: [
        `Potholes are serious safety hazards - I'm glad you're reporting this!`,
        `Road safety is paramount, and potholes definitely need immediate attention.`,
        `I understand your concern about road conditions - let's get this fixed.`,
        `Potholes can cause vehicle damage and accidents - thanks for bringing this up.`,
        `Road maintenance is essential, and I'm here to help with this pothole issue.`
      ],
      lighting: [
        `Street lighting is crucial for safety - let's address this lighting concern.`,
        `I understand how important proper lighting is for community safety.`,
        `Lighting issues can affect everyone's safety - I'm here to help resolve this.`,
        `Street lights are essential infrastructure - let's get this sorted.`,
        `I can help you with this lighting problem right away.`
      ],
      traffic: [
        `Traffic issues can really disrupt daily life - let's work on resolving this.`,
        `I understand your traffic concerns - these affect many people in the area.`,
        `Traffic management is important for everyone's safety and convenience.`,
        `Let's address this traffic issue to improve flow and safety.`,
        `I'm here to help with your traffic-related concern.`
      ],
      drainage: [
        `Drainage problems can be serious, especially during heavy rains - let's address this.`,
        `I understand your drainage concern - these issues need prompt attention.`,
        `Flooding and drainage problems affect the whole community - I'm here to help.`,
        `Drainage is critical infrastructure - let's get this resolved quickly.`,
        `I can help you with this drainage issue right away.`
      ],
      general: [
        `I'm here to help you with any civic issue you're facing.`,
        `Let me assist you with your civic care concern.`,
        `I want to make sure we address your issue properly.`,
        `Your civic issue is important to me - let's work together on this.`,
        `I'm ready to help you resolve whatever civic problem you're experiencing.`
      ]
    };

    // Select base response
    const categoryTemplates = templates[category] || templates.general;
    let response = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
    
    // Add personalization based on user's specific words
    if (userWords.includes('urgent') || userWords.includes('emergency')) {
      response = response.replace('important', 'urgent').replace('help', 'immediately help');
    }
    
    if (userWords.includes('big') || userWords.includes('large') || userWords.includes('huge')) {
      response = response.replace('issue', 'major issue').replace('problem', 'significant problem');
    }
    
    // Add dynamic follow-up
    const followUp = this.generateDynamicFollowUp(nlpData, userMessage);
    
    return `${response} ${followUp}`;
  }

  /**
   * Generate contextual response based on user message and NLP data
   */
  generateContextualResponse(userMessage, nlpData) {
    const userWords = userMessage.toLowerCase().split(' ');
    const category = nlpData.category;
    const department = nlpData.department;
    
    // Create response variations based on user's specific words
    const contextualVariations = {
      water: [
        `I can see you're dealing with water issues - that's really important to address.`,
        `Water problems can be quite frustrating, and I want to help you get this resolved.`,
        `I understand your water concern, and we need to make sure this gets proper attention.`,
        `Water supply issues affect everyone in the area, so let's tackle this together.`,
        `I hear you on the water problem - these are critical issues that need immediate attention.`
      ],
      garbage: [
        `Garbage collection issues are important for community health - let's get this sorted.`,
        `I understand your waste management concern - cleanliness is crucial for everyone.`,
        `Garbage problems can really impact the neighborhood, so I'm here to help.`,
        `Waste management is vital for our city's cleanliness - let's resolve this quickly.`,
        `I can help you with this garbage collection issue right away.`
      ],
      pothole: [
        `Potholes are serious safety hazards - I'm glad you're reporting this!`,
        `Road safety is paramount, and potholes definitely need immediate attention.`,
        `I understand your concern about road conditions - let's get this fixed.`,
        `Potholes can cause vehicle damage and accidents - thanks for bringing this up.`,
        `Road maintenance is essential, and I'm here to help with this pothole issue.`
      ],
      lighting: [
        `Street lighting is crucial for safety - let's address this lighting concern.`,
        `I understand how important proper lighting is for community safety.`,
        `Lighting issues can affect everyone's safety - I'm here to help resolve this.`,
        `Street lights are essential infrastructure - let's get this sorted.`,
        `I can help you with this lighting problem right away.`
      ],
      traffic: [
        `Traffic issues can really disrupt daily life - let's work on resolving this.`,
        `I understand your traffic concerns - these affect many people in the area.`,
        `Traffic management is important for everyone's safety and convenience.`,
        `Let's address this traffic issue to improve flow and safety.`,
        `I'm here to help with your traffic-related concern.`
      ],
      drainage: [
        `Drainage problems can be serious, especially during heavy rains - let's address this.`,
        `I understand your drainage concern - these issues need prompt attention.`,
        `Flooding and drainage problems affect the whole community - I'm here to help.`,
        `Drainage is critical infrastructure - let's get this resolved quickly.`,
        `I can help you with this drainage issue right away.`
      ],
      general: [
        `I'm here to help you with any civic issue you're facing.`,
        `Let me assist you with your civic care concern.`,
        `I want to make sure we address your issue properly.`,
        `Your civic issue is important to me - let's work together on this.`,
        `I'm ready to help you resolve whatever civic problem you're experiencing.`
      ]
    };

    // Select response based on category and user's specific words
    const categoryResponses = contextualVariations[category] || contextualVariations.general;
    
    // Add more personalization based on user's specific words
    let selectedResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    
    // Customize based on specific words in user message
    if (userWords.includes('urgent') || userWords.includes('emergency')) {
      selectedResponse = selectedResponse.replace('important', 'urgent').replace('help', 'immediately help');
    }
    
    if (userWords.includes('big') || userWords.includes('large') || userWords.includes('huge')) {
      selectedResponse = selectedResponse.replace('issue', 'major issue').replace('problem', 'significant problem');
    }
    
    return selectedResponse;
  }

  /**
   * Generate dynamic follow-up questions
   */
  generateDynamicFollowUp(nlpData, userMessage) {
    const followUpQuestions = nlpData.followUp || [];
    const userWords = userMessage.toLowerCase();
    
    // Select follow-up based on user's message context
    let selectedFollowUp;
    
    if (userWords.includes('where') || userWords.includes('location')) {
      selectedFollowUp = followUpQuestions.find(q => q.toLowerCase().includes('location') || q.toLowerCase().includes('area')) || followUpQuestions[0];
    } else if (userWords.includes('when') || userWords.includes('time')) {
      selectedFollowUp = followUpQuestions.find(q => q.toLowerCase().includes('time') || q.toLowerCase().includes('when')) || followUpQuestions[0];
    } else if (userWords.includes('how') || userWords.includes('bad')) {
      selectedFollowUp = followUpQuestions.find(q => q.toLowerCase().includes('how') || q.toLowerCase().includes('big')) || followUpQuestions[0];
    } else {
      selectedFollowUp = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
    }
    
    // Add variety to the question phrasing
    const questionVariations = [
      `Let me ask you this: ${selectedFollowUp.toLowerCase()}`,
      `I'd like to know: ${selectedFollowUp.toLowerCase()}`,
      `Could you tell me ${selectedFollowUp.toLowerCase()}?`,
      `To help you better, ${selectedFollowUp.toLowerCase()}`,
      `I need to understand: ${selectedFollowUp.toLowerCase()}`,
      `Can you provide more details about ${selectedFollowUp.toLowerCase()}?`
    ];
    
    return questionVariations[Math.floor(Math.random() * questionVariations.length)];
  }

  /**
   * Get enhanced responses with more variety
   */
  getEnhancedResponses(category) {
    const enhancedResponses = {
      water: [
        "I understand you're having water supply issues - that can be really frustrating!",
        "Water problems are definitely something we need to address quickly.",
        "I can see this is about water supply, and I want to help you get this resolved.",
        "Water issues affect daily life significantly, so let's get this sorted out.",
        "I hear you on the water problem - these are critical issues that need immediate attention."
      ],
      garbage: [
        "Garbage collection issues are important for community health - let's tackle this together.",
        "I understand your concern about waste management - it's a vital service.",
        "Garbage problems can really impact the neighborhood, so I'm here to help.",
        "Waste management is crucial for our city's cleanliness - let's resolve this.",
        "I can help you with this garbage collection issue right away."
      ],
      pothole: [
        "Potholes are serious safety hazards - I'm glad you're reporting this!",
        "Road safety is paramount, and potholes definitely need immediate attention.",
        "I understand your concern about road conditions - let's get this fixed.",
        "Potholes can cause vehicle damage and accidents - thanks for bringing this up.",
        "Road maintenance is essential, and I'm here to help with this pothole issue."
      ],
      lighting: [
        "Street lighting is crucial for safety - let's address this lighting concern.",
        "I understand how important proper lighting is for community safety.",
        "Lighting issues can affect everyone's safety - I'm here to help resolve this.",
        "Street lights are essential infrastructure - let's get this sorted.",
        "I can help you with this lighting problem right away."
      ],
      traffic: [
        "Traffic issues can really disrupt daily life - let's work on resolving this.",
        "I understand your traffic concerns - these affect many people in the area.",
        "Traffic management is important for everyone's safety and convenience.",
        "Let's address this traffic issue to improve flow and safety.",
        "I'm here to help with your traffic-related concern."
      ],
      drainage: [
        "Drainage problems can be serious, especially during heavy rains - let's address this.",
        "I understand your drainage concern - these issues need prompt attention.",
        "Flooding and drainage problems affect the whole community - I'm here to help.",
        "Drainage is critical infrastructure - let's get this resolved quickly.",
        "I can help you with this drainage issue right away."
      ],
      general: [
        "I'm here to help you with any civic issue you're facing.",
        "Let me assist you with your civic care concern.",
        "I want to make sure we address your issue properly.",
        "Your civic issue is important to me - let's work together on this.",
        "I'm ready to help you resolve whatever civic problem you're experiencing."
      ]
    };

    return enhancedResponses[category] || enhancedResponses.general;
  }

  /**
   * Check if LLM service is available
   */
  async checkHealth() {
    try {
      const testPrompt = {
        system: "You are a helpful assistant. Respond with just 'OK'.",
        user: "Hello"
      };
      
      const response = await this.callLLM(this.defaultProvider, testPrompt);
      return {
        success: true,
        provider: this.defaultProvider,
        response: response ? 'OK' : 'No response'
      };
    } catch (error) {
      return {
        success: false,
        provider: this.defaultProvider,
        error: error.message
      };
    }
  }
}

module.exports = new LLMService();
