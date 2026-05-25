const mongoose = require('mongoose');

const TranscriptItemSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'ai', 'system', 'agent', 'assistant']
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: String,
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
});

const CallLogSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: [true, 'agentId is required for logging a call']
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  outcome: {
    type: String,
    required: true,
    enum: {
      values: ['achieved', 'not-achieved', 'abandoned'],
      message: '{VALUE} is not a valid call outcome. Choose achieved, not-achieved, or abandoned'
    },
    default: 'not-achieved'
  },
  transcript: [TranscriptItemSchema]
});

module.exports = mongoose.model('CallLog', CallLogSchema);
