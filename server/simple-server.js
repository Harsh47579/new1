/**
 * Simple Express Server for Testing Predictive Analytics
 * This is a minimal server to test the API endpoint
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Add comprehensive error logging
app.use((err, req, res, next) => {
  console.error('🔥 Express Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// ✅ Predictive Analytics Route - SIMPLIFIED VERSION
app.get('/api/issues/predictive-analytics', async (req, res) => {
  try {
    console.log('🔍 Predictive analytics request received');
    
    // Generate dummy prediction data
    const prediction = {
      issue: "Waterlogging",
      riskScore: 0.82,
      recommendedAction: "Pre-clean drains in low-lying areas before rainfall",
      predictedDate: "2025-09-20",
      hotspotAreas: ["Sector 5", "Sector 9", "Old Market Road"]
    };

    console.log('✅ Sending prediction response:', prediction);

    res.json({
      success: true,
      prediction: prediction,
      timestamp: new Date().toISOString(),
      source: 'simple-server'
    });

  } catch (err) {
    console.error('🔥 Error in predictive analytics API:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching issue',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Test route without authentication
app.get('/api/issues/predictive-analytics-test', async (req, res) => {
  try {
    console.log('🧪 Test endpoint called');
    
    const prediction = {
      issue: "Road & Pothole Issues",
      riskScore: 0.65,
      recommendedAction: "Schedule preventive maintenance for main roads",
      predictedDate: "2025-09-22",
      hotspotAreas: ["Highway 33", "City Center", "Industrial Area"]
    };

    res.json({
      success: true,
      prediction: prediction,
      timestamp: new Date().toISOString(),
      source: 'test-endpoint'
    });

  } catch (err) {
    console.error('🔥 Test endpoint error:', err.stack || err);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: err.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running at http://localhost:${PORT}`);
  console.log(`📊 Test endpoints:`);
  console.log(`   - GET http://localhost:${PORT}/api/issues/predictive-analytics`);
  console.log(`   - GET http://localhost:${PORT}/api/issues/predictive-analytics-test`);
  console.log(`   - GET http://localhost:${PORT}/`);
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server terminated');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
