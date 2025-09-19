const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const ActivityTracker = require('../services/activityTracker');
const UserActivity = require('../models/UserActivity');

// @route   GET /api/admin/activity
// @desc    Get activity logs with filtering
// @access  Private (Admin only)
router.get('/', adminAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('action').optional().isString(),
  query('resourceType').optional().isString(),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('status').optional().isIn(['success', 'failure', 'pending', 'cancelled']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resourceType,
      severity,
      status,
      startDate,
      endDate
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      userId,
      action,
      resourceType,
      severity,
      status,
      startDate,
      endDate
    };

    const activities = await UserActivity.getUserActivity(userId, options);
    const total = await UserActivity.countDocuments({
      ...(userId && { userId }),
      ...(action && { action }),
      ...(resourceType && { resourceType }),
      ...(severity && { severity }),
      ...(status && { status }),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      } : {})
    });

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs'
    });
  }
});

// @route   GET /api/admin/activity/stats
// @desc    Get activity statistics
// @access  Private (Admin only)
router.get('/stats', adminAuth, [
  query('userId').optional().isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('groupBy').optional().isIn(['action', 'userId', 'resourceType', 'severity', 'status'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      userId,
      startDate,
      endDate,
      groupBy = 'action'
    } = req.query;

    const options = {
      userId,
      startDate,
      endDate,
      groupBy
    };

    const stats = await UserActivity.getActivityStats(options);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity statistics'
    });
  }
});

// @route   GET /api/admin/activity/suspicious
// @desc    Get suspicious activities
// @access  Private (Admin only)
router.get('/suspicious', adminAuth, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('threshold').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate,
      threshold = 10
    } = req.query;

    const options = {
      startDate,
      endDate,
      threshold: parseInt(threshold)
    };

    const suspiciousActivities = await ActivityTracker.getSuspiciousActivities(options);

    res.json({
      success: true,
      suspiciousActivities
    });
  } catch (error) {
    console.error('Get suspicious activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suspicious activities'
    });
  }
});

// @route   GET /api/admin/activity/trends
// @desc    Get activity trends
// @access  Private (Admin only)
router.get('/trends', adminAuth, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('groupBy').optional().isIn(['hour', 'day', 'week', 'month']),
  query('action').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate,
      groupBy = 'day',
      action
    } = req.query;

    const options = {
      startDate,
      endDate,
      groupBy,
      action
    };

    const trends = await ActivityTracker.getActivityTrends(options);

    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Get activity trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity trends'
    });
  }
});

// @route   GET /api/admin/activity/dashboard
// @desc    Get activity dashboard data
// @access  Private (Admin only)
router.get('/dashboard', adminAuth, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate
    } = req.query;

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    const dashboardData = await ActivityTracker.getAdminDashboardData(options);

    res.json({
      success: true,
      ...dashboardData
    });
  } catch (error) {
    console.error('Get activity dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity dashboard data'
    });
  }
});

// @route   GET /api/admin/activity/user/:userId
// @desc    Get user-specific activity
// @access  Private (Admin only)
router.get('/user/:userId', adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const {
      page = 1,
      limit = 50,
      action,
      startDate,
      endDate
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      action,
      startDate,
      endDate
    };

    const activitySummary = await ActivityTracker.getUserActivitySummary(userId, options);

    res.json({
      success: true,
      ...activitySummary
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity'
    });
  }
});

// @route   POST /api/admin/activity/cleanup
// @desc    Clean up old activities
// @access  Private (Super Admin only)
router.post('/cleanup', auth, [
  query('daysToKeep').optional().isInt({ min: 30, max: 365 })
], async (req, res) => {
  try {
    // Check if user is super admin
    const user = await require('../models/User').findById(req.userId);
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const { daysToKeep = 90 } = req.query;
    const cleanupResult = await ActivityTracker.cleanupOldActivities(parseInt(daysToKeep));

    res.json({
      success: true,
      message: 'Activity cleanup completed',
      ...cleanupResult
    });
  } catch (error) {
    console.error('Activity cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during activity cleanup'
    });
  }
});

// @route   GET /api/activity/my
// @desc    Get current user's activity
// @access  Private
router.get('/my', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('action').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      action,
      startDate,
      endDate
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      action,
      startDate,
      endDate
    };

    const activitySummary = await ActivityTracker.getUserActivitySummary(req.userId, options);

    res.json({
      success: true,
      ...activitySummary
    });
  } catch (error) {
    console.error('Get my activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your activity'
    });
  }
});

module.exports = router;
