# Geolocation Setup Guide

This guide explains how to set up optional geolocation with fallback behavior in your React application.

## Overview

The improved geolocation system provides:
- **Optional location access** - Users can deny location without breaking the app
- **Automatic fallback** - Uses default location (Ranchi, Jharkhand) when geolocation fails
- **No error blocking** - App continues to work even without location access
- **Better UX** - Clear status indicators and retry options

## Files Modified

### 1. `src/hooks/useGeolocation.js`
Enhanced geolocation hook with optional location support:
- `requireLocation: false` - Makes location optional
- `fallbackLocation` - Default location when geolocation fails
- `showToast: false` - Manual toast control for better UX
- `hasUserLocation` - Indicates if real user location was obtained

### 2. `src/config/maps.js`
Centralized configuration for maps and geolocation:
- Google Maps API key configuration
- Default fallback location
- Map styling options
- Geolocation settings

### 3. `src/components/GoogleMapPicker.js`
Updated to use improved geolocation:
- Graceful handling of location denial
- Better user feedback
- Fallback location support

### 4. `src/pages/IssuesMap.js`
Updated to use optional geolocation:
- Map always loads with fallback location
- No blocking on location errors

### 5. `src/pages/Register.js`
Updated registration form:
- Optional location detection
- Clear status indicators
- Retry functionality

## Google Maps API Key Setup

### Step 1: Create Environment File
Create a `.env` file in the `client` directory:

```bash
# client/.env
REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### Step 2: Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

### Step 3: Restrict API Key (Important!)
For security, restrict your API key:

1. Go to APIs & Services > Credentials
2. Click on your API key
3. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domains:
     - `http://localhost:3000/*`
     - `https://yourdomain.com/*`
4. Under "API restrictions":
   - Select "Restrict key"
   - Choose: Maps JavaScript API, Places API, Geocoding API

### Step 4: Restart Development Server
```bash
cd client
npm start
```

## Usage Examples

### Basic Usage
```javascript
import useGeolocation from '../hooks/useGeolocation';
import { MAPS_CONFIG } from '../config/maps';

const MyComponent = () => {
  const {
    location,
    isLoading,
    error,
    hasUserLocation,
    retryLocation
  } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    showToast: false,
    requireLocation: false
  });

  // location will always be available (either user's or fallback)
  return <div>Map center: {location.lat}, {location.lng}</div>;
};
```

### With Google Maps
```javascript
import { Wrapper } from '@googlemaps/react-wrapper';
import { MAPS_CONFIG } from '../config/maps';

const MapComponent = ({ center }) => {
  return (
    <div ref={mapRef} style={{ height: '400px' }} />
  );
};

const MyMap = () => {
  const { location } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    requireLocation: false
  });

  return (
    <Wrapper apiKey={MAPS_CONFIG.API_KEY}>
      <MapComponent center={location} />
    </Wrapper>
  );
};
```

### With Leaflet Maps
```javascript
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const MyLeafletMap = () => {
  const { location } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    requireLocation: false
  });

  const mapCenter = [location.lat, location.lng];

  return (
    <MapContainer center={mapCenter} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={mapCenter} />
    </MapContainer>
  );
};
```

## Configuration Options

### useGeolocation Hook Options
```javascript
const options = {
  enableHighAccuracy: true,        // Use GPS if available
  timeout: 10000,                  // 10 second timeout
  maximumAge: 300000,              // 5 minutes cache
  fallbackLocation: {              // Default location
    lat: 23.3441,
    lng: 85.3096
  },
  showToast: false,                // Disable automatic toasts
  requireLocation: false           // Make location optional
};
```

### MAPS_CONFIG Options
```javascript
export const MAPS_CONFIG = {
  API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  DEFAULT_LOCATION: { lat: 23.3441, lng: 85.3096 },
  DEFAULT_ZOOM: 13,
  MAP_STYLES: [...],               // Custom map styles
  GEOLOCATION_OPTIONS: {...}       // Default geolocation options
};
```

## Testing the Implementation

### Test Location Denial
1. Open browser developer tools
2. Go to Application > Permissions
3. Block location access
4. Refresh the page
5. App should load with default location (no errors)

### Test Location Access
1. Allow location access when prompted
2. App should use your actual location
3. Map should center on your position

### Test API Key Issues
1. Remove or invalidate API key in `.env`
2. App should show fallback UI
3. Location detection should still work

## Troubleshooting

### Common Issues

1. **"Google Maps API key not configured"**
   - Check `.env` file exists in `client` directory
   - Verify `REACT_APP_GOOGLE_MAPS_API_KEY` is set
   - Restart development server

2. **Location not detected**
   - Check browser permissions
   - Ensure HTTPS in production
   - Check console for errors

3. **Map not loading**
   - Verify API key is correct
   - Check API restrictions in Google Cloud Console
   - Ensure required APIs are enabled

### Debug Mode
Enable debug logging by adding to your component:
```javascript
const { location, hasUserLocation } = useGeolocation({
  showToast: true,  // Enable toasts for debugging
  requireLocation: false
});

console.log('Location:', location);
console.log('Has user location:', hasUserLocation);
```

## Security Notes

1. **Never commit API keys** to version control
2. **Always restrict API keys** in Google Cloud Console
3. **Use environment variables** for sensitive data
4. **Monitor API usage** to prevent abuse

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (requires HTTPS in production)
- **Mobile browsers**: Full support with user permission

## Performance Tips

1. **Cache location** using `maximumAge` option
2. **Use fallback location** to avoid repeated requests
3. **Disable toasts** in production for better UX
4. **Lazy load** map components when needed

