"""
Visualization Service for Predictive Analytics
Generates data for frontend visualizations including heatmaps and charts
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class VisualizationService:
    """Service for generating visualization data"""
    
    def __init__(self):
        self.colors = {
            'low': '#4CAF50',      # Green
            'medium': '#FF9800',   # Orange
            'high': '#F44336',     # Red
            'critical': '#9C27B0'  # Purple
        }
    
    def generate_risk_heatmap(self, center_lat: float, center_lng: float, 
                            radius_km: float = 10, resolution: int = 100) -> Dict[str, Any]:
        """
        Generate risk heatmap data for visualization
        
        Args:
            center_lat: Center latitude
            center_lng: Center longitude
            radius_km: Radius in kilometers
            resolution: Grid resolution (higher = more detailed)
            
        Returns:
            Heatmap data for frontend visualization
        """
        try:
            logger.info(f"🗺️ Generating risk heatmap for center: {center_lat}, {center_lng}")
            
            # Calculate grid bounds
            lat_offset = radius_km / 111.0  # Rough conversion: 1 degree ≈ 111 km
            lng_offset = radius_km / (111.0 * np.cos(np.radians(center_lat)))
            
            # Generate grid
            lat_points = np.linspace(center_lat - lat_offset, center_lat + lat_offset, resolution)
            lng_points = np.linspace(center_lng - lng_offset, center_lng + lng_offset, resolution)
            
            heatmap_data = []
            
            for i, lat in enumerate(lat_points):
                for j, lng in enumerate(lng_points):
                    # Calculate risk score for this grid point
                    risk_score = self._calculate_grid_risk(lat, lng, center_lat, center_lng)
                    
                    # Determine risk level and color
                    risk_level = self._get_risk_level(risk_score)
                    color = self.colors[risk_level]
                    
                    heatmap_data.append({
                        'lat': lat,
                        'lng': lng,
                        'risk_score': risk_score,
                        'risk_level': risk_level,
                        'color': color,
                        'intensity': min(1.0, risk_score)
                    })
            
            # Calculate bounds for the map
            bounds = {
                'north': center_lat + lat_offset,
                'south': center_lat - lat_offset,
                'east': center_lng + lng_offset,
                'west': center_lng - lng_offset
            }
            
            # Generate summary statistics
            risk_scores = [point['risk_score'] for point in heatmap_data]
            summary = {
                'total_points': len(heatmap_data),
                'avg_risk': np.mean(risk_scores),
                'max_risk': np.max(risk_scores),
                'min_risk': np.min(risk_scores),
                'high_risk_points': len([s for s in risk_scores if s > 0.6]),
                'critical_risk_points': len([s for s in risk_scores if s > 0.8])
            }
            
            return {
                'heatmap_data': heatmap_data,
                'bounds': bounds,
                'summary': summary,
                'center': {'lat': center_lat, 'lng': center_lng},
                'radius_km': radius_km,
                'resolution': resolution,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating heatmap: {e}")
            return {}
    
    def generate_trend_charts(self, location: Dict[str, float], 
                            timeframe: str = "30_days") -> Dict[str, Any]:
        """
        Generate trend chart data for a location
        
        Args:
            location: {"lat": float, "lng": float}
            timeframe: "7_days", "30_days", "90_days"
            
        Returns:
            Chart data for trends visualization
        """
        try:
            logger.info(f"📊 Generating trend charts for location: {location}")
            
            # Generate time series data
            days = 7 if timeframe == "7_days" else 30 if timeframe == "30_days" else 90
            dates = [datetime.now() - timedelta(days=i) for i in range(days, 0, -1)]
            
            # Generate trend data
            trend_data = self._generate_trend_data(dates, location)
            
            return {
                'timeframe': timeframe,
                'location': location,
                'trends': trend_data,
                'summary': self._calculate_trend_summary(trend_data),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating trend charts: {e}")
            return {}
    
    def generate_category_distribution(self, location: Dict[str, float]) -> Dict[str, Any]:
        """
        Generate category distribution data for a location
        
        Args:
            location: {"lat": float, "lng": float}
            
        Returns:
            Category distribution data
        """
        try:
            categories = [
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
            
            # Generate distribution data
            distribution = []
            total_issues = 0
            
            for category in categories:
                count = self._get_category_count(category, location)
                total_issues += count
                
                distribution.append({
                    'category': category,
                    'count': count,
                    'percentage': 0  # Will calculate after getting total
                })
            
            # Calculate percentages
            for item in distribution:
                item['percentage'] = (item['count'] / total_issues * 100) if total_issues > 0 else 0
            
            # Sort by count
            distribution.sort(key=lambda x: x['count'], reverse=True)
            
            return {
                'location': location,
                'distribution': distribution,
                'total_issues': total_issues,
                'top_category': distribution[0]['category'] if distribution else None,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating category distribution: {e}")
            return {}
    
    def generate_priority_analysis(self, location: Dict[str, float]) -> Dict[str, Any]:
        """
        Generate priority analysis data
        
        Args:
            location: {"lat": float, "lng": float}
            
        Returns:
            Priority analysis data
        """
        try:
            priorities = ['low', 'medium', 'high', 'urgent']
            
            priority_data = []
            total_issues = 0
            
            for priority in priorities:
                count = self._get_priority_count(priority, location)
                total_issues += count
                
                priority_data.append({
                    'priority': priority,
                    'count': count,
                    'percentage': 0,
                    'color': self._get_priority_color(priority)
                })
            
            # Calculate percentages
            for item in priority_data:
                item['percentage'] = (item['count'] / total_issues * 100) if total_issues > 0 else 0
            
            # Calculate urgency score
            urgency_score = (
                priority_data[0]['count'] * 0.1 +      # low
                priority_data[1]['count'] * 0.3 +      # medium
                priority_data[2]['count'] * 0.7 +      # high
                priority_data[3]['count'] * 1.0        # urgent
            ) / total_issues if total_issues > 0 else 0
            
            return {
                'location': location,
                'priority_breakdown': priority_data,
                'total_issues': total_issues,
                'urgency_score': urgency_score,
                'urgency_level': self._get_urgency_level(urgency_score),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating priority analysis: {e}")
            return {}
    
    def generate_resolution_timeline(self, location: Dict[str, float]) -> Dict[str, Any]:
        """
        Generate resolution timeline data
        
        Args:
            location: {"lat": float, "lng": float}
            
        Returns:
            Resolution timeline data
        """
        try:
            # Generate timeline data for the last 30 days
            dates = [datetime.now() - timedelta(days=i) for i in range(30, 0, -1)]
            
            timeline_data = []
            for date in dates:
                # Generate sample resolution data
                resolved_today = np.random.poisson(3)  # Average 3 issues resolved per day
                avg_resolution_time = np.random.uniform(1, 7)  # 1-7 days average
                
                timeline_data.append({
                    'date': date.isoformat(),
                    'issues_resolved': resolved_today,
                    'avg_resolution_time': round(avg_resolution_time, 1),
                    'backlog': np.random.randint(10, 50)  # Current backlog
                })
            
            # Calculate trends
            resolution_times = [item['avg_resolution_time'] for item in timeline_data]
            resolution_trend = self._calculate_trend(resolution_times)
            
            return {
                'location': location,
                'timeline': timeline_data,
                'trends': {
                    'resolution_time_trend': resolution_trend,
                    'avg_resolution_time': np.mean(resolution_times),
                    'improvement_rate': max(0, -resolution_trend)  # Negative trend = improvement
                },
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating resolution timeline: {e}")
            return {}
    
    def _calculate_grid_risk(self, lat: float, lng: float, 
                           center_lat: float, center_lng: float) -> float:
        """Calculate risk score for a grid point"""
        # Distance-based risk (closer to center = higher risk)
        distance = np.sqrt((lat - center_lat)**2 + (lng - center_lng)**2)
        distance_factor = max(0, 1 - distance * 10)  # Decrease with distance
        
        # Random factors for demonstration
        random_factor = np.random.uniform(0.2, 0.8)
        
        # Infrastructure factors (simulated)
        infrastructure_risk = self._get_infrastructure_risk(lat, lng)
        
        # Combine factors
        risk_score = (distance_factor * 0.3 + random_factor * 0.4 + infrastructure_risk * 0.3)
        
        return min(1.0, risk_score)
    
    def _get_infrastructure_risk(self, lat: float, lng: float) -> float:
        """Get infrastructure risk for a location"""
        # Simulate infrastructure age and condition
        # In a real implementation, this would use actual infrastructure data
        
        # Simulate urban vs rural areas
        urban_factor = 1.0 if abs(lat - 23.3441) < 0.1 and abs(lng - 85.3096) < 0.1 else 0.6
        
        # Simulate infrastructure age (older = higher risk)
        age_factor = np.random.uniform(0.3, 0.9)
        
        return urban_factor * age_factor
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Convert risk score to risk level"""
        if risk_score >= 0.8:
            return 'critical'
        elif risk_score >= 0.6:
            return 'high'
        elif risk_score >= 0.4:
            return 'medium'
        else:
            return 'low'
    
    def _generate_trend_data(self, dates: List[datetime], 
                           location: Dict[str, float]) -> Dict[str, List]:
        """Generate trend data for charts"""
        trends = {
            'dates': [date.isoformat() for date in dates],
            'issue_counts': [],
            'risk_scores': [],
            'resolution_times': [],
            'weather_impact': []
        }
        
        for date in dates:
            # Generate trend data with some seasonality
            day_of_year = date.timetuple().tm_yday
            
            # Issue count trend (higher in certain seasons)
            seasonal_factor = 1 + 0.3 * np.sin(2 * np.pi * (day_of_year - 90) / 365)
            issue_count = max(0, int(np.random.poisson(5) * seasonal_factor))
            
            # Risk score trend
            risk_score = 0.3 + 0.2 * np.sin(2 * np.pi * day_of_year / 365) + np.random.normal(0, 0.1)
            risk_score = max(0, min(1, risk_score))
            
            # Resolution time trend (improving over time)
            base_time = 5 - (len(dates) - dates.index(date)) * 0.05  # Gradual improvement
            resolution_time = max(1, base_time + np.random.normal(0, 1))
            
            # Weather impact (higher in rainy season)
            weather_impact = 0.2 * np.sin(2 * np.pi * (day_of_year - 150) / 365) + np.random.normal(0, 0.1)
            weather_impact = max(0, min(1, weather_impact))
            
            trends['issue_counts'].append(issue_count)
            trends['risk_scores'].append(round(risk_score, 2))
            trends['resolution_times'].append(round(resolution_time, 1))
            trends['weather_impact'].append(round(weather_impact, 2))
        
        return trends
    
    def _calculate_trend_summary(self, trend_data: Dict[str, List]) -> Dict[str, Any]:
        """Calculate summary statistics for trends"""
        return {
            'avg_issues_per_day': np.mean(trend_data['issue_counts']),
            'avg_risk_score': np.mean(trend_data['risk_scores']),
            'avg_resolution_time': np.mean(trend_data['resolution_times']),
            'trend_direction': {
                'issues': 'increasing' if self._calculate_trend(trend_data['issue_counts']) > 0 else 'decreasing',
                'risk': 'increasing' if self._calculate_trend(trend_data['risk_scores']) > 0 else 'decreasing',
                'resolution_time': 'improving' if self._calculate_trend(trend_data['resolution_times']) < 0 else 'worsening'
            }
        }
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend direction (positive = increasing, negative = decreasing)"""
        if len(values) < 2:
            return 0
        
        # Simple linear trend calculation
        x = np.arange(len(values))
        y = np.array(values)
        
        # Calculate slope
        n = len(x)
        slope = (n * np.sum(x * y) - np.sum(x) * np.sum(y)) / (n * np.sum(x**2) - np.sum(x)**2)
        
        return slope
    
    def _get_category_count(self, category: str, location: Dict[str, float]) -> int:
        """Get issue count for a category at a location"""
        # Simulate category-specific counts
        base_counts = {
            "Road & Pothole Issues": 15,
            "Streetlight Problems": 8,
            "Waste Management": 12,
            "Water Supply": 10,
            "Sewage & Drainage": 6,
            "Public Safety": 4,
            "Parks & Recreation": 3,
            "Traffic Management": 7,
            "Other": 5
        }
        
        base_count = base_counts.get(category, 5)
        
        # Add some location-based variation
        location_factor = 0.8 + 0.4 * np.random.random()
        
        return int(base_count * location_factor)
    
    def _get_priority_count(self, priority: str, location: Dict[str, float]) -> int:
        """Get issue count for a priority level at a location"""
        # Simulate priority distribution
        base_counts = {
            'low': 20,
            'medium': 15,
            'high': 8,
            'urgent': 3
        }
        
        base_count = base_counts.get(priority, 5)
        
        # Add some location-based variation
        location_factor = 0.8 + 0.4 * np.random.random()
        
        return int(base_count * location_factor)
    
    def _get_priority_color(self, priority: str) -> str:
        """Get color for priority level"""
        colors = {
            'low': '#4CAF50',      # Green
            'medium': '#FF9800',   # Orange
            'high': '#F44336',     # Red
            'urgent': '#9C27B0'    # Purple
        }
        return colors.get(priority, '#757575')
    
    def _get_urgency_level(self, urgency_score: float) -> str:
        """Get urgency level from score"""
        if urgency_score >= 0.7:
            return 'critical'
        elif urgency_score >= 0.5:
            return 'high'
        elif urgency_score >= 0.3:
            return 'medium'
        else:
            return 'low'
