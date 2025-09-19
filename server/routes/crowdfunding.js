const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/issues/:id/fund
// @desc    Contribute to a fundable issue
// @access  Private
router.post('/:id/fund', auth, [
  body('amount').isNumeric().isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
  body('message').optional().isString().isLength({ max: 200 }).withMessage('Message must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, message } = req.body;
    const issueId = req.params.id;

    // Find the issue
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check if issue is fundable
    if (!issue.isFundable) {
      return res.status(400).json({
        success: false,
        message: 'This issue is not available for funding'
      });
    }

    // Check if funding goal is reached
    if (issue.funding.currentAmount >= issue.funding.goal) {
      return res.status(400).json({
        success: false,
        message: 'Funding goal has already been reached'
      });
    }

    // Check if user has sufficient balance (if implementing wallet system)
    // For now, we'll just record the contribution
    const contribution = {
      user: req.userId,
      amount: parseFloat(amount),
      contributedAt: new Date()
    };

    // Add contribution to issue
    issue.funding.contributors.push(contribution);
    issue.funding.currentAmount += parseFloat(amount);

    // Update user's contribution stats
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 
        'stats.totalContributed': parseFloat(amount),
        'stats.contributionsCount': 1
      }
    });

    await issue.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('funding_update', {
        issueId: issue._id,
        currentAmount: issue.funding.currentAmount,
        goal: issue.funding.goal,
        progress: (issue.funding.currentAmount / issue.funding.goal) * 100
      });
    }

    res.json({
      success: true,
      message: 'Contribution successful',
      data: {
        contribution,
        currentAmount: issue.funding.currentAmount,
        goal: issue.funding.goal,
        progress: (issue.funding.currentAmount / issue.funding.goal) * 100,
        isGoalReached: issue.funding.currentAmount >= issue.funding.goal
      }
    });

  } catch (error) {
    console.error('Funding error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing contribution'
    });
  }
});

// @route   GET /api/issues/fundable
// @desc    Get all fundable issues
// @access  Public
router.get('/fundable', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, sortBy = 'createdAt' } = req.query;
    
    const query = {
      isFundable: true,
      status: { $in: ['new', 'in_progress'] }
    };

    if (category) {
      query.category = category;
    }

    const sortOptions = {};
    if (sortBy === 'progress') {
      // Sort by funding progress (descending)
      const issues = await Issue.find(query)
        .populate('reporter', 'name')
        .populate('funding.contributors.user', 'name')
        .lean();

      issues.sort((a, b) => {
        const progressA = (a.funding.currentAmount / a.funding.goal) * 100;
        const progressB = (b.funding.currentAmount / b.funding.goal) * 100;
        return progressB - progressA;
      });

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedIssues = issues.slice(startIndex, endIndex);

      return res.json({
        success: true,
        data: {
          issues: paginatedIssues,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(issues.length / limit),
            totalIssues: issues.length,
            hasNext: endIndex < issues.length,
            hasPrev: startIndex > 0
          }
        }
      });
    } else {
      sortOptions[sortBy] = -1;
    }

    const issues = await Issue.find(query)
      .populate('reporter', 'name')
      .populate('funding.contributors.user', 'name')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Issue.countDocuments(query);

    res.json({
      success: true,
      data: {
        issues,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalIssues: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get fundable issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fundable issues'
    });
  }
});

// @route   PUT /api/issues/:id/set-fundable
// @desc    Set issue as fundable (Admin only)
// @access  Private (Admin)
router.put('/:id/set-fundable', auth, [
  body('isFundable').isBoolean().withMessage('isFundable must be a boolean'),
  body('fundingGoal').optional().isNumeric().isFloat({ min: 1 }).withMessage('Funding goal must be a positive number')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isFundable, fundingGoal } = req.body;
    const issueId = req.params.id;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    const updateData = { isFundable };

    if (isFundable && fundingGoal) {
      updateData['funding.goal'] = parseFloat(fundingGoal);
      updateData['funding.currentAmount'] = 0;
      updateData['funding.contributors'] = [];
    }

    await Issue.findByIdAndUpdate(issueId, updateData);

    res.json({
      success: true,
      message: `Issue ${isFundable ? 'enabled' : 'disabled'} for funding`,
      data: {
        isFundable,
        fundingGoal: fundingGoal || null
      }
    });

  } catch (error) {
    console.error('Set fundable error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating funding status'
    });
  }
});

// @route   GET /api/issues/:id/funding-details
// @desc    Get detailed funding information for an issue
// @access  Public
router.get('/:id/funding-details', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'name email')
      .populate('funding.contributors.user', 'name email')
      .select('title description isFundable funding status createdAt');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    if (!issue.isFundable) {
      return res.status(400).json({
        success: false,
        message: 'This issue is not available for funding'
      });
    }

    const progress = issue.funding.goal > 0 ? 
      (issue.funding.currentAmount / issue.funding.goal) * 100 : 0;

    res.json({
      success: true,
      data: {
        issue: {
          id: issue._id,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          createdAt: issue.createdAt
        },
        funding: {
          goal: issue.funding.goal,
          currentAmount: issue.funding.currentAmount,
          progress: Math.round(progress * 100) / 100,
          contributorsCount: issue.funding.contributors.length,
          isGoalReached: issue.funding.currentAmount >= issue.funding.goal,
          contributors: issue.funding.contributors.map(contrib => ({
            user: contrib.user,
            amount: contrib.amount,
            contributedAt: contrib.contributedAt
          }))
        }
      }
    });

  } catch (error) {
    console.error('Get funding details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching funding details'
    });
  }
});

module.exports = router;
