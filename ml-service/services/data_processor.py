"""
Data processing service for civic issue predictive analytics
Handles data loading, cleaning, feature engineering, and preparation
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
import logging
from typing import Dict, List, Any, Optional
import json

logger = logging.getLogger(__name__)

class DataProcessor:
    """Handles data processing and feature engineering for ML models"""
    
    def __init__(self):
        self.base_url = "http://localhost:5000/api"  # Your Node.js backend
        self.categories = [
            "Road & Pothole Issues",
            "Streetlight Problems", 
            "Waste Management",
            "Water Supply",
            "Sewage & Drainage",
            "Public Safety",
            "Parks & Recreation",
            "Traffic Management",
            "Other"
        ]
        
    def load_training_data(self) -> pd.DataFrame:
        """
        Load and combine training data from multiple sources
        
        Returns:
            pd.DataFrame: Combined dataset with features for ML models
        """
        try:
            logger.info("📊 Loading training data...")
            
            # Load issues data from your existing backend
            issues_data = self._load_issues_data()
            
            # Load weather data
            weather_data = self._load_weather_data()
            
            # Load demographic data (if available)
            demographic_data = self._load_demographic_data()
            
            # Combine all datasets
            combined_data = self._combine_datasets(issues_data, weather_data, demographic_data)
            
            # Feature engineering
            processed_data = self._engineer_features(combined_data)
            
            logger.info(f"✅ Loaded {len(processed_data)} training samples")
            return processed_data
            
        except Exception as e:
            logger.error(f"❌ Error loading training data: {e}")
            # Return sample data if real data is not available
            return self._generate_sample_data()
    
    def _load_issues_data(self) -> pd.DataFrame:
        """Load issues data from the Node.js backend"""
        try:
            # This would normally fetch from your database
            # For now, we'll use the sample data structure
            return self._generate_sample_issues_data()
            
        except Exception as e:
            logger.error(f"❌ Error loading issues data: {e}")
            return pd.DataFrame()
    
    def _load_weather_data(self) -> pd.DataFrame:
        """Load historical weather data"""
        try:
            # In a real implementation, this would fetch from a weather API
            # For now, we'll generate synthetic weather data
            return self._generate_weather_data()
            
        except Exception as e:
            logger.error(f"❌ Error loading weather data: {e}")
            return pd.DataFrame()
    
    def _load_demographic_data(self) -> pd.DataFrame:
        """Load demographic and infrastructure data"""
        try:
            # This would load population density, infrastructure data, etc.
            return self._generate_demographic_data()
            
        except Exception as e:
            logger.error(f"❌ Error loading demographic data: {e}")
            return pd.DataFrame()
    
    def _combine_datasets(self, issues: pd.DataFrame, weather: pd.DataFrame, 
                         demographic: pd.DataFrame) -> pd.DataFrame:
        """Combine multiple datasets into a single DataFrame"""
        try:
            if issues.empty:
                return self._generate_sample_data()
            
            # Merge datasets based on date and location
            combined = issues.copy()
            
            if not weather.empty:
                combined = combined.merge(weather, on='date', how='left')
            
            if not demographic.empty:
                combined = combined.merge(demographic, on='location_key', how='left')
            
            return combined.fillna(0)  # Fill missing values with 0
            
        except Exception as e:
            logger.error(f"❌ Error combining datasets: {e}")
            return self._generate_sample_data()
    
    def _engineer_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Engineer features for ML models
        
        Args:
            data: Raw combined dataset
            
        Returns:
            pd.DataFrame: Dataset with engineered features
        """
        try:
            df = data.copy()
            
            # Date features
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df['year'] = df['date'].dt.year
                df['month'] = df['date'].dt.month
                df['day_of_year'] = df['date'].dt.dayofyear
                df['day_of_week'] = df['date'].dt.dayofweek
                df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
                df['season'] = df['month'].apply(self._get_season)
            
            # Location features
            if 'latitude' in df.columns and 'longitude' in df.columns:
                df['location_key'] = df.apply(
                    lambda x: f"{round(x['latitude'], 2)}_{round(x['longitude'], 2)}", 
                    axis=1
                )
                df['distance_from_center'] = np.sqrt(
                    (df['latitude'] - 23.3441)**2 + (df['longitude'] - 85.3096)**2
                )
            
            # Weather features
            if 'precipitation' in df.columns:
                df['heavy_rain'] = (df['precipitation'] > 20).astype(int)
                df['rain_3day_avg'] = df['precipitation'].rolling(window=3, min_periods=1).mean()
            
            if 'temperature' in df.columns:
                df['extreme_temp'] = ((df['temperature'] > 35) | (df['temperature'] < 5)).astype(int)
            
            # Issue-specific features
            if 'category' in df.columns:
                df = pd.get_dummies(df, columns=['category'], prefix='cat')
            
            # Time-based features
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'])
                df['hour'] = df['created_at'].dt.hour
                df['time_of_day'] = df['hour'].apply(self._get_time_of_day)
            
            # Risk scoring
            df['risk_score'] = self._calculate_risk_score(df)
            
            return df
            
        except Exception as e:
            logger.error(f"❌ Error in feature engineering: {e}")
            return data
    
    def get_historical_context(self, location: Dict[str, float], timeframe: str) -> Dict[str, Any]:
        """
        Get historical context for a location and timeframe
        
        Args:
            location: {"lat": float, "lng": float}
            timeframe: "1_day", "7_days", "30_days"
            
        Returns:
            Dict containing historical context
        """
        try:
            # Calculate date range
            end_date = datetime.now()
            if timeframe == "1_day":
                start_date = end_date - timedelta(days=1)
            elif timeframe == "7_days":
                start_date = end_date - timedelta(days=7)
            else:  # 30_days
                start_date = end_date - timedelta(days=30)
            
            # In a real implementation, this would query your database
            # For now, return sample context
            return {
                "total_issues": np.random.randint(5, 50),
                "issue_categories": {
                    "Road & Pothole Issues": np.random.randint(1, 10),
                    "Water Supply": np.random.randint(1, 8),
                    "Waste Management": np.random.randint(1, 6)
                },
                "avg_resolution_time": np.random.uniform(2, 10),
                "recent_trend": "increasing" if np.random.random() > 0.5 else "decreasing",
                "peak_hours": [8, 9, 17, 18],
                "most_common_category": "Road & Pothole Issues"
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting historical context: {e}")
            return {}
    
    def _get_season(self, month: int) -> str:
        """Get season from month"""
        if month in [12, 1, 2]:
            return "Winter"
        elif month in [3, 4, 5]:
            return "Spring"
        elif month in [6, 7, 8]:
            return "Summer"
        else:
            return "Fall"
    
    def _get_time_of_day(self, hour: int) -> str:
        """Get time of day category"""
        if 5 <= hour < 12:
            return "Morning"
        elif 12 <= hour < 17:
            return "Afternoon"
        elif 17 <= hour < 21:
            return "Evening"
        else:
            return "Night"
    
    def _calculate_risk_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate base risk score"""
        risk_score = np.zeros(len(df))
        
        # Add risk based on category
        for col in df.columns:
            if col.startswith('cat_') and col in df.columns:
                risk_score += df[col] * np.random.uniform(0.1, 0.3)
        
        # Add weather risk
        if 'heavy_rain' in df.columns:
            risk_score += df['heavy_rain'] * 0.2
        
        if 'extreme_temp' in df.columns:
            risk_score += df['extreme_temp'] * 0.15
        
        # Normalize to 0-1
        return np.clip(risk_score, 0, 1)
    
    def _generate_sample_data(self) -> pd.DataFrame:
        """Generate sample data for testing"""
        logger.info("📝 Generating sample data...")
        
        np.random.seed(42)
        n_samples = 1000
        
        # Generate dates
        dates = pd.date_range(start='2023-01-01', end='2024-01-01', periods=n_samples)
        
        # Generate sample data
        data = {
            'date': dates,
            'created_at': dates,
            'latitude': np.random.uniform(23.2, 23.5, n_samples),
            'longitude': np.random.uniform(85.2, 85.4, n_samples),
            'category': np.random.choice(self.categories, n_samples),
            'priority': np.random.choice(['low', 'medium', 'high', 'urgent'], n_samples),
            'precipitation': np.random.exponential(5, n_samples),
            'temperature': np.random.normal(25, 8, n_samples),
            'humidity': np.random.uniform(40, 90, n_samples),
            'population_density': np.random.uniform(100, 5000, n_samples),
            'infrastructure_age': np.random.uniform(5, 50, n_samples),
            'resolution_time': np.random.exponential(3, n_samples)
        }
        
        df = pd.DataFrame(data)
        return self._engineer_features(df)
    
    def _generate_sample_issues_data(self) -> pd.DataFrame:
        """Generate sample issues data"""
        return self._generate_sample_data()
    
    def _generate_weather_data(self) -> pd.DataFrame:
        """Generate sample weather data"""
        dates = pd.date_range(start='2023-01-01', end='2024-01-01', freq='D')
        
        return pd.DataFrame({
            'date': dates,
            'precipitation': np.random.exponential(3, len(dates)),
            'temperature': np.random.normal(25, 8, len(dates)),
            'humidity': np.random.uniform(40, 90, len(dates)),
            'wind_speed': np.random.exponential(5, len(dates)),
            'pressure': np.random.normal(1013, 10, len(dates))
        })
    
    def _generate_demographic_data(self) -> pd.DataFrame:
        """Generate sample demographic data"""
        # Generate grid of locations
        lats = np.linspace(23.2, 23.5, 10)
        lngs = np.linspace(85.2, 85.4, 10)
        
        data = []
        for lat in lats:
            for lng in lngs:
                data.append({
                    'location_key': f"{round(lat, 2)}_{round(lng, 2)}",
                    'latitude': lat,
                    'longitude': lng,
                    'population_density': np.random.uniform(100, 5000),
                    'infrastructure_age': np.random.uniform(5, 50),
                    'income_level': np.random.choice(['low', 'medium', 'high']),
                    'urban_area': np.random.choice([0, 1])
                })
        
        return pd.DataFrame(data)
