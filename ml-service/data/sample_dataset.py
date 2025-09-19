"""
Sample Dataset Generator for Civic Issue Predictive Analytics
Generates realistic sample data for training and testing ML models
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Any

class SampleDatasetGenerator:
    """Generates sample datasets for civic issue prediction"""
    
    def __init__(self):
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
        
        self.priorities = ['low', 'medium', 'high', 'urgent']
        
        # Location boundaries for Ranchi, Jharkhand
        self.location_bounds = {
            'lat_min': 23.2,
            'lat_max': 23.5,
            'lng_min': 85.2,
            'lng_max': 85.4
        }
        
        # High-risk areas (simulated)
        self.high_risk_areas = [
            {'lat': 23.3441, 'lng': 85.3096, 'name': 'City Center', 'risk_factor': 1.5},
            {'lat': 23.35, 'lng': 85.32, 'name': 'Industrial Area', 'risk_factor': 1.3},
            {'lat': 23.33, 'lng': 85.30, 'name': 'Old Market', 'risk_factor': 1.4},
            {'lat': 23.36, 'lng': 85.31, 'name': 'Suburb Area', 'risk_factor': 0.8}
        ]
    
    def generate_issues_dataset(self, num_records: int = 5000) -> pd.DataFrame:
        """
        Generate sample issues dataset
        
        Args:
            num_records: Number of records to generate
            
        Returns:
            DataFrame with sample issues data
        """
        print(f"📊 Generating {num_records} sample issue records...")
        
        np.random.seed(42)
        
        # Generate base data
        data = {
            'issue_id': [f'ISS_{i:06d}' for i in range(num_records)],
            'created_at': self._generate_dates(num_records),
            'latitude': np.random.uniform(self.location_bounds['lat_min'], 
                                        self.location_bounds['lat_max'], num_records),
            'longitude': np.random.uniform(self.location_bounds['lng_min'], 
                                         self.location_bounds['lng_max'], num_records),
            'category': np.random.choice(self.categories, num_records, 
                                       p=self._get_category_probabilities()),
            'priority': np.random.choice(self.priorities, num_records, 
                                       p=self._get_priority_probabilities()),
            'status': np.random.choice(['new', 'in_progress', 'resolved', 'closed'], 
                                     num_records, p=[0.1, 0.2, 0.6, 0.1]),
            'resolution_time': np.random.exponential(3, num_records),
            'upvotes': np.random.poisson(2, num_records),
            'confirmation_count': np.random.poisson(1, num_records)
        }
        
        # Add location-based features
        df = pd.DataFrame(data)
        df['location_key'] = df.apply(
            lambda x: f"{round(x['latitude'], 3)}_{round(x['longitude'], 3)}", 
            axis=1
        )
        
        # Add risk factors based on location
        df['location_risk'] = df.apply(self._calculate_location_risk, axis=1)
        
        # Add seasonal patterns
        df['season'] = df['created_at'].dt.month.apply(self._get_season)
        df['is_weekend'] = df['created_at'].dt.dayofweek.isin([5, 6]).astype(int)
        df['hour'] = df['created_at'].dt.hour
        
        # Add weather-related features
        df = self._add_weather_features(df)
        
        # Add demographic features
        df = self._add_demographic_features(df)
        
        # Calculate derived features
        df['risk_score'] = self._calculate_risk_score(df)
        
        print(f"✅ Generated {len(df)} issue records")
        return df
    
    def generate_weather_dataset(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """
        Generate sample weather dataset
        
        Args:
            start_date: Start date for weather data
            end_date: End date for weather data
            
        Returns:
            DataFrame with weather data
        """
        print(f"🌤️ Generating weather data from {start_date.date()} to {end_date.date()}")
        
        # Generate date range
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        
        # Generate seasonal weather patterns
        weather_data = []
        
        for date in date_range:
            day_of_year = date.timetuple().tm_yday
            month = date.month
            
            # Seasonal temperature patterns
            base_temp = 25 + 10 * np.sin(2 * np.pi * (month - 3) / 12)
            temperature = base_temp + np.random.normal(0, 5)
            
            # Seasonal precipitation patterns (higher in monsoon)
            precip_base = 5 if 6 <= month <= 9 else 2  # Higher in monsoon months
            precipitation = np.random.exponential(precip_base)
            
            # Humidity (higher in monsoon)
            humidity_base = 80 if 6 <= month <= 9 else 60
            humidity = humidity_base + np.random.normal(0, 10)
            humidity = max(20, min(100, humidity))
            
            weather_data.append({
                'date': date,
                'temperature': round(temperature, 1),
                'precipitation': round(precipitation, 1),
                'humidity': round(humidity, 1),
                'wind_speed': round(np.random.exponential(3), 1),
                'pressure': round(np.random.normal(1013, 10), 1),
                'visibility': round(np.random.uniform(5, 15), 1),
                'uv_index': round(np.random.uniform(0, 10), 1),
                'season': self._get_season(month)
            })
        
        df = pd.DataFrame(weather_data)
        print(f"✅ Generated {len(df)} weather records")
        return df
    
    def generate_demographic_dataset(self) -> pd.DataFrame:
        """
        Generate sample demographic dataset
        
        Returns:
            DataFrame with demographic data
        """
        print("👥 Generating demographic data...")
        
        # Generate grid of locations
        lats = np.linspace(self.location_bounds['lat_min'], 
                          self.location_bounds['lat_max'], 20)
        lngs = np.linspace(self.location_bounds['lng_min'], 
                          self.location_bounds['lng_max'], 20)
        
        demographic_data = []
        
        for lat in lats:
            for lng in lngs:
                # Calculate distance from city center
                distance = np.sqrt((lat - 23.3441)**2 + (lng - 85.3096)**2)
                
                # Population density decreases with distance from center
                pop_density = max(100, 5000 * np.exp(-distance * 10))
                
                # Infrastructure age increases with distance from center
                infra_age = min(50, 5 + distance * 20)
                
                demographic_data.append({
                    'location_key': f"{round(lat, 3)}_{round(lng, 3)}",
                    'latitude': lat,
                    'longitude': lng,
                    'population_density': round(pop_density),
                    'infrastructure_age': round(infra_age, 1),
                    'income_level': self._get_income_level(distance),
                    'urban_area': 1 if distance < 0.05 else 0,
                    'distance_from_center': round(distance, 3),
                    'schools_count': int(np.random.poisson(2)),
                    'hospitals_count': int(np.random.poisson(0.5)),
                    'public_transport_score': round(np.random.uniform(0, 1), 2)
                })
        
        df = pd.DataFrame(demographic_data)
        print(f"✅ Generated {len(df)} demographic records")
        return df
    
    def save_datasets(self, output_dir: str = "data"):
        """Save all generated datasets to files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate and save issues dataset
        issues_df = self.generate_issues_dataset(5000)
        issues_df.to_csv(f"{output_dir}/issues_dataset.csv", index=False)
        
        # Generate and save weather dataset
        weather_df = self.generate_weather_dataset(
            datetime(2023, 1, 1), 
            datetime(2024, 1, 1)
        )
        weather_df.to_csv(f"{output_dir}/weather_dataset.csv", index=False)
        
        # Generate and save demographic dataset
        demographic_df = self.generate_demographic_dataset()
        demographic_df.to_csv(f"{output_dir}/demographic_dataset.csv", index=False)
        
        # Save dataset info
        dataset_info = {
            'generated_at': datetime.now().isoformat(),
            'issues_count': len(issues_df),
            'weather_records': len(weather_df),
            'demographic_records': len(demographic_df),
            'categories': self.categories,
            'location_bounds': self.location_bounds,
            'high_risk_areas': self.high_risk_areas
        }
        
        with open(f"{output_dir}/dataset_info.json", 'w') as f:
            json.dump(dataset_info, f, indent=2)
        
        print(f"💾 All datasets saved to {output_dir}/")
        return dataset_info
    
    def _generate_dates(self, num_records: int) -> List[datetime]:
        """Generate realistic date distribution"""
        # More recent dates should be more common
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        # Generate dates with more weight on recent dates
        days_range = (end_date - start_date).days
        
        # Use exponential distribution to favor recent dates
        random_days = np.random.exponential(days_range / 3, num_records)
        random_days = np.clip(random_days, 0, days_range)
        
        dates = [start_date + timedelta(days=int(day)) for day in random_days]
        return sorted(dates)
    
    def _get_category_probabilities(self) -> List[float]:
        """Get probability distribution for categories"""
        # Realistic distribution based on common civic issues
        return [0.25, 0.15, 0.20, 0.15, 0.08, 0.05, 0.04, 0.05, 0.03]
    
    def _get_priority_probabilities(self) -> List[float]:
        """Get probability distribution for priorities"""
        # Most issues are medium priority
        return [0.40, 0.35, 0.20, 0.05]
    
    def _calculate_location_risk(self, row) -> float:
        """Calculate location-based risk factor"""
        lat, lng = row['latitude'], row['longitude']
        
        # Check if location is in high-risk area
        for area in self.high_risk_areas:
            distance = np.sqrt((lat - area['lat'])**2 + (lng - area['lng'])**2)
            if distance < 0.01:  # Within high-risk area
                return area['risk_factor']
        
        # Default risk based on distance from center
        distance = np.sqrt((lat - 23.3441)**2 + (lng - 85.3096)**2)
        return 0.8 + 0.4 * (1 - min(1, distance * 20))
    
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
    
    def _add_weather_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add weather-related features to the dataset"""
        # Simulate weather impact on issues
        
        # Road issues increase with heavy rain
        road_mask = df['category'] == 'Road & Pothole Issues'
        df.loc[road_mask, 'weather_impact'] = np.random.uniform(0.3, 0.8, road_mask.sum())
        
        # Water issues increase with precipitation
        water_mask = df['category'].isin(['Water Supply', 'Sewage & Drainage'])
        df.loc[water_mask, 'weather_impact'] = np.random.uniform(0.2, 0.9, water_mask.sum())
        
        # Other categories have lower weather impact
        other_mask = ~(road_mask | water_mask)
        df.loc[other_mask, 'weather_impact'] = np.random.uniform(0.1, 0.4, other_mask.sum())
        
        # Add simulated precipitation and temperature
        df['precipitation'] = np.random.exponential(3, len(df))
        df['temperature'] = 25 + 10 * np.sin(2 * np.pi * df['created_at'].dt.month / 12) + np.random.normal(0, 5, len(df))
        
        return df
    
    def _add_demographic_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add demographic features to the dataset"""
        # Simulate population density impact
        df['population_density'] = np.random.uniform(100, 5000, len(df))
        
        # Infrastructure age (older infrastructure = more issues)
        df['infrastructure_age'] = np.random.uniform(5, 50, len(df))
        
        # Income level impact
        df['income_level'] = np.random.choice(['low', 'medium', 'high'], len(df), p=[0.4, 0.4, 0.2])
        
        # Urban vs rural
        df['urban_area'] = np.random.choice([0, 1], len(df), p=[0.3, 0.7])
        
        return df
    
    def _calculate_risk_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate overall risk score for each record"""
        risk_score = np.zeros(len(df))
        
        # Base risk from location
        risk_score += df['location_risk'] * 0.3
        
        # Priority impact
        priority_weights = {'low': 0.2, 'medium': 0.4, 'high': 0.7, 'urgent': 1.0}
        priority_risk = df['priority'].map(priority_weights)
        risk_score += priority_risk * 0.3
        
        # Weather impact
        risk_score += df['weather_impact'] * 0.2
        
        # Infrastructure age impact
        infra_risk = df['infrastructure_age'] / 50  # Normalize to 0-1
        risk_score += infra_risk * 0.1
        
        # Population density impact (higher density = higher risk)
        pop_risk = np.clip(df['population_density'] / 5000, 0, 1)
        risk_score += pop_risk * 0.1
        
        # Normalize to 0-1
        return np.clip(risk_score, 0, 1)
    
    def _get_income_level(self, distance: float) -> str:
        """Get income level based on distance from center"""
        if distance < 0.02:
            return 'high'
        elif distance < 0.05:
            return 'medium'
        else:
            return 'low'

if __name__ == "__main__":
    # Generate and save sample datasets
    generator = SampleDatasetGenerator()
    info = generator.save_datasets()
    
    print("\n📋 Dataset Summary:")
    print(f"  Issues: {info['issues_count']:,} records")
    print(f"  Weather: {info['weather_records']:,} records") 
    print(f"  Demographics: {info['demographic_records']:,} records")
    print(f"  Categories: {len(info['categories'])} types")
    print(f"  Generated: {info['generated_at']}")
