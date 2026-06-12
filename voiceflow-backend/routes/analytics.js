/** @module analytics */
const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');
const Agent = require('../models/Agent');

// @route   GET /api/analytics/summary
// @desc    Retrieve summarized metrics for analytics dashboards
router.get('/summary', async (req, res) => {
  try {
    // 1. Core counters
    const totalCalls = await CallLog.countDocuments();
    const totalAgents = await Agent.countDocuments();

    // 2. Average call duration
    const avgDurationAgg = await CallLog.aggregate([
      { $group: { _id: null, avg: { $avg: "$duration" } } }
    ]);
    const avgCallDuration = avgDurationAgg.length > 0 ? Math.round(avgDurationAgg[0].avg) : 0;

    // 3. Goal achievement rate
    const achievedCallsCount = await CallLog.countDocuments({ outcome: 'achieved' });
    const goalAchievementRate = totalCalls > 0 ? Math.round((achievedCallsCount / totalCalls) * 100) : 0;

    // 4. Calls grouped by Scenario Type
    const scenarioAgg = await CallLog.aggregate([
      {
        $lookup: {
          from: 'agents',
          localField: 'agentId',
          foreignField: '_id',
          as: 'agentDetails'
        }
      },
      { $unwind: '$agentDetails' },
      {
        $group: {
          _id: '$agentDetails.scenarioType',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      }
    ]);

    // Ensure all 4 standard scenarios are represented in the results, even if value is 0
    const standardScenarios = [
      'Lead Qualification',
      'Appointment Reminder',
      'Feedback Collection',
      'Information Gathering'
    ];
    
    const callsByScenarioType = standardScenarios.map(sc => {
      const match = scenarioAgg.find(item => item.name === sc);
      return { name: sc, value: match ? match.value : 0 };
    });

    // 5. Calls over time (Last 7 days volume counts)
    const callsOverTime = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const label = targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const count = await CallLog.countDocuments({
        startTime: { $gte: startOfDay, $lte: endOfDay }
      });

      callsOverTime.push({ date: label, count });
    }

    // 6. Top Performing Agent (most achieved outcomes)
    const topAgentAgg = await CallLog.aggregate([
      { $match: { outcome: 'achieved' } },
      {
        $group: {
          _id: '$agentId',
          achievedCount: { $sum: 1 }
        }
      },
      { $sort: { achievedCount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'agents',
          localField: '_id',
          foreignField: '_id',
          as: 'agentDetails'
        }
      },
      { $unwind: { path: '$agentDetails', preserveNullAndEmptyArrays: true } }
    ]);

    const topPerformingAgent = topAgentAgg.length > 0 && topAgentAgg[0].agentDetails
      ? { name: topAgentAgg[0].agentDetails.name, count: topAgentAgg[0].achievedCount }
      : { name: 'None Deployed', count: 0 };

    // 7. Goal achievement count per Agent (for Bar Chart)
    const agentGoalsAgg = await CallLog.aggregate([
      {
        $group: {
          _id: '$agentId',
          total: { $sum: 1 },
          achieved: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'achieved'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'agents',
          localField: '_id',
          foreignField: '_id',
          as: 'agentDetails'
        }
      },
      { $unwind: { path: '$agentDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$agentDetails.name',
          total: 1,
          achieved: 1,
          _id: 0
        }
      },
      { $match: { name: { $ne: null } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCalls,
          totalAgents,
          avgCallDuration,
          goalAchievementRate,
          topPerformingAgent
        },
        callsByScenarioType,
        callsOverTime,
        agentPerformance: agentGoalsAgg
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
