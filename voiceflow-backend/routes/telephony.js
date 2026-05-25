const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const CallLog = require('../models/CallLog');
const conversationRouter = require('./conversation');
const { formatMessagesForClaude, runLocalFallbackEngine } = conversationRouter;

// Helper to determine Claude or local fallback response
const getAIResponse = async (agent, conversationHistory, userMessage) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return runLocalFallbackEngine(agent, conversationHistory, userMessage);
  }

  const systemPrompt = `You are a voice calling agent. Here are your configurations:
- Agent Name: ${agent.name}
- Scenario Category: ${agent.scenarioType}
- Core Goal: ${agent.goal}
- System Instructions: ${agent.systemPrompt}

You MUST analyze the user's latest statement and respond ONLY with a raw JSON object. Do not include markdown code block syntax (like \`\`\`json). Just return the raw JSON string.
The JSON object must have exactly these keys:
- reply: (string) your conversational reply to the user. Keep it brief (1 to 2 sentences max) for voice flow.
- intent: (string) classify the user's latest statement as one of: greeting, objection, agreement, question, goodbye.
- goalAchieved: (boolean) set to true ONLY if you have successfully met your core goal: "${agent.goal}" based on their statements. Otherwise set to false.`;

  const formattedMessages = formatMessagesForClaude(conversationHistory, userMessage);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 600,
        temperature: 0.2,
        system: systemPrompt,
        messages: formattedMessages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Anthropic API error: ${response.status}`);
    }

    const rawText = data.content?.[0]?.text || '';
    try {
      const jsonResult = JSON.parse(rawText.trim());
      return {
        reply: jsonResult.reply || 'Sorry, can you repeat that?',
        intent: jsonResult.intent || 'question',
        goalAchieved: !!jsonResult.goalAchieved
      };
    } catch (parseErr) {
      console.warn('Failed to parse Claude output as JSON:', rawText);
      return runLocalFallbackEngine(agent, conversationHistory, userMessage);
    }
  } catch (apiErr) {
    console.error('Claude API call failed, booting local fallback:', apiErr.message);
    return runLocalFallbackEngine(agent, conversationHistory, userMessage);
  }
};

// @route   POST /api/telephony/incoming
// @desc    Handle incoming call from Twilio, initialize session and greeting
router.post('/incoming', async (req, res) => {
  try {
    let agent = null;
    const { agentId } = req.query;

    if (agentId) {
      agent = await Agent.findById(agentId);
    } else {
      agent = await Agent.findOne({ isActive: true }) || await Agent.findOne();
    }

    res.type('text/xml');

    if (!agent) {
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">We are sorry, but no automated voice agents are currently deployed in the system console. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }

    // 1. Initialize Mongoose Call Log session
    const newCall = new CallLog({
      agentId: agent._id,
      startTime: new Date(),
      outcome: 'not-achieved',
      transcript: []
    });

    // 2. Generate initial greeting
    const greeting = `Hello! This is ${agent.name}. I am online and operating under instructions: "${agent.scenarioType || 'Custom Scenario'}". How may I help you?`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    newCall.transcript.push({
      role: 'ai',
      message: greeting,
      timestamp: timestampStr
    });

    const savedCall = await newCall.save();

    // 3. Respond with TwiML
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">${greeting}</Say>
  <Gather input="speech" action="/api/telephony/gather?callId=${savedCall._id}&amp;agentId=${agent._id}" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
</Response>`);

  } catch (err) {
    console.error('Error handling incoming call:', err);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">A system latency exception occurred on the connection server. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }
});

// @route   POST /api/telephony/gather
// @desc    Handle gathered Speech transcription from Twilio and fetch next response
router.post('/gather', async (req, res) => {
  try {
    const { callId, agentId } = req.query;
    const { SpeechResult } = req.body;

    res.type('text/xml');

    if (!callId || !agentId) {
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">Internal routing parameters are missing. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }

    const agent = await Agent.findById(agentId);
    const callLog = await CallLog.findById(callId);

    if (!agent || !callLog) {
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">Active calling profiles were not found in the database. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }

    // Check if Twilio captured user speech
    if (!SpeechResult || !SpeechResult.trim()) {
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">I am sorry, but I didn't hear you speak. Could you please repeat that?</Say>
  <Gather input="speech" action="/api/telephony/gather?callId=${callLog._id}&amp;agentId=${agent._id}" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
</Response>`);
    }

    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const elapsedSeconds = Math.round((new Date() - callLog.startTime) / 1000);

    // 1. Log User Speech to transcript
    callLog.transcript.push({
      role: 'user',
      message: SpeechResult.trim(),
      timestamp: timestampStr
    });

    // Format transcripts array to match format expected by conversation engine
    const formattedHistory = callLog.transcript.map(t => ({
      sender: t.role === 'user' ? 'user' : 'ai',
      text: t.message
    }));

    // 2. Fetch AI response from LLM / Fallback Engine
    const { reply, intent, goalAchieved } = await getAIResponse(agent, formattedHistory, SpeechResult.trim());

    // 3. Log AI reply to transcript
    callLog.transcript.push({
      role: 'ai',
      message: reply,
      timestamp: timestampStr
    });

    // 4. Update Database Call Log
    callLog.duration = elapsedSeconds;
    if (goalAchieved) {
      callLog.outcome = 'achieved';
      callLog.endTime = new Date();
    } else if (elapsedSeconds <= 5) {
      callLog.outcome = 'abandoned';
    } else {
      callLog.outcome = 'not-achieved';
    }

    await callLog.save();

    // 5. Build TwiML reply
    if (goalAchieved) {
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">${reply}</Say>
  <Hangup/>
</Response>`);
    } else {
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">${reply}</Say>
  <Gather input="speech" action="/api/telephony/gather?callId=${callLog._id}&amp;agentId=${agent._id}" method="POST" speechTimeout="auto" language="en-US">
  </Gather>
</Response>`);
    }

  } catch (err) {
    console.error('Error in gather webhook:', err);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joey" language="en-US">We experienced a call connection timeout. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }
});

module.exports = router;
