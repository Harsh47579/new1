// Google Maps Configuration
export const MAPS_CONFIG = {
  // API key from environment variable
  API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  
  // Default fallback location (Ranchi, Jharkhand)
  DEFAULT_LOCATION: {
    lat: 23.3441,
    lng: 85.3096
  },
  
  // Map options
  DEFAULT_ZOOM: 13,
  MAP_STYLES: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ],
  
  // Geolocation options
  GEOLOCATION_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000 // 5 minutes
  }
};

// Instructions for setting up Google Maps API key:
// 1. Create a .env file in the client directory
// 2. Add: REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key
// 3. Restart the development server
// 4. In Google Cloud Console, restrict the API key to your domains
