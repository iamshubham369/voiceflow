/** @module Agent */
const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true
  },
  voiceType: {
    type: String,
    required: [true, 'Voice type is required'],
    enum: {
      values: ['male', 'female', 'neutral'],
      message: '{VALUE} is not a valid voice type. Choose male, female, or neutral'
    }
  },
  goal: {
    type: String,
    required: [true, 'Goal/Objective is required'],
    trim: true
  },
  systemPrompt: {
    type: String,
    required: [true, 'System prompt instructions are required'],
    trim: true
  },
  scenarioType: {
    type: String,
    required: [true, 'Scenario type is required'],
    enum: {
      values: [
        'Lead Qualification',
        'Appointment Reminder',
        'Feedback Collection',
        'Information Gathering',
        'Customer Support',
        'Sales Outreach',
        'User Interview',
        'Appointment Booking',
        'Custom Scenario'
      ],
      message: '{VALUE} is not a valid scenario category'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Agent', AgentSchema);

// Code cleanup and formatting pass 23
