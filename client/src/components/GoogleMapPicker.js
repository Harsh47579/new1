import React, { useState, useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useGeolocation from '../hooks/useGeolocation';
import { MAPS_CONFIG } from '../config/maps';

const MapComponent = ({ onLocationSelect, initialLocation, center }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: center || MAPS_CONFIG.DEFAULT_LOCATION,
        zoom: MAPS_CONFIG.DEFAULT_ZOOM,
        mapTypeId: 'roadmap',
        styles: MAPS_CONFIG.MAP_STYLES
      });

      // Add marker
      const marker = new window.google.maps.Marker({
        position: center || MAPS_CONFIG.DEFAULT_LOCATION,
        map: newMap,
        draggable: true,
        title: 'Issue Location'
      });

      markerRef.current = marker;
      setMap(newMap);

      // Add click listener to map
      newMap.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        const location = { lat, lng };
        
        marker.setPosition(location);
        setSelectedLocation(location);
        onLocationSelect(location);
      });

      // Add marker drag listener
      marker.addListener('dragend', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        const location = { lat, lng };
        
        setSelectedLocation(location);
        onLocationSelect(location);
      });
    }
  }, [map, center, onLocationSelect]);

  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo(selectedLocation);
      if (markerRef.current) {
        markerRef.current.setPosition(selectedLocation);
      }
    }
  }, [selectedLocation, map]);

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-64 rounded-lg" />
      {selectedLocation && (
        <div className="absolute top-2 right-2 bg-white rounded-lg p-2 shadow-lg">
          <div className="text-xs text-gray-600">
            <div>Lat: {selectedLocation.lat.toFixed(6)}</div>
            <div>Lng: {selectedLocation.lng.toFixed(6)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const LocationSearch = ({ onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        setIsSearching(false);
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          onLocationSelect({ lat, lng });
          toast.success('Location found!');
        } else {
          toast.error('Location not found. Please try a different search term.');
        }
      });
    } catch (error) {
      setIsSearching(false);
      toast.error('Error searching for location');
    }
  };

  return (
    <div className="mb-4">
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a location..."
            className="input pl-10"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="btn-primary flex items-center space-x-1"
        >
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>Search</span>
        </button>
      </div>
    </div>
  );
};

const GoogleMapPicker = ({ onLocationSelect, initialLocation, showSearch = true }) => {
  const [location, setLocation] = useState(initialLocation);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  // Use the improved geolocation hook with optional location
  const {
    location: userLocation,
    isLoading: isLocationLoading,
    hasUserLocation,
    retryLocation,
    setCustomLocation
  } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    showToast: false, // We'll handle toasts manually
    requireLocation: false // Make location optional
  });

  // Update location when user location is available
  useEffect(() => {
    if (userLocation && !initialLocation) {
      setLocation(userLocation);
      onLocationSelect(userLocation);
    }
  }, [userLocation, initialLocation, onLocationSelect]);

  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation);
    onLocationSelect(selectedLocation);
  };

  const getCurrentLocation = () => {
    if (hasUserLocation) {
      // User already has location, use it
      handleLocationSelect(userLocation);
      toast.success('Current location selected!');
    } else {
      // Try to get fresh location
      retryLocation();
    }
  };

  const render = (status) => {
    // Check if Google Maps API key is available
    const hasApiKey = MAPS_CONFIG.API_KEY && 
                     MAPS_CONFIG.API_KEY !== 'YOUR_API_KEY' &&
                     MAPS_CONFIG.API_KEY !== 'AIzaSyD7kwml3XPqLSMVDZ5K-cTSXMVHWyBzJb0'; // Don't use the example key
    
    if (!hasApiKey) {
      return (
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <MapPin className="w-5 h-5 text-yellow-500 mr-2" />
              <h4 className="font-medium text-yellow-500">Location Selection</h4>
            </div>
            <p className="text-yellow-300 text-sm mb-4">
              Google Maps API key not configured. Using current location or manual entry.
            </p>
            <div className="flex space-x-2 mb-4">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isLocationLoading}
                className="btn-outline flex items-center space-x-1 disabled:opacity-50"
              >
                <MapPin className="w-4 h-4" />
                <span>{isLocationLoading ? 'Getting Location...' : 'Use Current Location'}</span>
              </button>
            </div>
            {location && (
              <div className="bg-dark-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-white">
                    {hasUserLocation ? 'Your Location' : 'Selected Location'}
                  </span>
                </div>
                <div className="text-sm text-dark-300">
                  <div>Latitude: {location.lat.toFixed(6)}</div>
                  <div>Longitude: {location.lng.toFixed(6)}</div>
                  {!hasUserLocation && (
                    <div className="text-xs text-yellow-400 mt-1">
                      Using default location (Ranchi, Jharkhand)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (status) {
      case Status.LOADING:
        return (
          <div className="w-full h-64 bg-dark-700 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
              <p className="text-dark-300">Loading map...</p>
            </div>
          </div>
        );
      case Status.FAILURE:
        return (
          <div className="w-full h-64 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500">Failed to load map</p>
              <p className="text-sm text-red-400 mt-1">Please check your internet connection</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            {showSearch && <LocationSearch onLocationSelect={handleLocationSelect} />}
            
            <div className="flex space-x-2 mb-4">
              <button
                type="button"
                onClick={getCurrentLocation}
                className="btn-outline flex items-center space-x-1"
              >
                <MapPin className="w-4 h-4" />
                <span>Use Current Location</span>
              </button>
            </div>

            <MapComponent
              onLocationSelect={handleLocationSelect}
              initialLocation={location}
              center={location}
            />

            {location && (
              <div className="bg-dark-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-white">Selected Location</span>
                </div>
                <div className="text-sm text-dark-300">
                  <div>Latitude: {location.lat.toFixed(6)}</div>
                  <div>Longitude: {location.lng.toFixed(6)}</div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Wrapper
      apiKey={MAPS_CONFIG.API_KEY}
      render={render}
      libraries={['places']}
    />
  );
};

export default GoogleMapPicker;
