const express = require('express');
const multer = require('multer');
const AIService = require('../services/AIService');

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   POST /api/ai/analyze-issue
// @desc    Analyze issue and suggest category, priority, and description
// @access  Public
router.post('/analyze-issue', upload.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ 
        success: false,
        message: 'Title and description are required' 
      });
    }

    // Get image buffer if uploaded
    const imageBuffer = req.file ? req.file.buffer : null;

    // Use AI service for analysis
    const analysis = await AIService.triageIssue(title, description, imageBuffer);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing issue:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error analyzing issue' 
    });
  }
});

// @route   POST /api/ai/suggest-category
// @desc    Suggest category for issue
// @access  Public
router.post('/suggest-category', async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ 
        message: 'Title and description are required' 
      });
    }

    const categoryAnalysis = AIService.detectCategory(title, description);
    
    res.json({
      success: true,
      category: categoryAnalysis.category,
      confidence: categoryAnalysis.confidence,
      keywords: categoryAnalysis.keywords
    });
  } catch (error) {
    console.error('Error suggesting category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error suggesting category' 
    });
  }
});

// @route   POST /api/ai/enhance-description
// @desc    Enhance issue description with AI suggestions
// @access  Public
router.post('/enhance-description', async (req, res) => {
  try {
    const { description, category, location } = req.body;

    if (!description) {
      return res.status(400).json({ 
        message: 'Description is required' 
      });
    }

    const enhancement = AIService.enhanceDescription(description, category, location);
    
    res.json({
      success: true,
      original: enhancement.original,
      enhanced: enhancement.enhanced,
      suggestions: enhancement.suggestions
    });
  } catch (error) {
    console.error('Error enhancing description:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error enhancing description' 
    });
  }
});

// @route   POST /api/ai/assess-priority
// @desc    Assess issue priority
// @access  Public
router.post('/assess-priority', async (req, res) => {
  try {
    const { category, description, location } = req.body;

    if (!description) {
      return res.status(400).json({ 
        message: 'Description is required' 
      });
    }

    const priority = AIService.assessPriority(category, description, location);
    
    res.json({
      success: true,
      priority,
      reasoning: AIService.getRecommendations(category, priority)
    });
  } catch (error) {
    console.error('Error assessing priority:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error assessing priority' 
    });
  }
});

// @route   POST /api/ai/generate-description
// @desc    Generate AI description based on category
// @access  Public
router.post('/generate-description', async (req, res) => {
  try {
    const { category, title, location, userInput } = req.body;

    if (!category) {
      return res.status(400).json({ 
        message: 'Category is required' 
      });
    }

    const result = AIService.generateDescription(category, title, location, userInput);
    
    res.json({
      success: true,
      description: result.description,
      suggestions: result.suggestions,
      priority: result.priority
    });
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating description' 
    });
  }
});

module.exports = router;
