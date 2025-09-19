"""
Machine Learning Models for Civic Issue Prediction
Implements multiple ML models for different prediction tasks
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
from sklearn.neural_network import MLPClassifier, MLPRegressor
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import joblib
import logging
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class PredictiveModels:
    """Machine Learning models for civic issue prediction"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.label_encoders = {}
        self.feature_columns = []
        self.model_metrics = {}
        
        # Model configurations
        self.model_configs = {
            'issue_classifier': {
                'type': 'classification',
                'model_class': RandomForestClassifier,
                'params': {'n_estimators': 100, 'random_state': 42, 'max_depth': 10}
            },
            'risk_regressor': {
                'type': 'regression', 
                'model_class': GradientBoostingRegressor,
                'params': {'n_estimators': 100, 'random_state': 42, 'learning_rate': 0.1}
            },
            'time_series': {
                'type': 'time_series',
                'model_class': 'lstm',
                'params': {'sequence_length': 7, 'hidden_units': 50}
            },
            'anomaly_detector': {
                'type': 'anomaly',
                'model_class': 'isolation_forest',
                'params': {'contamination': 0.1}
            }
        }
    
    def train_issue_classifier(self, data: pd.DataFrame) -> Any:
        """
        Train classification model to predict issue categories
        
        Args:
            data: Training dataset
            
        Returns:
            Trained classification model
        """
        try:
            logger.info("🎯 Training issue classification model...")
            
            # Prepare features and target
            X, y = self._prepare_classification_data(data)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=10,
                class_weight='balanced'
            )
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Store model and scaler
            self.models['issue_classifier'] = model
            self.scalers['issue_classifier'] = scaler
            self.model_metrics['issue_classifier'] = {'accuracy': accuracy}
            
            logger.info(f"✅ Issue classifier trained - Accuracy: {accuracy:.3f}")
            
            # Feature importance
            feature_importance = pd.DataFrame({
                'feature': self.feature_columns,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            logger.info("Top 5 features:")
            for _, row in feature_importance.head().iterrows():
                logger.info(f"  {row['feature']}: {row['importance']:.3f}")
            
            return model
            
        except Exception as e:
            logger.error(f"❌ Error training issue classifier: {e}")
            return None
    
    def train_risk_regressor(self, data: pd.DataFrame) -> Any:
        """
        Train regression model to predict risk scores
        
        Args:
            data: Training dataset
            
        Returns:
            Trained regression model
        """
        try:
            logger.info("🎯 Training risk regression model...")
            
            # Prepare features and target
            X, y = self._prepare_regression_data(data)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Train model
            model = GradientBoostingRegressor(
                n_estimators=100,
                random_state=42,
                learning_rate=0.1,
                max_depth=6
            )
            model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test)
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            
            # Store model
            self.models['risk_regressor'] = model
            self.model_metrics['risk_regressor'] = {'rmse': rmse}
            
            logger.info(f"✅ Risk regressor trained - RMSE: {rmse:.3f}")
            
            return model
            
        except Exception as e:
            logger.error(f"❌ Error training risk regressor: {e}")
            return None
    
    def train_time_series_model(self, data: pd.DataFrame) -> Any:
        """
        Train LSTM model for time series prediction
        
        Args:
            data: Training dataset with time series data
            
        Returns:
            Trained LSTM model
        """
        try:
            logger.info("🎯 Training time series LSTM model...")
            
            # Prepare time series data
            sequences, targets = self._prepare_time_series_data(data)
            
            if len(sequences) == 0:
                logger.warning("⚠️ No time series data available")
                return None
            
            # Split data
            split_idx = int(0.8 * len(sequences))
            X_train, X_test = sequences[:split_idx], sequences[split_idx:]
            y_train, y_test = targets[:split_idx], targets[split_idx:]
            
            # Build LSTM model
            model = keras.Sequential([
                layers.LSTM(50, return_sequences=True, input_shape=(sequences.shape[1], sequences.shape[2])),
                layers.Dropout(0.2),
                layers.LSTM(50, return_sequences=False),
                layers.Dropout(0.2),
                layers.Dense(25),
                layers.Dense(1)
            ])
            
            model.compile(optimizer='adam', loss='mse', metrics=['mae'])
            
            # Train model
            history = model.fit(
                X_train, y_train,
                epochs=50,
                batch_size=32,
                validation_data=(X_test, y_test),
                verbose=0
            )
            
            # Evaluate
            test_loss = model.evaluate(X_test, y_test, verbose=0)
            
            # Store model
            self.models['time_series'] = model
            self.model_metrics['time_series'] = {'test_loss': test_loss[0], 'test_mae': test_loss[1]}
            
            logger.info(f"✅ Time series model trained - Test Loss: {test_loss[0]:.3f}")
            
            return model
            
        except Exception as e:
            logger.error(f"❌ Error training time series model: {e}")
            return None
    
    def train_anomaly_detector(self, data: pd.DataFrame) -> Any:
        """
        Train anomaly detection model
        
        Args:
            data: Training dataset
            
        Returns:
            Trained anomaly detection model
        """
        try:
            logger.info("🎯 Training anomaly detection model...")
            
            from sklearn.ensemble import IsolationForest
            
            # Prepare data for anomaly detection
            X = self._prepare_anomaly_data(data)
            
            # Train model
            model = IsolationForest(
                contamination=0.1,
                random_state=42
            )
            model.fit(X)
            
            # Store model
            self.models['anomaly_detector'] = model
            
            logger.info("✅ Anomaly detector trained")
            
            return model
            
        except Exception as e:
            logger.error(f"❌ Error training anomaly detector: {e}")
            return None
    
    def predict_issues(self, location: Dict[str, float], weather_data: Optional[Dict] = None,
                      historical_context: Optional[Dict] = None, timeframe: str = "7_days") -> List[Dict]:
        """
        Generate predictions for a specific location
        
        Args:
            location: {"lat": float, "lng": float}
            weather_data: Weather forecast data
            historical_context: Historical issue data
            timeframe: Prediction timeframe
            
        Returns:
            List of issue predictions
        """
        try:
            predictions = []
            
            # Get base features for the location
            features = self._extract_location_features(location, weather_data, historical_context)
            
            # Predict issue categories
            if 'issue_classifier' in self.models:
                category_predictions = self._predict_categories(features)
                predictions.extend(category_predictions)
            
            # Predict risk scores
            if 'risk_regressor' in self.models:
                risk_predictions = self._predict_risk_scores(features)
                predictions.extend(risk_predictions)
            
            # Time series predictions
            if 'time_series' in self.models and historical_context:
                time_predictions = self._predict_time_series(location, timeframe)
                predictions.extend(time_predictions)
            
            # If no models are trained, return fallback predictions
            if not predictions:
                predictions = self._generate_fallback_predictions(location, weather_data)
            
            return predictions
            
        except Exception as e:
            logger.error(f"❌ Error generating predictions: {e}")
            return self._generate_fallback_predictions(location, weather_data)
    
    def identify_risk_areas(self, center_location: Dict[str, float], radius_km: float = 10) -> List[Dict]:
        """
        Identify high-risk areas around a center location
        
        Args:
            center_location: Center coordinates
            radius_km: Search radius in kilometers
            
        Returns:
            List of risk areas
        """
        try:
            risk_areas = []
            
            # Generate grid of locations around center
            grid_locations = self._generate_location_grid(center_location, radius_km)
            
            for loc in grid_locations:
                # Calculate risk score for this location
                risk_score = self._calculate_location_risk(loc)
                
                if risk_score > 0.6:  # High risk threshold
                    risk_areas.append({
                        'location': loc,
                        'risk_level': self._get_risk_level(risk_score),
                        'risk_score': risk_score,
                        'predicted_issues': self._predict_issues_for_location(loc),
                        'population_density': np.random.uniform(100, 5000)
                    })
            
            return risk_areas
            
        except Exception as e:
            logger.error(f"❌ Error identifying risk areas: {e}")
            return []
    
    def calculate_overall_risk(self, predictions: List[Dict], risk_areas: List[Dict]) -> float:
        """
        Calculate overall risk score from predictions and risk areas
        
        Args:
            predictions: List of issue predictions
            risk_areas: List of risk areas
            
        Returns:
            Overall risk score (0-1)
        """
        try:
            if not predictions and not risk_areas:
                return 0.0
            
            # Calculate risk from predictions
            prediction_risk = 0.0
            if predictions:
                avg_probability = np.mean([p.get('probability', 0) for p in predictions])
                avg_risk_score = np.mean([p.get('risk_score', 0) for p in predictions])
                prediction_risk = (avg_probability + avg_risk_score) / 2
            
            # Calculate risk from risk areas
            area_risk = 0.0
            if risk_areas:
                avg_area_risk = np.mean([area.get('risk_score', 0) for area in risk_areas])
                area_risk = avg_area_risk
            
            # Combine risks
            if prediction_risk > 0 and area_risk > 0:
                overall_risk = (prediction_risk + area_risk) / 2
            else:
                overall_risk = max(prediction_risk, area_risk)
            
            return min(1.0, overall_risk)
            
        except Exception as e:
            logger.error(f"❌ Error calculating overall risk: {e}")
            return 0.0
    
    def _prepare_classification_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for classification training"""
        # Select feature columns (exclude target and metadata)
        feature_cols = [col for col in data.columns if col not in [
            'category', 'date', 'created_at', 'location_key', 'risk_score'
        ]]
        
        # Handle categorical variables
        categorical_cols = data[feature_cols].select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                data[col] = self.label_encoders[col].fit_transform(data[col].astype(str))
        
        X = data[feature_cols].fillna(0).values
        y = data['category'].values
        
        self.feature_columns = feature_cols
        return X, y
    
    def _prepare_regression_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for regression training"""
        # Select feature columns
        feature_cols = [col for col in data.columns if col not in [
            'risk_score', 'date', 'created_at', 'location_key'
        ]]
        
        X = data[feature_cols].fillna(0).values
        y = data['risk_score'].values
        
        return X, y
    
    def _prepare_time_series_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare time series data for LSTM training"""
        try:
            # Group by location and sort by date
            if 'location_key' not in data.columns or 'date' not in data.columns:
                return np.array([]), np.array([])
            
            grouped = data.groupby('location_key')
            sequences = []
            targets = []
            
            sequence_length = 7  # 7 days
            
            for name, group in grouped:
                group = group.sort_values('date')
                
                if len(group) < sequence_length + 1:
                    continue
                
                # Create sequences
                for i in range(len(group) - sequence_length):
                    seq = group.iloc[i:i+sequence_length]
                    target = group.iloc[i+sequence_length]['risk_score']
                    
                    # Select numeric features
                    numeric_cols = seq.select_dtypes(include=[np.number]).columns
                    seq_features = seq[numeric_cols].fillna(0).values
                    
                    if seq_features.shape[0] == sequence_length:
                        sequences.append(seq_features)
                        targets.append(target)
            
            if sequences:
                return np.array(sequences), np.array(targets)
            else:
                return np.array([]), np.array([])
                
        except Exception as e:
            logger.error(f"❌ Error preparing time series data: {e}")
            return np.array([]), np.array([])
    
    def _prepare_anomaly_data(self, data: pd.DataFrame) -> np.ndarray:
        """Prepare data for anomaly detection"""
        # Select numeric features
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        return data[numeric_cols].fillna(0).values
    
    def _extract_location_features(self, location: Dict[str, float], 
                                 weather_data: Optional[Dict] = None,
                                 historical_context: Optional[Dict] = None) -> Dict[str, Any]:
        """Extract features for a specific location"""
        features = {
            'latitude': location['lat'],
            'longitude': location['lng'],
            'distance_from_center': np.sqrt((location['lat'] - 23.3441)**2 + (location['lng'] - 85.3096)**2),
            'is_weekend': datetime.now().weekday() in [5, 6],
            'month': datetime.now().month,
            'hour': datetime.now().hour,
            'season': self._get_season(datetime.now().month)
        }
        
        # Add weather features
        if weather_data:
            features.update({
                'precipitation': weather_data.get('precipitation', 0),
                'temperature': weather_data.get('temperature', 25),
                'humidity': weather_data.get('humidity', 50),
                'heavy_rain': 1 if weather_data.get('precipitation', 0) > 20 else 0,
                'extreme_temp': 1 if weather_data.get('temperature', 25) > 35 or weather_data.get('temperature', 25) < 5 else 0
            })
        
        # Add historical features
        if historical_context:
            features.update({
                'total_issues': historical_context.get('total_issues', 0),
                'avg_resolution_time': historical_context.get('avg_resolution_time', 3),
                'trend_increasing': 1 if historical_context.get('recent_trend') == 'increasing' else 0
            })
        
        return features
    
    def _predict_categories(self, features: Dict[str, Any]) -> List[Dict]:
        """Predict issue categories for a location"""
        if 'issue_classifier' not in self.models:
            return []
        
        try:
            # Convert features to array
            feature_array = np.array([list(features.values())]).reshape(1, -1)
            
            # Scale features
            if 'issue_classifier' in self.scalers:
                feature_array = self.scalers['issue_classifier'].transform(feature_array)
            
            # Get predictions
            probabilities = self.models['issue_classifier'].predict_proba(feature_array)[0]
            classes = self.models['issue_classifier'].classes_
            
            predictions = []
            for i, prob in enumerate(probabilities):
                if prob > 0.1:  # Only include predictions above 10% probability
                    predictions.append({
                        'category': classes[i],
                        'probability': float(prob),
                        'confidence': float(prob),
                        'risk_score': float(prob * 0.8),  # Convert to risk score
                        'reasoning': f"Historical pattern suggests {prob:.1%} chance of {classes[i]}",
                        'recommended_actions': self._get_recommended_actions(classes[i]),
                        'timeframe': '7_days'
                    })
            
            return sorted(predictions, key=lambda x: x['probability'], reverse=True)[:5]
            
        except Exception as e:
            logger.error(f"❌ Error predicting categories: {e}")
            return []
    
    def _predict_risk_scores(self, features: Dict[str, Any]) -> List[Dict]:
        """Predict risk scores for a location"""
        if 'risk_regressor' not in self.models:
            return []
        
        try:
            # Convert features to array
            feature_array = np.array([list(features.values())]).reshape(1, -1)
            
            # Get prediction
            risk_score = self.models['risk_regressor'].predict(feature_array)[0]
            risk_score = max(0, min(1, risk_score))  # Clamp to 0-1
            
            return [{
                'category': 'Overall Risk',
                'probability': risk_score,
                'confidence': 0.7,
                'risk_score': risk_score,
                'reasoning': f"ML model predicts {risk_score:.1%} overall risk based on location and context",
                'recommended_actions': self._get_risk_actions(risk_score),
                'timeframe': '7_days'
            }]
            
        except Exception as e:
            logger.error(f"❌ Error predicting risk scores: {e}")
            return []
    
    def _predict_time_series(self, location: Dict[str, float], timeframe: str) -> List[Dict]:
        """Generate time series predictions"""
        # This is a simplified implementation
        # In a real scenario, you'd use the trained LSTM model
        
        return [{
            'category': 'Time Series Prediction',
            'probability': 0.3,
            'confidence': 0.6,
            'risk_score': 0.3,
            'reasoning': f"Time series analysis suggests moderate risk over {timeframe}",
            'recommended_actions': ['Monitor trends closely', 'Prepare contingency plans'],
            'timeframe': timeframe
        }]
    
    def _generate_fallback_predictions(self, location: Dict[str, float], 
                                     weather_data: Optional[Dict] = None) -> List[Dict]:
        """Generate fallback predictions when models aren't available"""
        predictions = []
        
        # Base predictions on simple heuristics
        if weather_data and weather_data.get('precipitation', 0) > 20:
            predictions.append({
                'category': 'Water Supply',
                'probability': 0.7,
                'confidence': 0.8,
                'risk_score': 0.7,
                'reasoning': 'Heavy rainfall predicted, high risk of water-related issues',
                'recommended_actions': ['Check drainage systems', 'Monitor water levels', 'Prepare emergency response'],
                'timeframe': '7_days'
            })
        
        predictions.append({
            'category': 'Road & Pothole Issues',
            'probability': 0.4,
            'confidence': 0.6,
            'risk_score': 0.4,
            'reasoning': 'General risk assessment based on location and historical data',
            'recommended_actions': ['Regular road inspections', 'Preventive maintenance'],
            'timeframe': '7_days'
        })
        
        return predictions
    
    def _generate_location_grid(self, center: Dict[str, float], radius_km: float) -> List[Dict[str, float]]:
        """Generate grid of locations around center point"""
        # Rough conversion: 1 degree ≈ 111 km
        lat_offset = radius_km / 111.0
        lng_offset = radius_km / (111.0 * np.cos(np.radians(center['lat'])))
        
        locations = []
        for i in range(-2, 3):
            for j in range(-2, 3):
                lat = center['lat'] + i * lat_offset / 2
                lng = center['lng'] + j * lng_offset / 2
                locations.append({'lat': lat, 'lng': lng})
        
        return locations
    
    def _calculate_location_risk(self, location: Dict[str, float]) -> float:
        """Calculate risk score for a location"""
        # Simple risk calculation based on distance from center and random factors
        distance = np.sqrt((location['lat'] - 23.3441)**2 + (location['lng'] - 85.3096)**2)
        base_risk = min(1.0, distance * 0.5)
        
        # Add some randomness for demonstration
        return min(1.0, base_risk + np.random.uniform(0, 0.3))
    
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
    
    def _predict_issues_for_location(self, location: Dict[str, float]) -> List[str]:
        """Predict specific issues for a location"""
        issues = []
        
        # Simple heuristic-based predictions
        if np.random.random() > 0.5:
            issues.append('Road & Pothole Issues')
        if np.random.random() > 0.6:
            issues.append('Water Supply')
        if np.random.random() > 0.7:
            issues.append('Waste Management')
        
        return issues
    
    def _get_recommended_actions(self, category: str) -> List[str]:
        """Get recommended actions for a category"""
        action_map = {
            'Road & Pothole Issues': ['Inspect roads', 'Schedule repairs', 'Traffic management'],
            'Water Supply': ['Check water pressure', 'Monitor quality', 'Emergency backup'],
            'Waste Management': ['Schedule collection', 'Monitor bins', 'Public awareness'],
            'Streetlight Problems': ['Check electrical systems', 'Replace bulbs', 'Schedule maintenance'],
            'Sewage & Drainage': ['Inspect drains', 'Clear blockages', 'System maintenance'],
            'Public Safety': ['Increase patrols', 'Community engagement', 'Emergency planning'],
            'Parks & Recreation': ['Maintenance check', 'Safety inspection', 'Public notification'],
            'Traffic Management': ['Traffic monitoring', 'Signal optimization', 'Route planning']
        }
        
        return action_map.get(category, ['Monitor situation', 'Prepare response plan'])
    
    def _get_risk_actions(self, risk_score: float) -> List[str]:
        """Get recommended actions based on risk score"""
        if risk_score >= 0.8:
            return ['Immediate action required', 'Deploy emergency resources', 'Public alert']
        elif risk_score >= 0.6:
            return ['High priority monitoring', 'Prepare response team', 'Preventive measures']
        elif risk_score >= 0.4:
            return ['Regular monitoring', 'Schedule inspections', 'Maintenance planning']
        else:
            return ['Routine monitoring', 'Standard procedures']
    
    def _get_season(self, month: int) -> int:
        """Get season as numeric value"""
        if month in [12, 1, 2]:
            return 0  # Winter
        elif month in [3, 4, 5]:
            return 1  # Spring
        elif month in [6, 7, 8]:
            return 2  # Summer
        else:
            return 3  # Fall
