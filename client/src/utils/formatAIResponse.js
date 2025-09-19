/**
 * Utility function to transform structured AI responses into human-readable messages
 * @param {Object} jsonResponse - The structured response from the AI API
 * @returns {string} - Human-readable conversational message
 */

export const formatAIResponse = (jsonResponse) => {
  try {
    // Handle fallback responses
    if (jsonResponse.fallback) {
      return "I'm sorry, but I couldn't fully understand that. Please try rephrasing your question about civic care issues like water supply, garbage collection, road problems, street lighting, traffic issues, or drainage problems.";
    }

    // Handle error responses
    if (jsonResponse.error) {
      return "I apologize, but I'm having trouble processing your message right now. Please try again or contact support directly.";
    }

    // Extract the main message content
    let message = '';
    
    if (jsonResponse.message && jsonResponse.message.content) {
      message = jsonResponse.message.content;
    } else if (typeof jsonResponse === 'string') {
      message = jsonResponse;
    } else {
      message = "I'm here to help with civic care issues. How can I assist you today?";
    }

    // Start with the main message
    let formattedMessage = message;

    // Add category information if available
    if (jsonResponse.nlp && jsonResponse.nlp.detected && jsonResponse.nlp.category) {
      const categoryMap = {
        'water': 'water supply',
        'garbage': 'waste management',
        'pothole': 'road maintenance',
        'lighting': 'street lighting',
        'traffic': 'traffic management',
        'drainage': 'drainage and sewage',
        'general': 'general civic care'
      };
      
      const categoryName = categoryMap[jsonResponse.nlp.category] || jsonResponse.nlp.category;
      formattedMessage += ` We've classified this as a ${categoryName} issue.`;
    }

    // Add department information if available
    if (jsonResponse.nlp && jsonResponse.nlp.department && jsonResponse.nlp.department !== 'General Support') {
      formattedMessage += ` This will be handled by the ${jsonResponse.nlp.department}.`;
    }

    // Add a follow-up question to make it more conversational
    if (jsonResponse.nlp && jsonResponse.nlp.followUp && Array.isArray(jsonResponse.nlp.followUp) && jsonResponse.nlp.followUp.length > 0) {
      const randomFollowUp = jsonResponse.nlp.followUp[Math.floor(Math.random() * jsonResponse.nlp.followUp.length)];
      formattedMessage += ` ${randomFollowUp}`;
    }

    // Add escalation information for urgent issues
    if (jsonResponse.nlp && jsonResponse.nlp.escalation && jsonResponse.nlp.category === 'drainage') {
      formattedMessage += ` For urgent drainage issues, you can also ${jsonResponse.nlp.escalation.toLowerCase()}.`;
    }

    return formattedMessage;

  } catch (error) {
    console.error('Error formatting AI response:', error);
    return "I'm here to help with civic care issues. You can ask about water supply, garbage collection, road problems, street lighting, traffic issues, or drainage problems. How can I assist you today?";
  }
};

/**
 * Enhanced version that returns both the formatted message and metadata
 * @param {Object} jsonResponse - The structured response from the AI API
 * @returns {Object} - Object containing formatted message and metadata
 */
export const formatAIResponseWithMetadata = (jsonResponse) => {
  const formattedMessage = formatAIResponse(jsonResponse);
  
  return {
    message: formattedMessage,
    metadata: {
      category: jsonResponse.nlp?.category || 'general',
      department: jsonResponse.nlp?.department || 'General Support',
      confidence: jsonResponse.nlp?.confidence || 0,
      followUp: jsonResponse.nlp?.followUp || [],
      escalation: jsonResponse.nlp?.escalation || null,
      isFallback: jsonResponse.fallback || false,
      isError: jsonResponse.error || false
    }
  };
};

/**
 * Generate quick action buttons based on the AI response
 * @param {Object} jsonResponse - The structured response from the AI API
 * @returns {Array} - Array of action button objects
 */
export const generateActionButtons = (jsonResponse) => {
  const buttons = [];

  if (jsonResponse.nlp && jsonResponse.nlp.detected) {
    // Add "Report Issue" button for detected categories
    buttons.push({
      text: "Report This Issue",
      action: "report",
      variant: "primary",
      category: jsonResponse.nlp.category
    });

    // Add "Get Updates" button
    buttons.push({
      text: "Get Status Updates",
      action: "status",
      variant: "secondary"
    });

    // Add escalation button for urgent issues
    if (jsonResponse.nlp.category === 'drainage' || jsonResponse.nlp.category === 'traffic') {
      buttons.push({
        text: "Contact Department",
        action: "escalate",
        variant: "urgent",
        escalation: jsonResponse.nlp.escalation
      });
    }
  }

  // Add general help button
  buttons.push({
    text: "View All Categories",
    action: "categories",
    variant: "outline"
  });

  return buttons;
};

/**
 * Format confidence level into human-readable text
 * @param {number} confidence - Confidence score (0-1)
 * @returns {string} - Human-readable confidence description
 */
export const formatConfidence = (confidence) => {
  if (confidence >= 0.8) return "High confidence";
  if (confidence >= 0.5) return "Medium confidence";
  if (confidence >= 0.2) return "Low confidence";
  return "Very low confidence";
};

/**
 * Generate suggested follow-up questions
 * @param {Object} jsonResponse - The structured response from the AI API
 * @returns {Array} - Array of suggested questions
 */
export const generateSuggestedQuestions = (jsonResponse) => {
  const suggestions = [];

  if (jsonResponse.nlp && jsonResponse.nlp.followUp) {
    suggestions.push(...jsonResponse.nlp.followUp.slice(0, 2));
  }

  // Add general suggestions
  suggestions.push(
    "How do I report a new issue?",
    "What's the status of my previous reports?",
    "How can I contact the department directly?"
  );

  return suggestions.slice(0, 3); // Return max 3 suggestions
};

export default formatAIResponse;
