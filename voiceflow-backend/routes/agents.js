/** @module agents */
const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

// Helper input validation middleware
const validateAgentInput = (req, res, next) => {
  const { name, voiceType, goal, systemPrompt, scenarioType } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Name is required');
  if (!voiceType || !['male', 'female', 'neutral'].includes(voiceType.toLowerCase())) {
    errors.push('Voice type must be either male, female, or neutral');
  }
  if (!goal || !goal.trim()) errors.push('Goal/Objective is required');
  if (!systemPrompt || !systemPrompt.trim()) errors.push('System prompt is required');
  
  const validScenarios = [
    'Lead Qualification',
    'Appointment Reminder',
    'Feedback Collection',
    'Information Gathering',
    'Customer Support',
    'Sales Outreach',
    'User Interview',
    'Appointment Booking',
    'Custom Scenario'
  ];
  
  if (!scenarioType || !validScenarios.includes(scenarioType)) {
    errors.push(`Scenario type must be one of: ${validScenarios.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  next();
};

// @route   POST /api/agents
// @desc    Create a new voice calling agent
router.post('/', validateAgentInput, async (req, res) => {
  try {
    const { name, voiceType, goal, systemPrompt, scenarioType, isActive } = req.body;
    
    const newAgent = new Agent({
      name,
      voiceType: voiceType.toLowerCase(),
      goal,
      systemPrompt,
      scenarioType,
      isActive: isActive !== undefined ? isActive : true
    });

    const savedAgent = await newAgent.save();
    res.status(201).json({ success: true, data: savedAgent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/agents
// @desc    Get all agents
router.get('/', async (req, res) => {
  try {
    const agents = await Agent.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: agents.length, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/agents/:id
// @desc    Get details of a single agent
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent profile not found' });
    }
    res.status(200).json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   PUT /api/agents/:id
// @desc    Update agent profile settings or isActive toggle state
router.put('/:id', async (req, res) => {
  try {
    const { name, voiceType, goal, systemPrompt, scenarioType, isActive } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (voiceType !== undefined) {
      if (!['male', 'female', 'neutral'].includes(voiceType.toLowerCase())) {
        return res.status(400).json({ success: false, error: 'Voice type must be male, female, or neutral' });
      }
      updateData.voiceType = voiceType.toLowerCase();
    }
    if (goal !== undefined) updateData.goal = goal;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (scenarioType !== undefined) updateData.scenarioType = scenarioType;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedAgent = await Agent.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({ success: false, error: 'Agent profile not found' });
    }

    res.status(200).json({ success: true, data: updatedAgent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   DELETE /api/agents/:id
// @desc    Delete an agent profile
router.delete('/:id', async (req, res) => {
  try {
    const deletedAgent = await Agent.findByIdAndDelete(req.params.id);
    if (!deletedAgent) {
      return res.status(404).json({ success: false, error: 'Agent profile not found' });
    }
    res.status(200).json({ success: true, message: 'Agent deleted successfully', data: deletedAgent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// Code cleanup and formatting pass 25
