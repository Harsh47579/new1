"""
Predictive Analytics API for Civic Issue Management System
Provides ML-powered predictions for civic issues based on historical data
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime, timedelta
import logging

from services.data_processor import DataProcessor
from services.ml_models import PredictiveModels
from services.weather_service import WeatherService
from services.visualization import VisualizationService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Civic Issue Predictive Analytics API",
    description="ML-powered predictions for civic issues",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
data_processor = DataProcessor()
ml_models = PredictiveModels()
weather_service = WeatherService()
viz_service = VisualizationService()

# Global variables for trained models
trained_models = {}
model_last_updated = {}

# Pydantic models for API
class PredictionRequest(BaseModel):
    location: Dict[str, float]  # {"lat": 23.3441, "lng": 85.3096}
    timeframe: str = "7_days"  # "1_day", "7_days", "30_days"
    include_weather: bool = True
    include_historical: bool = True

class IssuePrediction(BaseModel):
    category: str
    probability: float
    confidence: float
    risk_score: float
    reasoning: str
    recommended_actions: List[str]
    timeframe: str

class RiskArea(BaseModel):
    location: Dict[str, Any]
    risk_level: str  # "low", "medium", "high", "critical"
    risk_score: float
    predicted_issues: List[str]
    population_density: Optional[float] = None

class PredictionResponse(BaseModel):
    success: bool
    predictions: List[IssuePrediction]
    risk_areas: List[RiskArea]
    overall_risk_score: float
    weather_context: Optional[Dict[str, Any]] = None
    historical_context: Optional[Dict[str, Any]] = None
    generated_at: datetime
    model_info: Dict[str, str]

@app.on_event("startup")
async def startup_event():
    """Initialize models and load data on startup"""
    logger.info("🚀 Starting Predictive Analytics API...")
    
    try:
        # Load and train models
        await train_models()
        logger.info("✅ Models loaded and trained successfully")
    except Exception as e:
        logger.error(f"❌ Error during startup: {e}")

@app.post("/predict", response_model=PredictionResponse)
async def predict_issues(request: PredictionRequest):
    """
    Predict civic issues for a specific location and timeframe
    
    Args:
        request: Prediction request with location and parameters
        
    Returns:
        PredictionResponse: Comprehensive predictions and risk analysis
    """
    try:
        logger.info(f"🔮 Making predictions for location: {request.location}")
        
        # Get weather data if requested
        weather_data = None
        if request.include_weather:
            weather_data = await weather_service.get_weather_forecast(
                request.location["lat"], 
                request.location["lng"],
                request.timeframe
            )
        
        # Get historical context
        historical_context = None
        if request.include_historical:
            historical_context = data_processor.get_historical_context(
                request.location, 
                request.timeframe
            )
        
        # Generate predictions using ML models
        predictions = ml_models.predict_issues(
            location=request.location,
            weather_data=weather_data,
            historical_context=historical_context,
            timeframe=request.timeframe
        )
        
        # Identify risk areas
        risk_areas = ml_models.identify_risk_areas(
            center_location=request.location,
            radius_km=10
        )
        
        # Calculate overall risk score
        overall_risk = ml_models.calculate_overall_risk(predictions, risk_areas)
        
        return PredictionResponse(
            success=True,
            predictions=predictions,
            risk_areas=risk_areas,
            overall_risk_score=overall_risk,
            weather_context=weather_data,
            historical_context=historical_context,
            generated_at=datetime.now(),
            model_info={
                "models_used": list(trained_models.keys()),
                "last_trained": str(max(model_last_updated.values()) if model_last_updated else datetime.now()),
                "version": "1.0.0"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/train", status_code=200)
async def train_models(background_tasks: BackgroundTasks):
    """
    Retrain all ML models with latest data
    
    This endpoint triggers model retraining in the background
    """
    try:
        background_tasks.add_task(train_models_task)
        return {"message": "Model training started in background", "status": "training"}
    except Exception as e:
        logger.error(f"❌ Training error: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": len(trained_models),
        "timestamp": datetime.now(),
        "version": "1.0.0"
    }

@app.get("/models/status")
async def get_model_status():
    """Get status of all trained models"""
    return {
        "models": {
            name: {
                "status": "trained" if name in trained_models else "not_trained",
                "last_updated": str(model_last_updated.get(name, "never")),
                "accuracy": getattr(trained_models.get(name), "accuracy", None) if name in trained_models else None
            }
            for name in ["issue_classifier", "risk_regressor", "time_series", "anomaly_detector"]
        }
    }

@app.get("/visualization/heatmap")
async def get_risk_heatmap(
    center_lat: float,
    center_lng: float,
    radius_km: float = 10,
    resolution: int = 100
):
    """
    Generate risk heatmap visualization data
    
    Args:
        center_lat: Center latitude
        center_lng: Center longitude  
        radius_km: Radius in kilometers
        resolution: Grid resolution (higher = more detailed)
        
    Returns:
        Heatmap data for visualization
    """
    try:
        heatmap_data = viz_service.generate_risk_heatmap(
            center_lat, center_lng, radius_km, resolution
        )
        return {
            "success": True,
            "heatmap_data": heatmap_data,
            "bounds": {
                "north": center_lat + (radius_km / 111.0),  # Rough conversion
                "south": center_lat - (radius_km / 111.0),
                "east": center_lng + (radius_km / (111.0 * np.cos(np.radians(center_lat)))),
                "west": center_lng - (radius_km / (111.0 * np.cos(np.radians(center_lat))))
            }
        }
    except Exception as e:
        logger.error(f"❌ Heatmap error: {e}")
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {str(e)}")

async def train_models_task():
    """Background task for training models"""
    try:
        logger.info("🔄 Starting model training...")
        
        # Load and prepare data
        data = data_processor.load_training_data()
        
        # Train each model
        models_to_train = [
            ("issue_classifier", ml_models.train_issue_classifier),
            ("risk_regressor", ml_models.train_risk_regressor),
            ("time_series", ml_models.train_time_series_model),
            ("anomaly_detector", ml_models.train_anomaly_detector)
        ]
        
        for model_name, train_func in models_to_train:
            logger.info(f"🎯 Training {model_name}...")
            model = train_func(data)
            trained_models[model_name] = model
            model_last_updated[model_name] = datetime.now()
            logger.info(f"✅ {model_name} trained successfully")
        
        logger.info("🎉 All models trained successfully!")
        
    except Exception as e:
        logger.error(f"❌ Model training failed: {e}")

async def train_models():
    """Synchronous model training for startup"""
    await train_models_task()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
