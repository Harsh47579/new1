import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  TrendingUp, 
  Calendar,
  Filter,
  RefreshCw,
  Crown,
  Star,
  Target,
  CheckCircle
} from 'lucide-react';
import clsx from 'clsx';

const Leaderboard = () => {
  const [period, setPeriod] = useState('all');
  const [limit, setLimit] = useState(10);

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading, error, refetch } = useQuery(
    ['community-leaderboard', period, limit],
    async () => {
      const params = new URLSearchParams();
      params.append('period', period);
      params.append('limit', limit);
      
      const response = await axios.get(`/api/community/leaderboard?${params.toString()}`);
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  // Fetch community stats
  const { data: communityStats } = useQuery(
    'community-stats',
    async () => {
      const response = await axios.get('/api/community/stats');
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000 // 10 minutes
    }
  );

  const leaderboard = leaderboardData?.leaderboard || [];
  const currentUserRank = leaderboardData?.currentUserRank;
  const totalParticipants = leaderboardData?.totalParticipants || 0;
  const stats = communityStats?.stats || {};

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return Crown;
      case 2: return Trophy;
      case 3: return Medal;
      default: return Award;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'text-yellow-400 bg-yellow-900/20';
      case 2: return 'text-gray-400 bg-gray-900/20';
      case 3: return 'text-orange-400 bg-orange-900/20';
      default: return 'text-blue-400 bg-blue-900/20';
    }
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'all': return 'All Time';
      default: return 'All Time';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Leaderboard</h3>
        <p className="text-dark-400 mb-4">{error.message}</p>
        <button onClick={refetch} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Community Leaderboard</h2>
          <p className="text-dark-400">Top contributors making a difference in our community</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center space-x-2 text-primary-400 hover:text-primary-300 transition-colors"
        >
          <RefreshCw size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-primary-400" />
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Total Issues</p>
              <p className="text-2xl font-bold text-white">{stats.totalIssues || 0}</p>
            </div>
            <Target className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Resolved</p>
              <p className="text-2xl font-bold text-green-400">{stats.resolvedIssues || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Resolution Rate</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.resolutionRate || 0}%</p>
            </div>
            <Award className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-white mb-2">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input w-full"
            >
              <option value="all">All Time</option>
              <option value="year">This Year</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-white mb-2">Show Top</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="input w-full"
            >
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Current User Rank */}
      {currentUserRank && (
        <div className="bg-primary-900/20 border border-primary-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold">{currentUserRank}</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Your Rank</h3>
                <p className="text-primary-300 text-sm">
                  You are #{currentUserRank} out of {totalParticipants} participants
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-primary-300 text-sm">Keep contributing to climb higher!</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-dark-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h3 className="text-lg font-semibold text-white">
            {getPeriodLabel(period)} Leaderboard
          </h3>
          <p className="text-dark-400 text-sm">
            Showing top {leaderboard.length} contributors
          </p>
        </div>
        
        <div className="divide-y divide-dark-700">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
              <p className="text-dark-400">No contributors found for the selected period.</p>
            </div>
          ) : (
            leaderboard.map((user, index) => {
              const RankIcon = getRankIcon(user.rank);
              const isTopThree = user.rank <= 3;
              
              return (
                <div
                  key={user._id}
                  className={clsx(
                    'p-6 transition-colors',
                    isTopThree ? 'bg-gradient-to-r from-dark-800 to-dark-700' : 'hover:bg-dark-700'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={clsx(
                        'w-12 h-12 rounded-full flex items-center justify-center',
                        getRankColor(user.rank)
                      )}>
                        {isTopThree ? (
                          <RankIcon size={24} />
                        ) : (
                          <span className="text-lg font-bold">{user.rank}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-lg">{user.name}</h4>
                        <p className="text-dark-400 text-sm">{user.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-dark-500">
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-dark-500">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{user.score}</p>
                          <p className="text-xs text-dark-400">Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-white">{user.totalReports}</p>
                          <p className="text-xs text-dark-400">Reports</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-green-400">{user.resolvedReports}</p>
                          <p className="text-xs text-dark-400">Resolved</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-blue-400">{user.totalUpvotes}</p>
                          <p className="text-xs text-dark-400">Upvotes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Stats */}
                  <div className="mt-4 flex items-center justify-between text-sm text-dark-400">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-1">
                        <CheckCircle size={14} />
                        <span>{user.totalConfirmations} confirmations</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star size={14} />
                        <span>{user.communityScore} community score</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <TrendingUp size={14} />
                        <span>{user.coins} coins</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Award size={14} />
                        <span>{user.points} points</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top Contributors */}
      {stats.topContributors && stats.topContributors.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Contributors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topContributors.map((contributor, index) => (
              <div key={index} className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{contributor.name}</h4>
                    <p className="text-dark-400 text-sm">
                      {contributor.totalReports} reports, {contributor.resolvedReports} resolved
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Community Score</span>
                  <span className="text-yellow-400 font-semibold">
                    {contributor.communityScore || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
