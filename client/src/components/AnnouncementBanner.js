import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Megaphone, 
  X, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  User
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AnnouncementBanner = () => {
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const queryClient = useQueryClient();

  // Fetch announcements
  const { data: announcementsData, refetch } = useQuery(
    'announcements',
    async () => {
      const response = await axios.get('/api/announcements?limit=5');
      return response.data;
    },
    {
      refetchInterval: 300000, // Refetch every 5 minutes
      onSuccess: (data) => {
        const announcements = data?.data?.announcements || [];
        if (announcements.length > 0) {
          const unreadAnnouncements = announcements.filter(
            announcement => !dismissedAnnouncements.includes(announcement._id)
          );
          if (unreadAnnouncements.length > 0) {
            setCurrentAnnouncement(unreadAnnouncements[0]);
          }
        }
      }
    }
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    async (announcementId) => {
      const response = await axios.put(`/api/announcements/${announcementId}/read`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('announcements');
      }
    }
  );

  // Get unread count
  const { data: unreadData } = useQuery(
    'unreadCount',
    async () => {
      const response = await axios.get('/api/announcements/unread-count');
      return response.data;
    },
    {
      refetchInterval: 60000 // Refetch every minute
    }
  );

  const announcements = announcementsData?.data?.announcements || [];
  const unreadCount = unreadData?.data?.unreadCount || 0;

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500/50 bg-red-500/10';
      case 'high':
        return 'border-orange-500/50 bg-orange-500/10';
      case 'medium':
        return 'border-blue-500/50 bg-blue-500/10';
      default:
        return 'border-green-500/50 bg-green-500/10';
    }
  };

  const handleDismiss = (announcementId) => {
    setDismissedAnnouncements(prev => [...prev, announcementId]);
    setCurrentAnnouncement(null);
    
    // Mark as read
    markAsReadMutation.mutate(announcementId);
  };

  const handleNext = () => {
    const unreadAnnouncements = announcements.filter(
      announcement => !dismissedAnnouncements.includes(announcement._id)
    );
    
    const currentIndex = unreadAnnouncements.findIndex(
      announcement => announcement._id === currentAnnouncement?._id
    );
    
    if (currentIndex < unreadAnnouncements.length - 1) {
      setCurrentAnnouncement(unreadAnnouncements[currentIndex + 1]);
    } else {
      setCurrentAnnouncement(null);
    }
  };

  const handleShowAll = () => {
    setShowAll(true);
  };

  const handleCloseAll = () => {
    setShowAll(false);
    setCurrentAnnouncement(null);
  };

  // Don't show banner if no announcements or all dismissed
  if (!currentAnnouncement && !showAll) {
    return null;
  }

  return (
    <>
      {/* Single Announcement Banner */}
      {currentAnnouncement && !showAll && (
        <div className={`fixed top-4 left-4 right-4 z-50 rounded-lg border p-4 ${getPriorityColor(currentAnnouncement.priority)}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              {getPriorityIcon(currentAnnouncement.priority)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">
                  {currentAnnouncement.title}
                </h4>
                <div className="flex items-center space-x-2">
                  {unreadCount > 1 && (
                    <button
                      onClick={handleNext}
                      className="text-xs text-white/70 hover:text-white"
                    >
                      Next ({unreadCount - 1})
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(currentAnnouncement._id)}
                    className="text-white/70 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/80 mb-2 line-clamp-2">
                {currentAnnouncement.content}
              </p>
              <div className="flex items-center justify-between text-xs text-white/60">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {currentAnnouncement.author?.name}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(currentAnnouncement.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={handleShowAll}
                  className="text-white/70 hover:text-white underline"
                >
                  View All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Announcements Modal */}
      {showAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg border border-dark-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-dark-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Megaphone className="w-6 h-6 text-primary-500 mr-2" />
                  <h2 className="text-xl font-semibold text-white">Announcements</h2>
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCloseAll}
                  className="text-dark-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📢</div>
                  <h3 className="text-lg font-medium text-white mb-2">No Announcements</h3>
                  <p className="text-dark-300">Check back later for updates!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement._id}
                      className={`p-4 rounded-lg border ${getPriorityColor(announcement.priority)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center">
                          {getPriorityIcon(announcement.priority)}
                          <h3 className="text-white font-medium ml-2">{announcement.title}</h3>
                        </div>
                        <span className="text-xs text-white/60">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm mb-3">{announcement.content}</p>
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {announcement.author?.name}
                        </span>
                        {announcement.tags && announcement.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {announcement.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-white/10 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-dark-700">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => refetch()}
                  className="text-primary-500 hover:text-primary-400 text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={handleCloseAll}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnnouncementBanner;
