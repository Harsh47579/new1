import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { useMutation } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import AIAssistant from '../components/AIAssistant';
import GoogleMapPicker from '../components/GoogleMapPicker';
import AIService from '../services/aiService';
import useGeolocation from '../hooks/useGeolocation';
import { 
  Camera, 
  Upload, 
  Mic, 
  MapPin, 
  X, 
  AlertCircle,
  CheckCircle,
  Wand2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ReportIssue = () => {
  const { isAuthenticated } = useAuth();
  const { location, isLoading: isLocationLoading, error: locationError, retryLocation } = useGeolocation();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm();

  // Watch form values for AI analysis
  const watchedTitle = watch('title');
  const watchedDescription = watch('description');
  const watchedCategory = watch('category');

  // AI Analysis functions
  const handleAIAnalysis = (analysis) => {
    setAiAnalysis(analysis);
    if (analysis.suggestedCategory) {
      setValue('category', analysis.suggestedCategory);
    }
    if (analysis.suggestedSubcategory) {
      setValue('subcategory', analysis.suggestedSubcategory);
    }
    if (analysis.suggestedPriority) {
      setValue('priority', analysis.suggestedPriority);
    }
    if (analysis.enhancedDescription) {
      setValue('description', analysis.enhancedDescription);
    }
  };

  const resetAIAnalysis = () => {
    setAiAnalysis(null);
  };

  // AI Description Generation
  const generateAIDescription = async () => {
    if (!watchedCategory || !watchedTitle) {
      toast.error('Please select a category and enter a title first');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const result = AIService.createDescription(
        watchedCategory, 
        watchedTitle, 
        location, 
        watchedDescription
      );
      
      setValue('description', result.description);
      toast.success('AI description generated!');
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error('Failed to generate AI description');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Real-time AI Analysis when image is uploaded
  const performRealTimeAnalysis = async (title, description, imageFile) => {
    if (!title || !description) return;

    try {
      const analysis = await AIService.analyzeIssue(title, description, imageFile);
      if (analysis) {
        setAiAnalysis(analysis);
        toast.success('AI analysis completed! Check suggestions below.');
      }
    } catch (error) {
      console.error('Real-time AI analysis failed:', error);
    }
  };

  // Update form when location is available
  useEffect(() => {
    if (location) {
      const coords = [location.lng, location.lat];
      setValue('location.coordinates', coords);
      setValue('location.address', `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      console.log('Location set in form:', { lat: location.lat, lng: location.lng, coords });
    }
  }, [location, setValue]);

  // Trigger AI analysis when title or description changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedTitle && watchedDescription && mediaFiles.length > 0) {
        const imageFile = mediaFiles.find(f => f.type === 'image')?.file;
        if (imageFile) {
          performRealTimeAnalysis(watchedTitle, watchedDescription, imageFile);
        }
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [watchedTitle, watchedDescription, mediaFiles]);

  // File upload handling
  const onDrop = (acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 'audio'
    }));
    setMediaFiles(prev => [...prev, ...newFiles]);

    // Trigger AI analysis if we have title, description, and an image
    if (watchedTitle && watchedDescription && acceptedFiles.length > 0) {
      const imageFile = acceptedFiles[0];
      performRealTimeAnalysis(watchedTitle, watchedDescription, imageFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.avi', '.mov'],
      'audio/*': ['.wav', '.mp3', '.m4a']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeMediaFile = (index) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Submit issue
  const submitIssue = useMutation(async (data) => {
    console.log('Submitting issue with data:', data);
    console.log('Media files:', mediaFiles);
    console.log('Location data:', data.location);
    
    const formData = new FormData();
    
    // Add form data
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('subcategory', data.subcategory || '');
    
    // Add location data - properly structured for FormData
    formData.append('location.type', data.location.type || 'Point');
    formData.append('location.coordinates', JSON.stringify(data.location.coordinates));
    formData.append('location.address', data.location.address);
    formData.append('location.city', data.location.city || 'Ranchi');
    formData.append('location.state', data.location.state || 'Jharkhand');
    
    formData.append('priority', data.priority || 'medium');
    formData.append('isAnonymous', data.isAnonymous || false);
    
    // Add media files
    mediaFiles.forEach((mediaFile, index) => {
      console.log(`Adding media file ${index}:`, mediaFile.file.name, mediaFile.file.size);
      formData.append('media', mediaFile.file);
    });

    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    try {
      const response = await axios.post('/api/issues', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Issue submitted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting issue:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  });

  // Custom form submission handler that bypasses React Hook Form validation
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Custom form submission started');
    console.log('Location state:', location);
    console.log('Location loading:', isLocationLoading);
    console.log('Location error:', locationError);
    
    if (!isAuthenticated) {
      toast.error('Please login to report an issue');
      return;
    }

    // Check if location is still loading
    if (isLocationLoading) {
      toast.error('Please wait while we get your location...');
      return;
    }

    // Get form values manually
    const formData = new FormData(e.target);
    const title = formData.get('title') || '';
    const description = formData.get('description') || '';
    const category = formData.get('category') || '';
    const subcategory = formData.get('subcategory') || '';
    const priority = formData.get('priority') || 'medium';
    const isAnonymous = formData.get('isAnonymous') === 'on';
    const manualLat = parseFloat(formData.get('manualLat')) || null;
    const manualLng = parseFloat(formData.get('manualLng')) || null;

    console.log('Form values:', { title, description, category, subcategory, priority, isAnonymous, manualLat, manualLng });

    // Validate required fields first
    if (!title || title.trim().length < 5) {
      toast.error('Title must be at least 5 characters long');
      return;
    }

    if (!description || description.trim().length < 10) {
      toast.error('Description must be at least 10 characters long');
      return;
    }

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    // Create location data - use current location, manual entry, or default coordinates
    let locationData;
    
    if (location && !locationError) {
      // Use detected location
      const coords = [location.lng, location.lat];
      locationData = {
        type: 'Point',
        coordinates: coords,
        address: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        city: 'Ranchi',
        state: 'Jharkhand'
      };
      console.log('Using detected location:', coords);
    } else if (manualLat && manualLng && !isNaN(manualLat) && !isNaN(manualLng)) {
      // Use manually entered coordinates
      const coords = [manualLng, manualLat];
      locationData = {
        type: 'Point',
        coordinates: coords,
        address: `${manualLat.toFixed(6)}, ${manualLng.toFixed(6)}`,
        city: 'Ranchi',
        state: 'Jharkhand'
      };
      console.log('Using manual coordinates:', coords);
    } else {
      // Use default coordinates for Ranchi
      const coords = [85.3096, 23.3441]; // Ranchi coordinates
      locationData = {
        type: 'Point',
        coordinates: coords,
        address: '23.3441, 85.3096',
        city: 'Ranchi',
        state: 'Jharkhand'
      };
      console.log('Using default coordinates for Ranchi');
    }

    // Create the final data object
    const finalData = {
      title: title.trim(),
      description: description.trim(),
      category,
      subcategory: subcategory.trim(),
      location: locationData,
      priority,
      isAnonymous
    };

    console.log('Final data before submission:', finalData);

    setIsSubmitting(true);
    try {
      console.log('Calling submitIssue.mutateAsync...');
      await submitIssue.mutateAsync(finalData);
      toast.success('Issue reported successfully!');
      
      // Reset form
      setMediaFiles([]);
      setValue('title', '');
      setValue('description', '');
      setValue('category', '');
      setValue('subcategory', '');
      setValue('manualLat', '');
      setValue('manualLng', '');
      setAiAnalysis(null);
      
      // Reset form fields
      e.target.reset();
    } catch (error) {
      console.error('Submit error details:', error);
      
      let errorMessage = 'Failed to submit issue';
      
      if (error.response?.data) {
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          // Handle validation errors
          const firstError = error.response.data.errors[0];
          errorMessage = firstError.msg || errorMessage;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Final error message:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'Road & Pothole Issues',
    'Streetlight Problems',
    'Waste Management',
    'Water Supply',
    'Sewage & Drainage',
    'Public Safety',
    'Parks & Recreation',
    'Traffic Management',
    'Other'
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={64} className="text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Login Required</h2>
          <p className="text-dark-300 mb-6">
            Please login to report civic issues and help improve your community.
          </p>
          <div className="space-x-4">
            <a href="/login" className="btn-primary">
              Login
            </a>
            <a href="/register" className="btn-outline">
              Register
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card">
          <h1 className="text-3xl font-bold text-white mb-2">Report an Issue</h1>
          <p className="text-dark-300 mb-8">
            Help make Jharkhand a better place by reporting civic issues in your area.
          </p>

          {/* AI Assistant */}
          <AIAssistant 
            onAnalysisComplete={handleAIAnalysis}
            onReset={resetAIAnalysis}
          />

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* AI Analysis Results Display */}
            {aiAnalysis && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <h4 className="font-medium text-green-500">AI Analysis Complete</h4>
                  </div>
                  <button
                    type="button"
                    onClick={resetAIAnalysis}
                    className="text-dark-300 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-dark-300">Suggested Category: </span>
                    <span className="text-white font-medium">{aiAnalysis.suggestedCategory}</span>
                  </div>
                  <div>
                    <span className="text-dark-300">Suggested Priority: </span>
                    <span className={`font-medium capitalize ${
                      aiAnalysis.suggestedPriority === 'high' ? 'text-red-500' :
                      aiAnalysis.suggestedPriority === 'medium' ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {aiAnalysis.suggestedPriority}
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-300">Confidence: </span>
                    <span className="text-white font-medium">{aiAnalysis.confidence}%</span>
                  </div>
                  <div>
                    <span className="text-dark-300">Department: </span>
                    <span className="text-white font-medium">{aiAnalysis.suggestedDepartment}</span>
                  </div>
                </div>
                {aiAnalysis.reasoning && (
                  <div className="text-sm mb-3">
                    <span className="text-dark-300">AI Reasoning: </span>
                    <span className="text-white">{aiAnalysis.reasoning}</span>
                  </div>
                )}
                <div className="text-xs text-green-400">
                  💡 AI suggestions have been applied to your form. You can modify them if needed.
                </div>
              </div>
            )}

            {/* Issue Category */}
            <div>
              <label className="block text-white font-medium mb-2">
                Select issue category *
              </label>
              <select
                {...register('category', { required: 'Category is required' })}
                name="category"
                className="input"
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-400 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Location with Google Maps */}
            <div>
              <label className="block text-white font-medium mb-2">
                Location *
              </label>
              
              {/* Location Status Display */}
              {isLocationLoading && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-blue-500 font-medium">Getting your location...</span>
                  </div>
                  <p className="text-blue-300 text-sm mt-1">
                    Please allow location access when prompted by your browser.
                  </p>
                </div>
              )}

              {locationError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-500 font-medium">Location Error</span>
                    </div>
                    <button
                      type="button"
                      onClick={retryLocation}
                      className="btn-outline text-sm flex items-center space-x-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry</span>
                    </button>
                  </div>
                  <p className="text-red-300 text-sm mt-1">{locationError}</p>
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-300 mb-2">Manual Location Entry:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="manualLat"
                        type="number"
                        step="any"
                        placeholder="Latitude (e.g., 23.3441)"
                        className="input text-sm"
                        onChange={(e) => {
                          const lat = parseFloat(e.target.value);
                          if (!isNaN(lat)) {
                            // Store manual coordinates in a state variable
                            setValue('manualLat', lat);
                          }
                        }}
                      />
                      <input
                        name="manualLng"
                        type="number"
                        step="any"
                        placeholder="Longitude (e.g., 85.3096)"
                        className="input text-sm"
                        onChange={(e) => {
                          const lng = parseFloat(e.target.value);
                          if (!isNaN(lng)) {
                            // Store manual coordinates in a state variable
                            setValue('manualLng', lng);
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Enter coordinates manually if location detection fails
                    </p>
                  </div>
                </div>
              )}

              {location && !isLocationLoading && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-medium">Location Detected</span>
                  </div>
                  <p className="text-green-300 text-sm mt-1">
                    Latitude: {location.lat.toFixed(6)}, Longitude: {location.lng.toFixed(6)}
                  </p>
                </div>
              )}

              {!location && !isLocationLoading && !locationError && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-500 font-medium">Default Location</span>
                  </div>
                  <p className="text-blue-300 text-sm mt-1">
                    Using default coordinates for Ranchi, Jharkhand
                  </p>
                </div>
              )}

              <div className="mb-4">
                <GoogleMapPicker
                  onLocationSelect={(selectedLocation) => {
                    const coords = [selectedLocation.lng, selectedLocation.lat];
                    // Note: We can't directly set location from the hook, but we can update the form
                    setValue('location.coordinates', coords);
                    setValue('location.address', `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`);
                    console.log('Location selected from map:', selectedLocation, 'coords:', coords);
                  }}
                  initialLocation={location}
                />
              </div>
              <input
                type="text"
                placeholder="Location will be set automatically from map selection"
                className="input"
                readOnly
                value={location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : ''}
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-white font-medium mb-2">
                Issue Title *
              </label>
              <input
                {...register('title', { 
                  required: 'Title is required',
                  minLength: { value: 5, message: 'Title must be at least 5 characters' }
                })}
                name="title"
                type="text"
                placeholder="Brief description of the issue"
                className="input"
              />
              {errors.title && (
                <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Description with AI Generation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white font-medium">
                  Detailed Description *
                </label>
                <button
                  type="button"
                  onClick={generateAIDescription}
                  disabled={isGeneratingDescription || !watchedCategory || !watchedTitle}
                  className="btn-outline text-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingDescription ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  <span>{isGeneratingDescription ? 'Generating...' : 'AI Generate'}</span>
                </button>
              </div>
              <textarea
                {...register('description', { 
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' }
                })}
                name="description"
                rows={6}
                placeholder="Provide more details about the issue, when you noticed it, and how it affects the community. Or use AI Generate to create a detailed description based on your category selection."
                className="textarea"
              />
              {errors.description && (
                <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
              )}
              {watchedCategory && (
                <p className="text-xs text-dark-300 mt-1">
                  💡 AI can generate a detailed description based on your selected category: <span className="text-primary-500">{watchedCategory}</span>
                </p>
              )}
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-white font-medium mb-2">
                Photos/Videos (Optional)
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-primary-500'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Camera size={32} className="text-primary-400 mx-auto mb-2" />
                  <p className="text-sm text-dark-300">Take Photo</p>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-primary-500'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload size={32} className="text-primary-400 mx-auto mb-2" />
                  <p className="text-sm text-dark-300">Upload Files</p>
                </div>

                <div className="border-2 border-dashed border-dark-600 rounded-lg p-4 text-center">
                  <Mic size={32} className="text-primary-400 mx-auto mb-2" />
                  <p className="text-sm text-dark-300">Voice Note</p>
                </div>
              </div>

              {/* Media Preview */}
              {mediaFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {mediaFiles.map((mediaFile, index) => (
                    <div key={index} className="relative">
                      {mediaFile.type === 'image' ? (
                        <img
                          src={mediaFile.preview}
                          alt="Preview"
                          className="w-full h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-24 bg-dark-700 rounded flex items-center justify-center">
                          <span className="text-dark-400 text-sm">
                            {mediaFile.type === 'video' ? 'Video' : 'Audio'}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaFile(index)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-white font-medium mb-2">
                Priority Level
              </label>
              <select {...register('priority')} name="priority" className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Anonymous Option */}
            <div className="flex items-center">
              <input
                {...register('isAnonymous')}
                name="isAnonymous"
                type="checkbox"
                id="anonymous"
                className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="anonymous" className="ml-2 text-dark-300">
                Report anonymously
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLocationLoading}
              className={`w-full flex items-center justify-center space-x-2 py-3 text-lg ${
                isSubmitting || isLocationLoading
                  ? 'bg-gray-500 cursor-not-allowed opacity-50'
                  : 'btn-primary'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Submitting...</span>
                </>
              ) : isLocationLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Getting Location...</span>
                </>
              ) : (!location && locationError) ? (
                <>
                  <AlertCircle size={20} />
                  <span>Location Required</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
