#!/bin/bash

# Predictive Analytics ML Service Startup Script

echo "🚀 Starting Predictive Analytics ML Service..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Please run this script from the ml-service directory"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Generate sample data if it doesn't exist
if [ ! -f "data/issues_dataset.csv" ]; then
    echo "📊 Generating sample data..."
    python data/sample_dataset.py
fi

# Train models if they don't exist
if [ ! -d "models" ]; then
    echo "🤖 Training ML models..."
    python train_models.py
else
    echo "✅ Models already exist, skipping training..."
fi

# Start the service
echo "🌟 Starting ML service on http://localhost:8001"
echo "📚 API documentation available at http://localhost:8001/docs"
echo "💡 Press Ctrl+C to stop the service"
echo ""

python main.py
