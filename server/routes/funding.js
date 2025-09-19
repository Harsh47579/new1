const express = require('express');
const { body, validationResult, query } = require('express-validator');
const FundingCampaign = require('../models/FundingCampaign');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/funding/projects
// @desc    Get all active funding campaigns with filtering and sorting
// @access  Public
router.get('/projects', [
  query('q').optional().isString().trim(),
  query('category').optional().isIn([
    'infrastructure', 'environment', 'education', 'healthcare', 
    'transport', 'safety', 'technology', 'community', 'other'
  ]),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('sort').optional().isIn(['newest', 'oldest', 'deadline', 'progress', 'goal']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const {
      q: search,
      category,
      priority,
      sort = 'newest',
      page = 1,
      limit = 12
    } = req.query;

    // Build filter object
    const filters = {};
    if (search) filters.search = search;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'deadline':
        sortObj = { deadline: 1 };
        break;
      case 'progress':
        sortObj = { currentAmount: -1 };
        break;
      case 'goal':
        sortObj = { goal: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    // Get campaigns with pagination
    const campaigns = await FundingCampaign.find({
      isActive: true,
      isCompleted: false,
      deadline: { $gt: new Date() },
      ...(category && { category }),
      ...(priority && { priority }),
      ...(search && {
        $or: [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      })
    })
    .populate('issue', 'title description location category priority images')
    .populate('createdBy', 'name email')
    .sort(sortObj)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

    // Get total count for pagination
    const total = await FundingCampaign.countDocuments({
      isActive: true,
      isCompleted: false,
      deadline: { $gt: new Date() },
      ...(category && { category }),
      ...(priority && { priority }),
      ...(search && {
        $or: [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      })
    });

    // Add virtual fields to each campaign
    const campaignsWithVirtuals = campaigns.map(campaign => {
      const progressPercentage = Math.min(Math.round((campaign.currentAmount / campaign.goal) * 100), 100);
      const now = new Date();
      const deadline = new Date(campaign.deadline);
      const diffTime = deadline - now;
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      let fundingStatus = 'active';
      if (campaign.isCompleted) fundingStatus = 'completed';
      else if (campaign.currentAmount >= campaign.goal) fundingStatus = 'funded';
      else if (daysRemaining <= 0) fundingStatus = 'expired';

      return {
        ...campaign,
        progressPercentage,
        daysRemaining,
        fundingStatus,
        averageContribution: campaign.stats.averageContribution || 0
      };
    });

    res.json({
      success: true,
      campaigns: campaignsWithVirtuals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get funding projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching funding projects'
    });
  }
});

// @route   GET /api/funding/projects/:id
// @desc    Get a specific funding campaign by ID
// @access  Public
router.get('/projects/:id', async (req, res) => {
  try {
    const campaign = await FundingCampaign.findById(req.params.id)
      .populate('issue', 'title description location category priority images')
      .populate('createdBy', 'name email')
      .populate('contributors.user', 'name email')
      .lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Funding campaign not found'
      });
    }

    // Add virtual fields
    const progressPercentage = Math.min(Math.round((campaign.currentAmount / campaign.goal) * 100), 100);
    const now = new Date();
    const deadline = new Date(campaign.deadline);
    const diffTime = deadline - now;
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    let fundingStatus = 'active';
    if (campaign.isCompleted) fundingStatus = 'completed';
    else if (campaign.currentAmount >= campaign.goal) fundingStatus = 'funded';
    else if (daysRemaining <= 0) fundingStatus = 'expired';

    res.json({
      success: true,
      campaign: {
        ...campaign,
        progressPercentage,
        daysRemaining,
        fundingStatus,
        averageContribution: campaign.stats.averageContribution || 0
      }
    });
  } catch (error) {
    console.error('Get funding campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching funding campaign'
    });
  }
});

// @route   POST /api/funding/create-intent
// @desc    Create payment intent for contribution
// @access  Private
router.post('/create-intent', [
  auth,
  body('campaignId').isMongoId().withMessage('Valid campaign ID is required'),
  body('amount').isFloat({ min: 10 }).withMessage('Amount must be at least ₹10'),
  body('currency').optional().isIn(['INR']).withMessage('Currency must be INR')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { campaignId, amount, currency = 'INR' } = req.body;
    const userId = req.userId;

    // Verify campaign exists and is active
    const campaign = await FundingCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Funding campaign not found'
      });
    }

    if (!campaign.isActive || campaign.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Campaign is not active or already completed'
      });
    }

    // Check if deadline has passed
    const now = new Date();
    if (new Date(campaign.deadline) <= now) {
      return res.status(400).json({
        success: false,
        message: 'Campaign deadline has passed'
      });
    }

    // Generate payment intent ID (in real implementation, integrate with Razorpay)
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, you would:
    // 1. Create a Razorpay order
    // 2. Store the order details
    // 3. Return the order ID and other payment details

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntentId,
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        campaignId: campaignId,
        userId: userId
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating payment intent'
    });
  }
});

// @route   POST /api/funding/projects/:id/contribute
// @desc    Process contribution to a funding campaign
// @access  Private
router.post('/projects/:id/contribute', [
  auth,
  body('amount').isFloat({ min: 10 }).withMessage('Amount must be at least ₹10'),
  body('paymentIntentId').isString().withMessage('Payment intent ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, paymentIntentId } = req.body;
    const campaignId = req.params.id;
    const userId = req.userId;

    // Verify campaign exists
    const campaign = await FundingCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Funding campaign not found'
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // In a real implementation, you would:
    // 1. Verify the payment with Razorpay
    // 2. Check if payment was successful
    // 3. Process the contribution

    // For now, we'll simulate a successful payment
    try {
      await campaign.addContribution(userId, amount, paymentIntentId);
      
      // Update user's contribution stats
      user.stats = user.stats || {};
      user.stats.totalContributions = (user.stats.totalContributions || 0) + amount;
      user.stats.contributionCount = (user.stats.contributionCount || 0) + 1;
      await user.save();

      // Emit real-time update (if Socket.IO is available)
      if (req.app.get('io')) {
        const emitFundingUpdate = req.app.get('emitFundingUpdate');
        if (emitFundingUpdate) {
          emitFundingUpdate(campaignId, {
            currentAmount: campaign.currentAmount,
            progressPercentage: campaign.progressPercentage,
            totalContributors: campaign.stats.totalContributors,
            isCompleted: campaign.isCompleted,
            fundingStatus: campaign.fundingStatus
          });
        }
      }

      res.json({
        success: true,
        message: 'Contribution successful',
        contribution: {
          amount: amount,
          campaignId: campaignId,
          paymentIntentId: paymentIntentId,
          newTotal: campaign.currentAmount,
          progressPercentage: campaign.progressPercentage,
          isCompleted: campaign.isCompleted
        }
      });
    } catch (contributionError) {
      console.error('Contribution error:', contributionError);
      res.status(400).json({
        success: false,
        message: contributionError.message
      });
    }
  } catch (error) {
    console.error('Process contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing contribution'
    });
  }
});

// @route   GET /api/funding/user-contributions
// @desc    Get user's contribution history
// @access  Private
router.get('/user-contributions', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const campaigns = await FundingCampaign.find({
      'contributors.user': userId
    })
    .populate('issue', 'title description category')
    .populate('createdBy', 'name')
    .sort({ 'contributors.contributedAt': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

    // Extract user's contributions
    const userContributions = [];
    campaigns.forEach(campaign => {
      const userContributionsInCampaign = campaign.contributors.filter(
        contrib => contrib.user.toString() === userId
      );
      
      userContributionsInCampaign.forEach(contrib => {
        userContributions.push({
          campaignId: campaign._id,
          campaignTitle: campaign.title,
          issueTitle: campaign.issue.title,
          issueCategory: campaign.issue.category,
          amount: contrib.amount,
          contributedAt: contrib.contributedAt,
          status: contrib.status,
          campaignProgress: Math.min(Math.round((campaign.currentAmount / campaign.goal) * 100), 100),
          campaignGoal: campaign.goal,
          campaignCurrentAmount: campaign.currentAmount
        });
      });
    });

    // Sort by contribution date
    userContributions.sort((a, b) => new Date(b.contributedAt) - new Date(a.contributedAt));

    res.json({
      success: true,
      contributions: userContributions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(userContributions.length / limit),
        total: userContributions.length
      }
    });
  } catch (error) {
    console.error('Get user contributions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user contributions'
    });
  }
});

module.exports = router;
