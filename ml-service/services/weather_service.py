"""
Weather Service for Predictive Analytics
Integrates with weather APIs to provide weather data for predictions
"""

import requests
import logging
from typing import Dict, Optional, Any
import os
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)

class WeatherService:
    """Service for fetching and processing weather data"""
    
    def __init__(self):
        self.api_key = os.getenv('OPENWEATHER_API_KEY', 'demo_key')
        self.base_url = "http://api.openweathermap.org/data/2.5"
        
    async def get_weather_forecast(self, lat: float, lng: float, 
                                 timeframe: str = "7_days") -> Optional[Dict[str, Any]]:
        """
        Get weather forecast for a location and timeframe
        
        Args:
            lat: Latitude
            lng: Longitude
            timeframe: "1_day", "7_days", "30_days"
            
        Returns:
            Weather data dictionary
        """
        try:
            # For demo purposes, we'll generate synthetic weather data
            # In production, you'd use real weather APIs
            
            if self.api_key == 'demo_key':
                return self._generate_demo_weather_data(timeframe)
            
            # Real API implementation would go here
            current_weather = self._fetch_current_weather(lat, lng)
            forecast = self._fetch_forecast(lat, lng, timeframe)
            
            return {
                'current': current_weather,
                'forecast': forecast,
                'timeframe': timeframe,
                'location': {'lat': lat, 'lng': lng},
                'fetched_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching weather data: {e}")
            return self._generate_demo_weather_data(timeframe)
    
    def _fetch_current_weather(self, lat: float, lng: float) -> Dict[str, Any]:
        """Fetch current weather conditions"""
        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lng,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'precipitation': data.get('rain', {}).get('1h', 0),
                'wind_speed': data['wind']['speed'],
                'description': data['weather'][0]['description'],
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching current weather: {e}")
            return {}
    
    def _fetch_forecast(self, lat: float, lng: float, timeframe: str) -> Dict[str, Any]:
        """Fetch weather forecast"""
        try:
            if timeframe == "1_day":
                cnt = 8  # 3-hour intervals for 24 hours
            elif timeframe == "7_days":
                cnt = 56  # 3-hour intervals for 7 days
            else:  # 30_days
                cnt = 240  # 3-hour intervals for 30 days
            
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lng,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': min(cnt, 40)  # API limit
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Process forecast data
            forecast_data = []
            for item in data['list']:
                forecast_data.append({
                    'timestamp': item['dt_txt'],
                    'temperature': item['main']['temp'],
                    'humidity': item['main']['humidity'],
                    'precipitation': item.get('rain', {}).get('3h', 0),
                    'wind_speed': item['wind']['speed'],
                    'description': item['weather'][0]['description']
                })
            
            # Calculate aggregated metrics
            temperatures = [item['temperature'] for item in forecast_data]
            precipitations = [item['precipitation'] for item in forecast_data]
            
            return {
                'forecast_periods': forecast_data,
                'avg_temperature': np.mean(temperatures),
                'max_temperature': max(temperatures),
                'min_temperature': min(temperatures),
                'total_precipitation': sum(precipitations),
                'max_precipitation': max(precipitations),
                'precipitation_risk': self._assess_precipitation_risk(precipitations),
                'temperature_risk': self._assess_temperature_risk(temperatures)
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching forecast: {e}")
            return {}
    
    def _generate_demo_weather_data(self, timeframe: str) -> Dict[str, Any]:
        """Generate demo weather data for testing"""
        logger.info("🌤️ Generating demo weather data...")
        
        # Generate realistic weather patterns
        base_temp = np.random.normal(25, 5)  # Base temperature around 25°C
        
        if timeframe == "1_day":
            periods = 8
        elif timeframe == "7_days":
            periods = 56
        else:  # 30_days
            periods = 240
        
        forecast_periods = []
        temperatures = []
        precipitations = []
        
        for i in range(min(periods, 40)):  # Limit to 40 for demo
            # Generate temperature with daily variation
            hour = (i * 3) % 24
            daily_variation = 5 * np.sin(2 * np.pi * (hour - 6) / 24)
            temp = base_temp + daily_variation + np.random.normal(0, 2)
            
            # Generate precipitation (higher chance during certain hours)
            precip_prob = 0.1
            if 14 <= hour <= 18:  # Afternoon showers
                precip_prob = 0.3
            elif 2 <= hour <= 6:  # Early morning
                precip_prob = 0.2
            
            precipitation = np.random.exponential(2) if np.random.random() < precip_prob else 0
            
            forecast_periods.append({
                'timestamp': (datetime.now() + timedelta(hours=i*3)).isoformat(),
                'temperature': round(temp, 1),
                'humidity': np.random.uniform(40, 90),
                'precipitation': round(precipitation, 1),
                'wind_speed': np.random.exponential(3),
                'description': self._get_weather_description(temp, precipitation)
            })
            
            temperatures.append(temp)
            precipitations.append(precipitation)
        
        return {
            'current': {
                'temperature': round(temperatures[0], 1),
                'humidity': np.random.uniform(40, 90),
                'pressure': np.random.uniform(1010, 1020),
                'precipitation': round(precipitations[0], 1),
                'wind_speed': np.random.exponential(3),
                'description': self._get_weather_description(temperatures[0], precipitations[0]),
                'timestamp': datetime.now().isoformat()
            },
            'forecast': {
                'forecast_periods': forecast_periods,
                'avg_temperature': round(np.mean(temperatures), 1),
                'max_temperature': round(max(temperatures), 1),
                'min_temperature': round(min(temperatures), 1),
                'total_precipitation': round(sum(precipitations), 1),
                'max_precipitation': round(max(precipitations), 1),
                'precipitation_risk': self._assess_precipitation_risk(precipitations),
                'temperature_risk': self._assess_temperature_risk(temperatures)
            },
            'timeframe': timeframe,
            'location': {'lat': 23.3441, 'lng': 85.3096},
            'fetched_at': datetime.now().isoformat(),
            'source': 'demo_data'
        }
    
    def _get_weather_description(self, temperature: float, precipitation: float) -> str:
        """Get weather description based on temperature and precipitation"""
        if precipitation > 10:
            return 'Heavy rain'
        elif precipitation > 2:
            return 'Light rain'
        elif temperature > 35:
            return 'Hot and sunny'
        elif temperature < 10:
            return 'Cold'
        else:
            return 'Partly cloudy'
    
    def _assess_precipitation_risk(self, precipitations: list) -> Dict[str, Any]:
        """Assess precipitation-related risks"""
        total_precip = sum(precipitations)
        max_precip = max(precipitations) if precipitations else 0
        avg_precip = np.mean(precipitations) if precipitations else 0
        
        # Risk assessment
        flood_risk = 'low'
        if total_precip > 50:
            flood_risk = 'high'
        elif total_precip > 25:
            flood_risk = 'medium'
        
        waterlogging_risk = 'low'
        if max_precip > 20:
            waterlogging_risk = 'high'
        elif max_precip > 10:
            waterlogging_risk = 'medium'
        
        return {
            'flood_risk': flood_risk,
            'waterlogging_risk': waterlogging_risk,
            'total_precipitation': total_precip,
            'max_hourly_precipitation': max_precip,
            'avg_precipitation': avg_precip,
            'risk_score': min(1.0, (total_precip / 100) + (max_precip / 50))
        }
    
    def _assess_temperature_risk(self, temperatures: list) -> Dict[str, Any]:
        """Assess temperature-related risks"""
        avg_temp = np.mean(temperatures) if temperatures else 25
        max_temp = max(temperatures) if temperatures else 25
        min_temp = min(temperatures) if temperatures else 25
        
        # Risk assessment
        heat_risk = 'low'
        if max_temp > 40:
            heat_risk = 'high'
        elif max_temp > 35:
            heat_risk = 'medium'
        
        cold_risk = 'low'
        if min_temp < 5:
            cold_risk = 'high'
        elif min_temp < 10:
            cold_risk = 'medium'
        
        return {
            'heat_risk': heat_risk,
            'cold_risk': cold_risk,
            'avg_temperature': avg_temp,
            'max_temperature': max_temp,
            'min_temperature': min_temp,
            'risk_score': min(1.0, abs(avg_temp - 25) / 20)  # Risk based on deviation from optimal
        }
    
    def get_historical_weather(self, lat: float, lng: float, 
                             start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Get historical weather data for a date range
        
        Args:
            lat: Latitude
            lng: Longitude
            start_date: Start date
            end_date: End date
            
        Returns:
            Historical weather data
        """
        try:
            # In a real implementation, you'd use a historical weather API
            # For demo, we'll generate synthetic historical data
            
            days = (end_date - start_date).days
            historical_data = []
            
            for i in range(days):
                date = start_date + timedelta(days=i)
                
                # Generate seasonal patterns
                month = date.month
                seasonal_temp = 25 + 10 * np.sin(2 * np.pi * (month - 3) / 12)
                
                historical_data.append({
                    'date': date.isoformat(),
                    'temperature': round(seasonal_temp + np.random.normal(0, 5), 1),
                    'precipitation': round(np.random.exponential(3), 1),
                    'humidity': np.random.uniform(40, 90),
                    'wind_speed': np.random.exponential(3)
                })
            
            return {
                'historical_data': historical_data,
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                },
                'location': {'lat': lat, 'lng': lng}
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching historical weather: {e}")
            return {}
