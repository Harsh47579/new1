const express = require('express');
const { query } = require('express-validator');
const User = require('../models/User');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's issues statistics
    const totalReports = await Issue.countDocuments({ reporter: userId });
    const resolvedReports = await Issue.countDocuments({ 
      reporter: userId, 
      status: 'resolved' 
    });
    const inProgressReports = await Issue.countDocuments({ 
      reporter: userId, 
      status: 'in_progress' 
    });
    const pendingReports = await Issue.countDocuments({ 
      reporter: userId, 
      status: 'new' 
    });

    // Get recent activity
    const recentIssues = await Issue.find({ reporter: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status category createdAt');

    // Get community engagement stats
    const upvotedIssues = await Issue.countDocuments({
      'community.upvotes.user': userId
    });

    const commentedIssues = await Issue.countDocuments({
      'community.comments.user': userId
    });

    const confirmedIssues = await Issue.countDocuments({
      'community.confirmations.user': userId
    });

    res.json({
      reports: {
        total: totalReports,
        resolved: resolvedReports,
        inProgress: inProgressReports,
        pending: pendingReports
      },
      community: {
        upvoted: upvotedIssues,
        commented: commentedIssues,
        confirmed: confirmedIssues
      },
      recentActivity: recentIssues
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error while fetching user statistics' });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's issues with pagination
    const { page = 1, limit = 10 } = req.query;
    
    const issues = await Issue.find({ reporter: userId })
      .populate('assignedTo.worker', 'name email')
      .populate('assignedTo.department', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalIssues = await Issue.countDocuments({ reporter: userId });

    // Get community activity (issues user has engaged with)
    const communityIssues = await Issue.find({
      $or: [
        { 'community.upvotes.user': userId },
        { 'community.comments.user': userId },
        { 'community.confirmations.user': userId }
      ]
    })
    .populate('reporter', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get statistics
    const stats = {
      totalReports: await Issue.countDocuments({ reporter: userId }),
      resolvedReports: await Issue.countDocuments({ 
        reporter: userId, 
        status: 'resolved' 
      }),
      inProgressReports: await Issue.countDocuments({ 
        reporter: userId, 
        status: 'in_progress' 
      }),
      pendingReports: await Issue.countDocuments({ 
        reporter: userId, 
        status: 'new' 
      })
    };

    res.json({
      myReports: {
        issues,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(totalIssues / limit),
          total: totalIssues,
          hasNext: page * limit < totalIssues,
          hasPrev: page > 1
        }
      },
      communityActivity: communityIssues,
      stats
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

// @route   GET /api/users/leaderboard
// @desc    Get community leaderboard
// @access  Public
router.get('/leaderboard', [
  query('period').optional().isIn(['week', 'month', 'year', 'all']).withMessage('Invalid period'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;

    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      const periods = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };
      dateFilter.createdAt = { $gte: new Date(now - periods[period]) };
    }

    // Get top users by community engagement
    const leaderboard = await User.aggregate([
      {
        $lookup: {
          from: 'issues',
          localField: '_id',
          foreignField: 'reporter',
          as: 'reports'
        }
      },
      {
        $lookup: {
          from: 'issues',
          localField: '_id',
          foreignField: 'community.upvotes.user',
          as: 'upvotes'
        }
      },
      {
        $lookup: {
          from: 'issues',
          localField: '_id',
          foreignField: 'community.comments.user',
          as: 'comments'
        }
      },
      {
        $addFields: {
          communityScore: {
            $add: [
              { $multiply: [{ $size: '$reports' }, 10] },
              { $multiply: [{ $size: '$upvotes' }, 2] },
              { $multiply: [{ $size: '$comments' }, 3] }
            ]
          },
          reportsCount: { $size: '$reports' },
          upvotesCount: { $size: '$upvotes' },
          commentsCount: { $size: '$comments' }
        }
      },
      {
        $match: {
          isActive: true,
          role: 'citizen',
          ...(Object.keys(dateFilter).length > 0 ? { 'reports.createdAt': dateFilter.createdAt } : {})
        }
      },
      {
        $sort: { communityScore: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          name: 1,
          email: 1,
          communityScore: 1,
          reportsCount: 1,
          upvotesCount: 1,
          commentsCount: 1,
          createdAt: 1
        }
      }
    ]);

    res.json({ leaderboard, period });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error while fetching leaderboard' });
  }
});

// @route   GET /api/user/dashboard-data
// @desc    Get optimized user dashboard data in a single API call
// @access  Private
router.get('/dashboard-data', auth, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('📊 Fetching dashboard data for user:', userId);

    // Execute all queries in parallel for efficiency
    const [
      totalReports,
      resolvedReports,
      unreadNotifications,
      recentReports,
      userStats
    ] = await Promise.all([
      // Count total reports
      Issue.countDocuments({ reporter: userId }),
      
      // Count resolved reports
      Issue.countDocuments({ 
        reporter: userId, 
        status: 'resolved' 
      }),
      
      // Count unread notifications
      Notification.countDocuments({ 
        user: userId, 
        isRead: false 
      }),
      
      // Get recent reports (last 10)
      Issue.find({ reporter: userId })
        .select('_id title status category createdAt priority upvoteCount commentCount')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      
      // Get user stats including community score
      User.findById(userId)
        .select('stats.reportsSubmitted stats.reportsResolved stats.communityScore rewards.coins rewards.points rewards.level')
        .lean()
    ]);

    // Calculate additional stats
    const inProgressReports = await Issue.countDocuments({ 
      reporter: userId, 
      status: 'in_progress' 
    });
    
    const pendingReports = await Issue.countDocuments({ 
      reporter: userId, 
      status: 'new' 
    });

    // Prepare response data
    const dashboardData = {
      success: true,
      timestamp: new Date().toISOString(),
      overview: {
        totalReports,
        resolvedReports,
        inProgressReports,
        pendingReports,
        unreadNotifications,
        communityScore: userStats?.stats?.communityScore || 0
      },
      recentReports: recentReports.map(issue => ({
        _id: issue._id,
        title: issue.title,
        status: issue.status,
        category: issue.category,
        priority: issue.priority,
        createdAt: issue.createdAt,
        upvoteCount: issue.upvoteCount || 0,
        commentCount: issue.commentCount || 0
      })),
      userStats: {
        coins: userStats?.rewards?.coins || 0,
        points: userStats?.rewards?.points || 0,
        level: userStats?.rewards?.level || 1,
        reportsSubmitted: userStats?.stats?.reportsSubmitted || 0,
        reportsResolved: userStats?.stats?.reportsResolved || 0
      }
    };

    console.log('✅ Dashboard data fetched successfully:', {
      totalReports,
      resolvedReports,
      unreadNotifications,
      recentReportsCount: recentReports.length
    });

    res.json(dashboardData);
  } catch (error) {
    console.error('❌ Dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

module.exports = router;
