"""
Model Training Script for Civic Issue Predictive Analytics
Trains and saves ML models for production use
"""

import os
import sys
import logging
import pandas as pd
import numpy as np
from datetime import datetime
import joblib

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_processor import DataProcessor
from services.ml_models import PredictiveModels
from data.sample_dataset import SampleDatasetGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main training function"""
    logger.info("🚀 Starting model training pipeline...")
    
    try:
        # Initialize services
        data_processor = DataProcessor()
        ml_models = PredictiveModels()
        dataset_generator = SampleDatasetGenerator()
        
        # Generate sample data if not exists
        data_dir = "data"
        if not os.path.exists(f"{data_dir}/issues_dataset.csv"):
            logger.info("📊 Sample data not found, generating...")
            dataset_generator.save_datasets(data_dir)
        
        # Load training data
        logger.info("📈 Loading training data...")
        training_data = data_processor.load_training_data()
        
        if training_data.empty:
            logger.error("❌ No training data available")
            return False
        
        logger.info(f"✅ Loaded {len(training_data)} training samples")
        logger.info(f"📋 Features: {list(training_data.columns)}")
        
        # Train models
        models_trained = {}
        
        # 1. Train Issue Classification Model
        logger.info("\n🎯 Training Issue Classification Model...")
        classifier = ml_models.train_issue_classifier(training_data)
        if classifier:
            models_trained['issue_classifier'] = True
            logger.info("✅ Issue classifier trained successfully")
        else:
            logger.error("❌ Issue classifier training failed")
            models_trained['issue_classifier'] = False
        
        # 2. Train Risk Regression Model
        logger.info("\n🎯 Training Risk Regression Model...")
        regressor = ml_models.train_risk_regressor(training_data)
        if regressor:
            models_trained['risk_regressor'] = True
            logger.info("✅ Risk regressor trained successfully")
        else:
            logger.error("❌ Risk regressor training failed")
            models_trained['risk_regressor'] = False
        
        # 3. Train Time Series Model
        logger.info("\n🎯 Training Time Series Model...")
        time_series = ml_models.train_time_series_model(training_data)
        if time_series:
            models_trained['time_series'] = True
            logger.info("✅ Time series model trained successfully")
        else:
            logger.error("❌ Time series model training failed")
            models_trained['time_series'] = False
        
        # 4. Train Anomaly Detection Model
        logger.info("\n🎯 Training Anomaly Detection Model...")
        anomaly_detector = ml_models.train_anomaly_detector(training_data)
        if anomaly_detector:
            models_trained['anomaly_detector'] = True
            logger.info("✅ Anomaly detector trained successfully")
        else:
            logger.error("❌ Anomaly detector training failed")
            models_trained['anomaly_detector'] = False
        
        # Save trained models
        logger.info("\n💾 Saving trained models...")
        models_dir = "models"
        os.makedirs(models_dir, exist_ok=True)
        
        save_models(ml_models, models_dir)
        
        # Generate training report
        generate_training_report(training_data, models_trained, ml_models)
        
        # Test models with sample predictions
        logger.info("\n🧪 Testing trained models...")
        test_models(ml_models)
        
        logger.info("\n🎉 Model training completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        return False

def save_models(ml_models: PredictiveModels, models_dir: str):
    """Save trained models to disk"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for model_name, model in ml_models.models.items():
            if model is not None:
                model_path = f"{models_dir}/{model_name}_{timestamp}.joblib"
                
                # Save model
                joblib.dump(model, model_path)
                logger.info(f"💾 Saved {model_name} to {model_path}")
                
                # Create latest symlink
                latest_path = f"{models_dir}/{model_name}_latest.joblib"
                if os.path.exists(latest_path):
                    os.remove(latest_path)
                os.symlink(f"{model_name}_{timestamp}.joblib", latest_path)
        
        # Save scalers and encoders
        for scaler_name, scaler in ml_models.scalers.items():
            if scaler is not None:
                scaler_path = f"{models_dir}/{scaler_name}_scaler_{timestamp}.joblib"
                joblib.dump(scaler, scaler_path)
                
                latest_scaler_path = f"{models_dir}/{scaler_name}_scaler_latest.joblib"
                if os.path.exists(latest_scaler_path):
                    os.remove(latest_scaler_path)
                os.symlink(f"{scaler_name}_scaler_{timestamp}.joblib", latest_scaler_path)
        
        # Save encoders
        for encoder_name, encoder in ml_models.label_encoders.items():
            if encoder is not None:
                encoder_path = f"{models_dir}/{encoder_name}_encoder_{timestamp}.joblib"
                joblib.dump(encoder, encoder_path)
                
                latest_encoder_path = f"{models_dir}/{encoder_name}_encoder_latest.joblib"
                if os.path.exists(latest_encoder_path):
                    os.remove(latest_encoder_path)
                os.symlink(f"{encoder_name}_encoder_{timestamp}.joblib", latest_encoder_path)
        
        # Save feature columns
        if ml_models.feature_columns:
            features_path = f"{models_dir}/feature_columns_{timestamp}.joblib"
            joblib.dump(ml_models.feature_columns, features_path)
            
            latest_features_path = f"{models_dir}/feature_columns_latest.joblib"
            if os.path.exists(latest_features_path):
                os.remove(latest_features_path)
            os.symlink(f"feature_columns_{timestamp}.joblib", latest_features_path)
        
        logger.info(f"✅ All models saved to {models_dir}/")
        
    except Exception as e:
        logger.error(f"❌ Error saving models: {e}")

def generate_training_report(training_data: pd.DataFrame, models_trained: dict, 
                           ml_models: PredictiveModels):
    """Generate training report"""
    try:
        report = {
            'training_date': datetime.now().isoformat(),
            'dataset_info': {
                'total_samples': len(training_data),
                'features_count': len(training_data.columns),
                'categories': list(training_data['category'].unique()) if 'category' in training_data.columns else [],
                'date_range': {
                    'start': str(training_data['date'].min()) if 'date' in training_data.columns else None,
                    'end': str(training_data['date'].max()) if 'date' in training_data.columns else None
                }
            },
            'models_trained': models_trained,
            'model_metrics': ml_models.model_metrics,
            'feature_columns': ml_models.feature_columns
        }
        
        # Save report
        import json
        with open('models/training_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info("📊 Training report saved to models/training_report.json")
        
    except Exception as e:
        logger.error(f"❌ Error generating training report: {e}")

def test_models(ml_models: PredictiveModels):
    """Test trained models with sample data"""
    try:
        # Test location
        test_location = {'lat': 23.3441, 'lng': 85.3096}
        
        # Test weather data
        test_weather = {
            'precipitation': 25.0,
            'temperature': 30.0,
            'humidity': 70.0
        }
        
        # Test historical context
        test_context = {
            'total_issues': 15,
            'avg_resolution_time': 4.5,
            'recent_trend': 'increasing'
        }
        
        logger.info("🧪 Testing model predictions...")
        
        # Generate predictions
        predictions = ml_models.predict_issues(
            location=test_location,
            weather_data=test_weather,
            historical_context=test_context,
            timeframe="7_days"
        )
        
        logger.info(f"✅ Generated {len(predictions)} predictions")
        
        for i, prediction in enumerate(predictions[:3]):  # Show first 3
            logger.info(f"  {i+1}. {prediction['category']}: {prediction['probability']:.2f} probability")
        
        # Test risk areas
        risk_areas = ml_models.identify_risk_areas(test_location, radius_km=5)
        logger.info(f"✅ Identified {len(risk_areas)} risk areas")
        
        # Test overall risk
        overall_risk = ml_models.calculate_overall_risk(predictions, risk_areas)
        logger.info(f"✅ Overall risk score: {overall_risk:.2f}")
        
    except Exception as e:
        logger.error(f"❌ Error testing models: {e}")

def load_models(models_dir: str = "models"):
    """Load trained models from disk"""
    try:
        from services.ml_models import PredictiveModels
        
        ml_models = PredictiveModels()
        
        # Load models
        for model_name in ['issue_classifier', 'risk_regressor', 'anomaly_detector']:
            model_path = f"{models_dir}/{model_name}_latest.joblib"
            if os.path.exists(model_path):
                model = joblib.load(model_path)
                ml_models.models[model_name] = model
                logger.info(f"✅ Loaded {model_name}")
            else:
                logger.warning(f"⚠️ Model {model_name} not found")
        
        # Load scalers
        for scaler_name in ['issue_classifier']:
            scaler_path = f"{models_dir}/{scaler_name}_scaler_latest.joblib"
            if os.path.exists(scaler_path):
                scaler = joblib.load(scaler_path)
                ml_models.scalers[scaler_name] = scaler
                logger.info(f"✅ Loaded {scaler_name} scaler")
        
        # Load feature columns
        features_path = f"{models_dir}/feature_columns_latest.joblib"
        if os.path.exists(features_path):
            feature_columns = joblib.load(features_path)
            ml_models.feature_columns = feature_columns
            logger.info(f"✅ Loaded feature columns")
        
        return ml_models
        
    except Exception as e:
        logger.error(f"❌ Error loading models: {e}")
        return None

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Training completed successfully!")
        print("📁 Models saved to: models/")
        print("📊 Report saved to: models/training_report.json")
        print("\n🚀 You can now start the ML service with: python main.py")
    else:
        print("\n❌ Training failed. Check the logs for details.")
        sys.exit(1)
