/** @module calls */
const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');

// @route   POST /api/calls/start
// @desc    Initialize a new call log session in MongoDB
router.post('/start', async (req, res) => {
  try {
    const { agentId } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId is required to start logging a call' });
    }

    const newCall = new CallLog({
      agentId,
      startTime: new Date(),
      outcome: 'not-achieved',
      transcript: []
    });

    const savedCall = await newCall.save();
    res.status(201).json({ success: true, callId: savedCall._id, data: savedCall });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/calls/:id/message
// @desc    Append a dialogue bubble message to a call log transcript
router.post('/:id/message', async (req, res) => {
  try {
    const { role, message } = req.body;
    if (!role || !message) {
      return res.status(400).json({ success: false, error: 'role and message are required' });
    }

    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          transcript: { role, message, timestamp: timestampStr }
        }
      },
      { new: true }
    );

    if (!callLog) {
      return res.status(404).json({ success: false, error: 'Call log session not found' });
    }

    res.status(200).json({ success: true, data: callLog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/calls/:id/end
// @desc    End call log session, recording outcome and duration metrics
router.post('/:id/end', async (req, res) => {
  try {
    const { outcome, duration } = req.body;
    
    if (!outcome || duration === undefined) {
      return res.status(400).json({ success: false, error: 'outcome and duration are required' });
    }

    const validOutcomes = ['achieved', 'not-achieved', 'abandoned'];
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({ success: false, error: 'outcome must be: achieved, not-achieved, or abandoned' });
    }

    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          endTime: new Date(),
          outcome,
          duration: parseInt(duration) || 0
        }
      },
      { new: true }
    );

    if (!callLog) {
      return res.status(404).json({ success: false, error: 'Call log session not found' });
    }

    res.status(200).json({ success: true, data: callLog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/calls
// @desc    List all call logs in database, populating Agent details
router.get('/', async (req, res) => {
  try {
    const logs = await CallLog.find()
      .populate('agentId', 'name scenarioType')
      .sort({ startTime: -1 });

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/calls/:id
// @desc    Retrieve full details including dialogue transcript for a single call log
router.get('/:id', async (req, res) => {
  try {
    const log = await CallLog.findById(req.params.id).populate('agentId', 'name scenarioType goal');
    if (!log) {
      return res.status(404).json({ success: false, error: 'Call log record not found' });
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   DELETE /api/calls/:id
// @desc    Delete a call log record from database
router.delete('/:id', async (req, res) => {
  try {
    const deletedLog = await CallLog.findByIdAndDelete(req.params.id);
    if (!deletedLog) {
      return res.status(404).json({ success: false, error: 'Call log record not found' });
    }
    res.status(200).json({ success: true, message: 'Call log deleted successfully', data: deletedLog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
