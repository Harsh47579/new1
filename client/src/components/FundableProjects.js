import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp, 
  Heart,
  ExternalLink,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  Target,
  Calendar,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useSocket from '../hooks/useSocket';

const FundableProjects = () => {
  const [filters, setFilters] = useState({
    category: '',
    sort: 'newest',
    search: ''
  });
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();
  const socket = useSocket();

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleFundingUpdate = (data) => {
      console.log('Funding update received:', data);
      
      // Update the specific campaign in the cache
      queryClient.setQueryData(['fundingCampaigns', filters], (oldData) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          campaigns: oldData.campaigns.map(campaign => 
            campaign._id === data.campaignId 
              ? {
                  ...campaign,
                  currentAmount: data.currentAmount,
                  progressPercentage: data.progressPercentage,
                  stats: {
                    ...campaign.stats,
                    totalContributors: data.totalContributors
                  },
                  isCompleted: data.isCompleted,
                  fundingStatus: data.fundingStatus
                }
              : campaign
          )
        };
      });

      // Show toast notification
      if (data.currentAmount > 0) {
        toast.success(`Campaign updated! New total: ₹${data.currentAmount.toLocaleString()}`);
      }
    };

    socket.on('funding_update', handleFundingUpdate);

    return () => {
      socket.off('funding_update', handleFundingUpdate);
    };
  }, [socket, queryClient, filters]);

  // Fetch funding campaigns
  const { data, isLoading, error, refetch } = useQuery(
    ['fundingCampaigns', filters],
    async () => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.search) params.append('q', filters.search);
      
      const response = await axios.get(`/api/funding/projects?${params}`);
      return response.data;
    },
    {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    }
  );

  // Create payment intent mutation
  const createIntentMutation = useMutation(
    async ({ campaignId, amount }) => {
      const response = await axios.post('/api/funding/create-intent', {
        campaignId,
        amount: parseFloat(amount),
        currency: 'INR'
      });
      return response.data;
    }
  );

  // Contribution mutation
  const contributeMutation = useMutation(
    async ({ campaignId, amount, paymentIntentId }) => {
      const response = await axios.post(`/api/funding/projects/${campaignId}/contribute`, {
        amount: parseFloat(amount),
        paymentIntentId
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Contribution successful!');
        setSelectedCampaign(null);
        setContributionAmount('');
        queryClient.invalidateQueries('fundingCampaigns');
        queryClient.invalidateQueries('userDashboardData');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Contribution failed');
      }
    }
  );

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!selectedCampaign || !contributionAmount) return;

    setIsContributing(true);
    try {
      // First create payment intent
      const intentData = await createIntentMutation.mutateAsync({
        campaignId: selectedCampaign._id,
        amount: contributionAmount
      });

      // Then process contribution
      await contributeMutation.mutateAsync({
        campaignId: selectedCampaign._id,
        amount: contributionAmount,
        paymentIntentId: intentData.paymentIntent.id
      });
    } catch (error) {
      console.error('Contribution error:', error);
    } finally {
      setIsContributing(false);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20';
      default: return 'text-green-500 bg-green-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'funded': return Target;
      case 'expired': return X;
      default: return Clock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/20';
      case 'funded': return 'text-blue-500 bg-blue-500/20';
      case 'expired': return 'text-red-500 bg-red-500/20';
      default: return 'text-yellow-500 bg-yellow-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
          <span className="text-dark-300">Loading fundable projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="text-center py-4">
          <div className="text-red-500 mb-2">Failed to load projects</div>
          <button
            onClick={() => refetch()}
            className="text-primary-500 hover:text-primary-400 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <DollarSign className="w-6 h-6 text-primary-500 mr-2" />
          <h2 className="text-xl font-semibold text-white">Fundable Projects</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-dark-300 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Filter & Search</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-primary-400 hover:text-primary-300"
          >
            <Filter size={16} />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="environment">Environment</option>
              <option value="education">Education</option>
              <option value="healthcare">Healthcare</option>
              <option value="transport">Transport</option>
              <option value="safety">Safety</option>
              <option value="technology">Technology</option>
              <option value="community">Community</option>
              <option value="other">Other</option>
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
              className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="deadline">Deadline</option>
              <option value="progress">Progress</option>
              <option value="goal">Goal Amount</option>
            </select>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => {
          const progress = campaign.progressPercentage || 0;
          const isGoalReached = campaign.currentAmount >= campaign.goal;
          const StatusIcon = getStatusIcon(campaign.fundingStatus);

          return (
            <div key={campaign._id} className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden hover:border-primary-500/50 transition-all duration-200 group">
              {/* Campaign Image */}
              <div className="h-48 bg-dark-700 flex items-center justify-center relative">
                {campaign.issue?.images && campaign.issue.images.length > 0 ? (
                  <img
                    src={campaign.issue.images[0].url}
                    alt={campaign.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-dark-400 text-center">
                    <div className="text-4xl mb-2">💰</div>
                    <div className="text-sm">Funding Campaign</div>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(campaign.fundingStatus)}`}>
                    <StatusIcon size={12} />
                    <span>{campaign.fundingStatus}</span>
                  </span>
                </div>
              </div>

              <div className="p-4">
                {/* Title and Category */}
                <div className="mb-3">
                  <h3 className="text-white font-medium mb-1 line-clamp-2">{campaign.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-300 capitalize">{campaign.category}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(campaign.priority)}`}>
                      {campaign.priority}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-dark-300 text-sm mb-3 line-clamp-2">
                  {campaign.description}
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-dark-300">Progress</span>
                    <span className="text-white font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Funding Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-dark-300">Raised</div>
                    <div className="text-white font-medium">₹{campaign.currentAmount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-dark-300">Goal</div>
                    <div className="text-white font-medium">₹{campaign.goal.toLocaleString()}</div>
                  </div>
                </div>

                {/* Campaign Info */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center text-dark-300">
                    <Users className="w-4 h-4 mr-1" />
                    {campaign.stats.totalContributors} contributors
                  </div>
                  <div className="flex items-center text-dark-300">
                    <Calendar className="w-4 h-4 mr-1" />
                    {campaign.daysRemaining} days left
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setSelectedCampaign(campaign)}
                  disabled={isGoalReached || campaign.fundingStatus === 'expired'}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    isGoalReached || campaign.fundingStatus === 'expired'
                      ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  {isGoalReached ? 'Goal Reached!' : 
                   campaign.fundingStatus === 'expired' ? 'Expired' : 
                   'Contribute'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {campaigns.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-medium text-white mb-2">No Funding Campaigns</h3>
          <p className="text-dark-300">Check back later for new crowdfunding opportunities!</p>
        </div>
      )}

      {/* Contribution Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg border border-dark-700 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Contribute to Campaign</h3>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="text-dark-300 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <h4 className="text-white font-medium mb-2">{selectedCampaign.title}</h4>
                <p className="text-dark-300 text-sm capitalize">{selectedCampaign.category}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-dark-300">Current Progress</span>
                  <span className="text-white font-medium">
                    {Math.round(selectedCampaign.progressPercentage)}%
                  </span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ width: `${Math.min(selectedCampaign.progressPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-300 mt-1">
                  <span>₹{selectedCampaign.currentAmount.toLocaleString()}</span>
                  <span>₹{selectedCampaign.goal.toLocaleString()}</span>
                </div>
              </div>

              <div className="mb-4 p-3 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-300">Days Remaining</span>
                  <span className="text-white font-medium">{selectedCampaign.daysRemaining} days</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-dark-300">Contributors</span>
                  <span className="text-white font-medium">{selectedCampaign.stats.totalContributors}</span>
                </div>
              </div>

              <form onSubmit={handleContribute}>
                <div className="mb-4">
                  <label className="block text-white font-medium mb-2">Contribution Amount (₹)</label>
                  <input
                    type="number"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    min="10"
                    max={selectedCampaign.goal - selectedCampaign.currentAmount}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter amount (min ₹10)"
                    required
                  />
                  <p className="text-xs text-dark-400 mt-1">
                    Remaining: ₹{(selectedCampaign.goal - selectedCampaign.currentAmount).toLocaleString()}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCampaign(null)}
                    className="flex-1 py-2 px-4 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isContributing || !contributionAmount || createIntentMutation.isLoading}
                    className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {isContributing ? 'Processing...' : 'Contribute'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundableProjects;
