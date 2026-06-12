/** @module server */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with restricted origin access for production Vercel frontend
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: allowedOrigin,
  optionsSuccessStatus: 200
}));

// Parse incoming JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB connection
connectDB();

// Register Router Routes
const agentRoutes = require('./routes/agents');
const conversationRoutes = require('./routes/conversation');
const callRoutes = require('./routes/calls');
const analyticsRoutes = require('./routes/analytics');
const telephonyRoutes = require('./routes/telephony');
app.use('/api/agents', agentRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/telephony', telephonyRoutes);

// GET /api/health Route
app.get('/api/health', (req, res) => {
  // MongoDB states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  const dbStatus = dbStateMap[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Default Fallback Route
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`VoiceFlow Backend server running on port ${PORT}`);
});

// Code cleanup and formatting pass 30
