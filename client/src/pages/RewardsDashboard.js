import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Trophy, 
  Star, 
  Coins, 
  Award, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  Crown,
  Medal,
  Gift,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const RewardsDashboard = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRewardsData();
  }, []);

  const fetchRewardsData = async () => {
    try {
      const [rewardsRes, leaderboardRes, achievementsRes] = await Promise.all([
        axios.get('/api/rewards/user'),
        axios.get('/api/rewards/leaderboard?limit=10'),
        axios.get('/api/rewards/achievements')
      ]);

      setRewards(rewardsRes.data);
      setLeaderboard(leaderboardRes.data);
      setAchievements(achievementsRes.data);
    } catch (error) {
      console.error('Error fetching rewards data:', error);
      toast.error('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = () => {
    if (!rewards) return 0;
    const currentLevel = rewards.level;
    const currentPoints = rewards.points;
    
    // Calculate progress to next level
    const levelThresholds = [
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

    const currentThreshold = levelThresholds.find(l => l.level === currentLevel);
    const nextThreshold = levelThresholds.find(l => l.level === currentLevel + 1);
    
    if (!nextThreshold) return 100;
    
    const progress = ((currentPoints - currentThreshold.points) / (nextThreshold.points - currentThreshold.points)) * 100;
    return Math.min(progress, 100);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-dark-300 font-bold">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-300">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Rewards Dashboard</h1>
          <p className="text-dark-300">Track your progress and earn rewards for helping your community</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-primary-500/20 rounded-lg">
                <Coins className="w-6 h-6 text-primary-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-dark-300">Coins</p>
                <p className="text-2xl font-bold text-white">{rewards?.coins || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-dark-300">Points</p>
                <p className="text-2xl font-bold text-white">{rewards?.points || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-dark-300">Level</p>
                <p className="text-2xl font-bold text-white">{rewards?.level || 1}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Target className="w-6 h-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-dark-300">Reports</p>
                <p className="text-2xl font-bold text-white">{rewards?.stats?.reportsSubmitted || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Level Progress */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-4">Level Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-dark-300 mb-2">
                  <span>Level {rewards?.level || 1}</span>
                  <span>{rewards?.nextLevelPoints || 0} points to next level</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getLevelProgress()}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-dark-300">
                <p>Current: {rewards?.points || 0} points</p>
                <p>Next Level: {rewards?.level + 1}</p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-4">Recent Achievements</h3>
            <div className="space-y-3">
              {rewards?.achievements?.slice(0, 5).map((achievement, index) => (
                <div key={index} className="flex items-center p-3 bg-dark-700 rounded-lg">
                  <div className="p-2 bg-yellow-500/20 rounded-lg mr-3">
                    <Award className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{achievement.title}</p>
                    <p className="text-sm text-dark-300">{achievement.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-yellow-500">+{achievement.points} pts</p>
                    <p className="text-xs text-dark-400">
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!rewards?.achievements || rewards.achievements.length === 0) && (
                <p className="text-dark-300 text-center py-4">No achievements yet. Start reporting issues to earn rewards!</p>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mt-8">
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">Community Leaderboard</h3>
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div key={index} className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
                  <div className="flex items-center mr-4">
                    {getRankIcon(user.rank)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-sm text-dark-300">
                      Level {user.level} • {user.reportsSubmitted} reports • {user.streak} day streak
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-500">{user.points} pts</p>
                    <p className="text-sm text-dark-300">{user.coins} coins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Available Achievements */}
        <div className="mt-8">
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">Available Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => {
                const isEarned = rewards?.achievements?.some(a => a.type === achievement.type);
                return (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isEarned 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`p-2 rounded-lg mr-3 ${
                        isEarned ? 'bg-yellow-500/20' : 'bg-dark-600'
                      }`}>
                        <span className="text-2xl">{achievement.icon}</span>
                      </div>
                      <div>
                        <h4 className={`font-medium ${
                          isEarned ? 'text-yellow-500' : 'text-white'
                        }`}>
                          {achievement.title}
                        </h4>
                        <p className="text-sm text-dark-300">{achievement.description}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <span className="text-xs bg-primary-500/20 text-primary-500 px-2 py-1 rounded">
                          +{achievement.points} pts
                        </span>
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
                          +{achievement.coins} coins
                        </span>
                      </div>
                      {isEarned && (
                        <div className="flex items-center text-yellow-500">
                          <Award className="w-4 h-4 mr-1" />
                          <span className="text-xs font-medium">Earned</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsDashboard;
