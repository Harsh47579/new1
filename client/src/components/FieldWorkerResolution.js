import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  X, 
  AlertCircle,
  Image as ImageIcon,
  Trash2,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FieldWorkerResolution = ({ issue, onClose, onSuccess }) => {
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const beforePhotoRef = useRef(null);
  const afterPhotoRef = useRef(null);
  const queryClient = useQueryClient();

  const resolutionMutation = useMutation(
    async (formData) => {
      const response = await axios.put(`/api/issues/${issue._id}/status`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Issue resolved successfully!');
        queryClient.invalidateQueries('issues');
        queryClient.invalidateQueries('assignedIssues');
        onSuccess?.(data);
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to resolve issue');
      }
    }
  );

  const handlePhotoUpload = (type, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    if (type === 'before') {
      setBeforePhoto(file);
    } else {
      setAfterPhoto(file);
    }
  };

  const handleFileInputChange = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      handlePhotoUpload(type, file);
    }
  };

  const handleDrop = (type, event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handlePhotoUpload(type, file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const removePhoto = (type) => {
    if (type === 'before') {
      setBeforePhoto(null);
      if (beforePhotoRef.current) {
        beforePhotoRef.current.value = '';
      }
    } else {
      setAfterPhoto(null);
      if (afterPhotoRef.current) {
        afterPhotoRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!beforePhoto || !afterPhoto) {
      toast.error('Both before and after photos are required');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a resolution description');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('status', 'resolved');
      formData.append('description', description);
      formData.append('beforePhoto', beforePhoto);
      formData.append('afterPhoto', afterPhoto);

      await resolutionMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const PhotoUploadArea = ({ type, photo, onRemove }) => (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        photo
          ? 'border-green-500 bg-green-500/10'
          : 'border-dark-600 hover:border-primary-500'
      }`}
      onDrop={(e) => handleDrop(type, e)}
      onDragOver={handleDragOver}
    >
      {photo ? (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={URL.createObjectURL(photo)}
              alt={`${type} photo`}
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => onRemove(type)}
              className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center text-green-500">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Photo uploaded successfully</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-dark-400" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">
              Upload {type === 'before' ? 'Before' : 'After'} Photo
            </p>
            <p className="text-dark-300 text-sm mb-4">
              Drag & drop or click to select an image
            </p>
            <input
              ref={type === 'before' ? beforePhotoRef : afterPhotoRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileInputChange(type, e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => {
                if (type === 'before') {
                  beforePhotoRef.current?.click();
                } else {
                  afterPhotoRef.current?.click();
                }
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
            >
              Select Image
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg border border-dark-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Resolve Issue</h2>
              <p className="text-dark-300 text-sm mt-1">{issue.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-dark-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Issue Details */}
            <div className="bg-dark-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Issue Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-dark-300">Category:</span>
                  <span className="text-white ml-2">{issue.category}</span>
                </div>
                <div>
                  <span className="text-dark-300">Priority:</span>
                  <span className="text-white ml-2 capitalize">{issue.priority}</span>
                </div>
                <div>
                  <span className="text-dark-300">Location:</span>
                  <span className="text-white ml-2">{issue.location.address}</span>
                </div>
                <div>
                  <span className="text-dark-300">Reported:</span>
                  <span className="text-white ml-2">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-medium mb-4">Proof of Resolution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before Photo */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Before Photo *
                    </label>
                    <PhotoUploadArea
                      type="before"
                      photo={beforePhoto}
                      onRemove={removePhoto}
                    />
                  </div>

                  {/* After Photo */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      After Photo *
                    </label>
                    <PhotoUploadArea
                      type="after"
                      photo={afterPhoto}
                      onRemove={removePhoto}
                    />
                  </div>
                </div>
              </div>

              {/* Resolution Description */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Resolution Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what was done to resolve the issue..."
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  required
                />
              </div>
            </div>

            {/* Requirements Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-500 font-medium mb-1">Important Requirements</p>
                  <ul className="text-yellow-400 space-y-1">
                    <li>• Both before and after photos are mandatory</li>
                    <li>• Photos should clearly show the issue and its resolution</li>
                    <li>• Provide a detailed description of the work performed</li>
                    <li>• This information will be shared with the citizen who reported the issue</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-dark-300">
              {beforePhoto && afterPhoto ? (
                <span className="text-green-500">Ready to submit resolution</span>
              ) : (
                <span>Please upload both photos to continue</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!beforePhoto || !afterPhoto || !description.trim() || isSubmitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Resolution
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldWorkerResolution;
