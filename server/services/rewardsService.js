const User = require('../models/User');
const Issue = require('../models/Issue');

class RewardsService {
  // Reward points for different actions
  static REWARD_POINTS = {
    REPORT_SUBMITTED: 10,
    REPORT_RESOLVED: 25,
    FIRST_REPORT: 50,
    STREAK_7_DAYS: 100,
    STREAK_30_DAYS: 500,
    COMMUNITY_HERO: 1000,
    MONTHLY_TOP_REPORTER: 200,
    YEARLY_TOP_REPORTER: 1000
  };

  // Coins for different actions
  static COIN_REWARDS = {
    REPORT_SUBMITTED: 5,
    REPORT_RESOLVED: 15,
    FIRST_REPORT: 25,
    STREAK_7_DAYS: 50,
    STREAK_30_DAYS: 250,
    COMMUNITY_HERO: 500
  };

  // Level thresholds
  static LEVEL_THRESHOLDS = [
    { level: 1, points: 0 },
    { level: 2, points: 100 },
    { level: 3, points: 300 },
    { level: 4, points: 600 },
    { level: 5, points: 1000 },
    { level: 6, points: 1500 },
    { level: 7, points: 2100 },
    { level: 8, points: 2800 },
    { level: 9, points: 3600 },
    { level: 10, points: 4500 }
  ];

  // Award points and coins for submitting a report
  static async awardReportSubmission(userId, issueId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const points = this.REWARD_POINTS.REPORT_SUBMITTED;
      const coins = this.COIN_REWARDS.REPORT_SUBMITTED;

      // Update user rewards
      user.rewards.points += points;
      user.rewards.coins += coins;
      user.stats.reportsSubmitted += 1;
      user.activity.lastReportDate = new Date();
      user.activity.totalReportsThisMonth += 1;
      user.activity.totalReportsThisYear += 1;

      // Check for first report achievement
      if (user.stats.reportsSubmitted === 1) {
        await this.awardAchievement(userId, 'first_report', 'First Report', 'Congratulations on your first civic issue report!', this.REWARD_POINTS.FIRST_REPORT);
        user.rewards.points += this.REWARD_POINTS.FIRST_REPORT;
        user.rewards.coins += this.COIN_REWARDS.FIRST_REPORT;
      }

      // Update level
      await this.updateUserLevel(userId);

      // Update streak
      await this.updateReportStreak(userId);

      await user.save();

      return {
        points,
        coins,
        newLevel: user.rewards.level,
        newPoints: user.rewards.points,
        newCoins: user.rewards.coins
      };
    } catch (error) {
      console.error('Error awarding report submission:', error);
      throw error;
    }
  }

  // Award points and coins for resolved issue
  static async awardIssueResolution(userId, issueId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const points = this.REWARD_POINTS.REPORT_RESOLVED;
      const coins = this.COIN_REWARDS.REPORT_RESOLVED;

      // Update user rewards
      user.rewards.points += points;
      user.rewards.coins += coins;
      user.stats.reportsResolved += 1;

      // Update level
      await this.updateUserLevel(userId);

      await user.save();

      return {
        points,
        coins,
        newLevel: user.rewards.level,
        newPoints: user.rewards.points,
        newCoins: user.rewards.coins
      };
    } catch (error) {
      console.error('Error awarding issue resolution:', error);
      throw error;
    }
  }

  // Award achievement
  static async awardAchievement(userId, type, title, description, points = 0) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Check if achievement already exists
      const existingAchievement = user.rewards.achievements.find(a => a.type === type);
      if (existingAchievement) return null;

      const achievement = {
        type,
        title,
        description,
        earnedAt: new Date(),
        points
      };

      user.rewards.achievements.push(achievement);
      await user.save();

      return achievement;
    } catch (error) {
      console.error('Error awarding achievement:', error);
      throw error;
    }
  }

  // Update user level based on points
  static async updateUserLevel(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const currentPoints = user.rewards.points;
      let newLevel = 1;

      for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (currentPoints >= this.LEVEL_THRESHOLDS[i].points) {
          newLevel = this.LEVEL_THRESHOLDS[i].level;
          break;
        }
      }

      if (newLevel > user.rewards.level) {
        user.rewards.level = newLevel;
        await user.save();
        return { levelUp: true, newLevel, oldLevel: user.rewards.level };
      }

      return { levelUp: false, currentLevel: user.rewards.level };
    } catch (error) {
      console.error('Error updating user level:', error);
      throw error;
    }
  }

  // Update report streak
  static async updateReportStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const today = new Date();
      const lastReportDate = user.activity.lastReportDate;
      
      if (!lastReportDate) {
        user.activity.reportStreak = 1;
        return;
      }

      const daysDiff = Math.floor((today - lastReportDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day
        user.activity.reportStreak += 1;
      } else if (daysDiff > 1) {
        // Streak broken
        user.activity.reportStreak = 1;
      }
      // If daysDiff === 0, same day, don't change streak

      // Check for streak achievements
      if (user.activity.reportStreak === 7) {
        await this.awardAchievement(userId, 'streak_7', 'Week Warrior', 'Reported issues for 7 consecutive days!', this.REWARD_POINTS.STREAK_7_DAYS);
        user.rewards.points += this.REWARD_POINTS.STREAK_7_DAYS;
        user.rewards.coins += this.COIN_REWARDS.STREAK_7_DAYS;
      } else if (user.activity.reportStreak === 30) {
        await this.awardAchievement(userId, 'streak_30', 'Monthly Champion', 'Reported issues for 30 consecutive days!', this.REWARD_POINTS.STREAK_30_DAYS);
        user.rewards.points += this.REWARD_POINTS.STREAK_30_DAYS;
        user.rewards.coins += this.COIN_REWARDS.STREAK_30_DAYS;
      }

      await user.save();
    } catch (error) {
      console.error('Error updating report streak:', error);
      throw error;
    }
  }

  // Get leaderboard
  static async getLeaderboard(limit = 10) {
    try {
      const users = await User.find({ role: 'citizen' })
        .select('name email rewards stats activity')
        .sort({ 'rewards.points': -1 })
        .limit(limit);

      return users.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        points: user.rewards.points,
        coins: user.rewards.coins,
        level: user.rewards.level,
        reportsSubmitted: user.stats.reportsSubmitted,
        reportsResolved: user.stats.reportsResolved,
        streak: user.activity.reportStreak
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  // Get user rewards summary
  static async getUserRewards(userId) {
    try {
      const user = await User.findById(userId)
        .select('rewards stats activity');

      if (!user) throw new Error('User not found');

      return {
        coins: user.rewards.coins,
        points: user.rewards.points,
        level: user.rewards.level,
        badges: user.rewards.badges,
        achievements: user.rewards.achievements,
        stats: user.stats,
        activity: user.activity,
        nextLevelPoints: this.getNextLevelPoints(user.rewards.level, user.rewards.points)
      };
    } catch (error) {
      console.error('Error getting user rewards:', error);
      throw error;
    }
  }

  // Get points needed for next level
  static getNextLevelPoints(currentLevel, currentPoints) {
    const nextLevel = currentLevel + 1;
    const nextLevelThreshold = this.LEVEL_THRESHOLDS.find(l => l.level === nextLevel);
    
    if (!nextLevelThreshold) return null;
    
    return nextLevelThreshold.points - currentPoints;
  }
}

module.exports = RewardsService;
