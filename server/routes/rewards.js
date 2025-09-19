const express = require('express');
const { auth } = require('../middleware/auth');
const RewardsService = require('../services/rewardsService');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/rewards/user
// @desc    Get user's rewards and achievements
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const rewards = await RewardsService.getUserRewards(req.userId);
    res.json(rewards);
  } catch (error) {
    console.error('Error getting user rewards:', error);
    res.status(500).json({ message: 'Error fetching rewards' });
  }
});

// @route   GET /api/rewards/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await RewardsService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// @route   POST /api/rewards/award-report
// @desc    Award points for report submission
// @access  Private
router.post('/award-report', auth, async (req, res) => {
  try {
    const { issueId } = req.body;
    
    if (!issueId) {
      return res.status(400).json({ message: 'Issue ID is required' });
    }

    const result = await RewardsService.awardReportSubmission(req.userId, issueId);
    res.json({
      message: 'Rewards awarded successfully',
      ...result
    });
  } catch (error) {
    console.error('Error awarding report rewards:', error);
    res.status(500).json({ message: 'Error awarding rewards' });
  }
});

// @route   POST /api/rewards/award-resolution
// @desc    Award points for issue resolution
// @access  Private
router.post('/award-resolution', auth, async (req, res) => {
  try {
    const { issueId } = req.body;
    
    if (!issueId) {
      return res.status(400).json({ message: 'Issue ID is required' });
    }

    const result = await RewardsService.awardIssueResolution(req.userId, issueId);
    res.json({
      message: 'Resolution rewards awarded successfully',
      ...result
    });
  } catch (error) {
    console.error('Error awarding resolution rewards:', error);
    res.status(500).json({ message: 'Error awarding rewards' });
  }
});

// @route   GET /api/rewards/achievements
// @desc    Get all available achievements
// @access  Public
router.get('/achievements', async (req, res) => {
  try {
    const achievements = [
      {
        type: 'first_report',
        title: 'First Report',
        description: 'Submit your first civic issue report',
        points: 50,
        coins: 25,
        icon: '🎯'
      },
      {
        type: 'streak_7',
        title: 'Week Warrior',
        description: 'Report issues for 7 consecutive days',
        points: 100,
        coins: 50,
        icon: '🔥'
      },
      {
        type: 'streak_30',
        title: 'Monthly Champion',
        description: 'Report issues for 30 consecutive days',
        points: 500,
        coins: 250,
        icon: '👑'
      },
      {
        type: 'community_hero',
        title: 'Community Hero',
        description: 'Help resolve 10 issues in your community',
        points: 1000,
        coins: 500,
        icon: '🦸'
      },
      {
        type: 'top_reporter',
        title: 'Top Reporter',
        description: 'Be among the top 10 reporters this month',
        points: 200,
        coins: 100,
        icon: '🏆'
      }
    ];

    res.json(achievements);
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ message: 'Error fetching achievements' });
  }
});

// @route   GET /api/rewards/stats
// @desc    Get reward statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'citizen' });
    const totalPoints = await User.aggregate([
      { $match: { role: 'citizen' } },
      { $group: { _id: null, total: { $sum: '$rewards.points' } } }
    ]);
    
    const totalCoins = await User.aggregate([
      { $match: { role: 'citizen' } },
      { $group: { _id: null, total: { $sum: '$rewards.coins' } } }
    ]);

    const topReporters = await User.find({ role: 'citizen' })
      .select('name rewards stats')
      .sort({ 'stats.reportsSubmitted': -1 })
      .limit(5);

    res.json({
      totalUsers,
      totalPoints: totalPoints[0]?.total || 0,
      totalCoins: totalCoins[0]?.total || 0,
      topReporters: topReporters.map(user => ({
        name: user.name,
        reportsSubmitted: user.stats.reportsSubmitted,
        points: user.rewards.points,
        level: user.rewards.level
      }))
    });
  } catch (error) {
    console.error('Error getting reward stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

module.exports = router;
