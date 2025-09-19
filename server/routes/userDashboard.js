const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityTracker = require('../services/activityTracker');

// @route   GET /api/user/reports
// @desc    Get user's submitted reports with timeline
// @access  Private
router.get('/reports', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['new', 'in_progress', 'resolved', 'closed', 'rejected']),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'status', 'priority']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = { reportedBy: req.userId };
    
    if (status) filter.status = status;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const issues = await Issue.find(filter)
      .populate('assignedTo.department', 'name email')
      .populate('assignedTo.worker', 'name email')
      .populate('assignedTo.assignedBy', 'name email')
      .populate('community.upvotes.user', 'name')
      .populate('community.confirmations.user', 'name')
      .populate('community.comments.user', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Issue.countDocuments(filter);

    // Get user stats
    const userStats = await User.findById(req.userId).select('stats rewards');
    
    // Get recent activity for timeline
    const recentActivity = await ActivityTracker.getUserActivitySummary(req.userId, {
      page: 1,
      limit: 10,
      action: 'issue_report'
    });

    res.json({
      success: true,
      reports: issues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalReports: userStats?.stats?.reportsSubmitted || 0,
        resolvedReports: userStats?.stats?.reportsResolved || 0,
        communityScore: userStats?.stats?.communityScore || 0,
        coins: userStats?.rewards?.coins || 0,
        points: userStats?.rewards?.points || 0
      },
      recentActivity: recentActivity.activities || []
    });
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reports'
    });
  }
});

// @route   GET /api/user/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('type').optional().isString(),
  query('unread').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      type,
      unread
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = { userId: req.userId };
    
    if (type) filter.type = type;
    if (unread !== undefined) filter.read = !unread;

    const notifications = await Notification.find(filter)
      .populate('data.issueId', 'title status')
      .populate('data.departmentId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId: req.userId, read: false });

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

// @route   PUT /api/user/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
});

// @route   PUT /api/user/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit phone number'),
  body('profile.bio').optional().trim().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('profile.occupation').optional().trim().isLength({ max: 100 }).withMessage('Occupation cannot exceed 100 characters'),
  body('profile.organization').optional().trim().isLength({ max: 100 }).withMessage('Organization cannot exceed 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };
    
    // Check for duplicate phone if being updated
    if (updateData.phone) {
      const existingUser = await User.findOne({
        _id: { $ne: req.userId },
        phone: updateData.phone
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Log activity
    await ActivityTracker.logActivity(req.userId, {
      action: 'profile_update',
      description: 'Updated profile information',
      resourceType: 'user',
      resourceId: req.userId,
      severity: 'low',
      status: 'success',
      details: updateData
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// @route   PUT /api/user/settings
// @desc    Update user settings and preferences
// @access  Private
router.put('/settings', auth, [
  body('preferences.notifications.email').optional().isBoolean(),
  body('preferences.notifications.sms').optional().isBoolean(),
  body('preferences.notifications.push').optional().isBoolean(),
  body('preferences.language').optional().isIn(['en', 'hi', 'bn']),
  body('preferences.reportAnonymously').optional().isBoolean(),
  body('preferences.theme').optional().isIn(['light', 'dark', 'auto']),
  body('preferences.timezone').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { preferences: req.body.preferences };

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Log activity
    await ActivityTracker.logActivity(req.userId, {
      action: 'settings_change',
      description: 'Updated user preferences',
      resourceType: 'user',
      resourceId: req.userId,
      severity: 'low',
      status: 'success',
      details: updateData
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings'
    });
  }
});

// @route   GET /api/user/dashboard-stats
// @desc    Get user dashboard statistics
// @access  Private
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('stats rewards preferences');
    
    // Get recent reports
    const recentReports = await Issue.find({ reportedBy: req.userId })
      .select('title status createdAt category priority')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get reports by status
    const reportsByStatus = await Issue.aggregate([
      { $match: { reportedBy: req.userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get reports by category
    const reportsByCategory = await Issue.aggregate([
      { $match: { reportedBy: req.userId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly report trends
    const monthlyTrends = await Issue.aggregate([
      { $match: { reportedBy: req.userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Get community engagement
    const communityEngagement = await Issue.aggregate([
      { $match: { reportedBy: req.userId } },
      {
        $group: {
          _id: null,
          totalUpvotes: { $sum: { $size: '$community.upvotes' } },
          totalConfirmations: { $sum: { $size: '$community.confirmations' } },
          totalComments: { $sum: { $size: '$community.comments' } }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          communityScore: user.stats?.communityScore || 0,
          coins: user.rewards?.coins || 0,
          points: user.rewards?.points || 0
        },
        reports: {
          total: user.stats?.reportsSubmitted || 0,
          resolved: user.stats?.reportsResolved || 0,
          byStatus: reportsByStatus,
          byCategory: reportsByCategory,
          recent: recentReports
        },
        community: communityEngagement[0] || {
          totalUpvotes: 0,
          totalConfirmations: 0,
          totalComments: 0
        },
        trends: monthlyTrends
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

module.exports = router;
