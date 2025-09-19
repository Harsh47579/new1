const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Issue = require('../models/Issue');

// @route   GET /api/community/leaderboard
// @desc    Get community leaderboard
// @access  Public
router.get('/leaderboard', [
  query('period').optional().isIn(['week', 'month', 'year', 'all']),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { period = 'all', limit = 10 } = req.query;

    // Calculate date filter based on period
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (startDate) {
        dateFilter = { createdAt: { $gte: startDate } };
      }
    }

    // Get leaderboard data
    const leaderboard = await User.aggregate([
      {
        $lookup: {
          from: 'issues',
          localField: '_id',
          foreignField: 'reportedBy',
          as: 'reports',
          pipeline: [
            { $match: dateFilter },
            {
              $lookup: {
                from: 'issues',
                localField: '_id',
                foreignField: 'community.upvotes.user',
                as: 'upvotedIssues'
              }
            }
          ]
        }
      },
      {
        $addFields: {
          totalReports: { $size: '$reports' },
          resolvedReports: {
            $size: {
              $filter: {
                input: '$reports',
                cond: { $eq: ['$$this.status', 'resolved'] }
              }
            }
          },
          totalUpvotes: {
            $sum: {
              $map: {
                input: '$reports',
                as: 'report',
                in: { $size: '$$report.community.upvotes' }
              }
            }
          },
          totalConfirmations: {
            $sum: {
              $map: {
                input: '$reports',
                as: 'report',
                in: { $size: '$$report.community.confirmations' }
              }
            }
          },
          totalComments: {
            $sum: {
              $map: {
                input: '$reports',
                as: 'report',
                in: { $size: '$$report.community.comments' }
              }
            }
          },
          score: {
            $add: [
              { $multiply: ['$stats.reportsSubmitted', 10] },
              { $multiply: ['$stats.reportsResolved', 20] },
              { $multiply: ['$stats.communityScore', 5] }
            ]
          }
        }
      },
      {
        $match: {
          totalReports: { $gt: 0 },
          accountStatus: 'active'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          totalReports: 1,
          resolvedReports: 1,
          totalUpvotes: 1,
          totalConfirmations: 1,
          totalComments: 1,
          score: 1,
          communityScore: '$stats.communityScore',
          coins: '$rewards.coins',
          points: '$rewards.points',
          createdAt: 1
        }
      },
      { $sort: { score: -1, totalReports: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Get current user's rank if authenticated
    let currentUserRank = null;
    if (req.userId) {
      const currentUser = await User.findById(req.userId);
      if (currentUser) {
        const currentUserScore = (currentUser.stats?.reportsSubmitted || 0) * 10 + 
                                (currentUser.stats?.reportsResolved || 0) * 20 + 
                                (currentUser.stats?.communityScore || 0) * 5;
        
        const usersAbove = await User.countDocuments({
          $expr: {
            $gt: [
              {
                $add: [
                  { $multiply: ['$stats.reportsSubmitted', 10] },
                  { $multiply: ['$stats.reportsResolved', 20] },
                  { $multiply: ['$stats.communityScore', 5] }
                ]
              },
              currentUserScore
            ]
          },
          accountStatus: 'active'
        });
        
        currentUserRank = usersAbove + 1;
      }
    }

    res.json({
      success: true,
      leaderboard: rankedLeaderboard,
      currentUserRank,
      period,
      totalParticipants: leaderboard.length
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard'
    });
  }
});

// @route   GET /api/community/feed
// @desc    Get community activity feed
// @access  Public
router.get('/feed', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('type').optional().isIn(['upvotes', 'confirmations', 'comments', 'resolved', 'all']),
  query('category').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      type = 'all',
      category
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = { status: { $ne: 'rejected' } };
    
    if (category) filter.category = category;

    // Build aggregation pipeline based on type
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reporter'
        }
      },
      {
        $unwind: '$reporter'
      }
    ];

    // Add activity-specific filters
    if (type === 'upvotes') {
      pipeline.push({
        $match: { 'community.upvotes.0': { $exists: true } }
      });
    } else if (type === 'confirmations') {
      pipeline.push({
        $match: { 'community.confirmations.0': { $exists: true } }
      });
    } else if (type === 'comments') {
      pipeline.push({
        $match: { 'community.comments.0': { $exists: true } }
      });
    } else if (type === 'resolved') {
      pipeline.push({
        $match: { status: 'resolved' }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const activities = await Issue.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = [...pipeline];
    countPipeline.splice(-3); // Remove sort, skip, limit
    countPipeline.push({ $count: 'total' });
    const countResult = await Issue.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Format activities for feed
    const feedItems = activities.map(issue => {
      const item = {
        id: issue._id,
        type: 'issue',
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        location: issue.location,
        media: issue.media,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        reporter: {
          id: issue.reporter._id,
          name: issue.reporter.name,
          role: issue.reporter.role
        },
        stats: {
          upvotes: issue.community?.upvotes?.length || 0,
          confirmations: issue.community?.confirmations?.length || 0,
          comments: issue.community?.comments?.length || 0
        }
      };

      // Add recent activity
      if (issue.community?.upvotes?.length > 0) {
        const recentUpvote = issue.community.upvotes[issue.community.upvotes.length - 1];
        item.recentActivity = {
          type: 'upvote',
          user: recentUpvote.user,
          timestamp: recentUpvote.timestamp
        };
      } else if (issue.community?.confirmations?.length > 0) {
        const recentConfirmation = issue.community.confirmations[issue.community.confirmations.length - 1];
        item.recentActivity = {
          type: 'confirmation',
          user: recentConfirmation.user,
          timestamp: recentConfirmation.timestamp
        };
      } else if (issue.community?.comments?.length > 0) {
        const recentComment = issue.community.comments[issue.community.comments.length - 1];
        item.recentActivity = {
          type: 'comment',
          user: recentComment.user,
          timestamp: recentComment.timestamp
        };
      }

      return item;
    });

    res.json({
      success: true,
      feed: feedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        type,
        category
      }
    });
  } catch (error) {
    console.error('Get community feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching community feed'
    });
  }
});

// @route   GET /api/community/stats
// @desc    Get community statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments({ accountStatus: 'active' });
    
    // Get total issues
    const totalIssues = await Issue.countDocuments({ status: { $ne: 'rejected' } });
    
    // Get resolved issues
    const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
    
    // Get issues by category
    const issuesByCategory = await Issue.aggregate([
      { $match: { status: { $ne: 'rejected' } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get issues by status
    const issuesByStatus = await Issue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top contributors
    const topContributors = await User.aggregate([
      {
        $lookup: {
          from: 'issues',
          localField: '_id',
          foreignField: 'reportedBy',
          as: 'reports'
        }
      },
      {
        $addFields: {
          totalReports: { $size: '$reports' },
          resolvedReports: {
            $size: {
              $filter: {
                input: '$reports',
                cond: { $eq: ['$$this.status', 'resolved'] }
              }
            }
          }
        }
      },
      {
        $match: {
          totalReports: { $gt: 0 },
          accountStatus: 'active'
        }
      },
      {
        $project: {
          name: 1,
          totalReports: 1,
          resolvedReports: 1,
          communityScore: '$stats.communityScore'
        }
      },
      { $sort: { totalReports: -1 } },
      { $limit: 5 }
    ]);

    // Get recent activity
    const recentActivity = await Issue.find({ status: { $ne: 'rejected' } })
      .populate('reportedBy', 'name')
      .select('title status createdAt category')
      .sort({ updatedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalIssues,
        resolvedIssues,
        resolutionRate: totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(1) : 0,
        issuesByCategory,
        issuesByStatus,
        topContributors,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get community stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching community statistics'
    });
  }
});

module.exports = router;
