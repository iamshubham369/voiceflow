/** @module conversation */
const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

// Helper to sanitize and format conversation history for Anthropic API
// Ensures roles alternate strictly: user, assistant, user, assistant...
const formatMessagesForClaude = (history, newMessage) => {
  const messages = [];
  let lastRole = null;

  history.forEach(msg => {
    // Map sender to role
    const role = msg.sender === 'user' ? 'user' : 'assistant';
    const content = msg.text || '';

    if (!content.trim()) return;

    if (role === lastRole) {
      // Squash consecutive identical roles
      messages[messages.length - 1].content += '\n' + content;
    } else {
      messages.push({ role, content });
      lastRole = role;
    }
  });

  // Append new user message
  if (lastRole === 'user') {
    messages[messages.length - 1].content += '\n' + newMessage;
  } else {
    messages.push({ role: 'user', content: newMessage });
  }

  return messages;
};

// Local keyword-based fallback engine when Anthropic key is missing or fails
const runLocalFallbackEngine = (agent, history, userMessage) => {
  const query = userMessage.toLowerCase().trim();
  let reply = "";
  let intent = "question";
  let goalAchieved = false;

  // 1. Detect Intent
  if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    intent = 'greeting';
    reply = `Hello! How can I help you today? I am looking to satisfy our agent objective: "${agent.goal}".`;
  } else if (query.includes('bye') || query.includes('goodbye') || query.includes('hang up') || query.includes('exit')) {
    intent = 'goodbye';
    reply = `Thank you for your time. Have a wonderful day. Goodbye!`;
  } else if (
    query.includes('yes') || 
    query.includes('sure') || 
    query.includes('agree') || 
    query.includes('ok') || 
    query.includes('schedule') || 
    query.includes('book') || 
    query.includes('confirm')
  ) {
    intent = 'agreement';
    reply = `Perfect. I have recorded your confirmation. Let's lock this in.`;
  } else if (
    query.includes('no') || 
    query.includes('can\'t') || 
    query.includes('busy') || 
    query.includes('disagree') || 
    query.includes('refuse')
  ) {
    intent = 'objection';
    reply = `I understand your objection. To make this work, is there any compromise or alternative time?`;
  } else {
    intent = 'question';
    reply = `I hear you. To make progress towards our goal of "${agent.goal}", what other details can you share?`;
  }

  // 2. Assess Goal Achievement
  const turnCount = history.filter(h => h.sender === 'user').length + 1; // current turn count

  if (agent.scenarioType === 'Lead Qualification') {
    // Achieved if they agree to a meeting or suggest scheduling
    if (intent === 'agreement' || query.includes('meeting') || query.includes('schedule')) {
      goalAchieved = true;
      reply = `Outstanding! I have qualified your parameters and registered our discovery call. Talk to you soon!`;
    }
  } else if (agent.scenarioType === 'Appointment Reminder') {
    // Achieved if they confirm the appointment
    if (intent === 'agreement' || query.includes('confirm') || query.includes('lock')) {
      goalAchieved = true;
      reply = `Perfect! Your appointment details are officially confirmed. We look forward to seeing you. Goodbye!`;
    }
  } else if (agent.scenarioType === 'Feedback Collection') {
    // Achieved if they give feedback across multiple turns
    if (turnCount >= 3) {
      goalAchieved = true;
      reply = `Thank you so much for answering our feedback questions! Your input is invaluable. Goodbye!`;
    } else {
      reply = `I appreciate your answer. Next, could you tell me what feature you use most frequently?`;
    }
  } else if (agent.scenarioType === 'Information Gathering') {
    // Achieved if they answer details across multiple turns
    if (turnCount >= 3) {
      goalAchieved = true;
      reply = `Thank you. I have collected all the necessary database fields. Have a great day!`;
    } else {
      reply = `Got it. Secondly, what is the best email contact to reach your team?`;
    }
  }

  return { reply, intent, goalAchieved };
};

// @route   POST /api/conversation/respond
// @desc    Determine AI response, intent, and goal achievement status
router.post('/respond', async (req, res) => {
  try {
    const { agentId, conversationHistory = [], userMessage } = req.body;

    if (!agentId || !userMessage) {
      return res.status(400).json({ success: false, error: 'agentId and userMessage are required fields' });
    }

    // 1. Fetch Agent configurations
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent profile not found' });
    }

    // 2. Check Anthropic API Key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Execute local keyword engine directly
      const result = runLocalFallbackEngine(agent, conversationHistory, userMessage);
      return res.status(200).json({ success: true, ...result, source: 'fallback' });
    }

    // 3. Prepare System Instructions
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

    // 4. Format Alternating Message History
    const formattedMessages = formatMessagesForClaude(conversationHistory, userMessage);

    // 5. Call Anthropic API using native fetch
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

      // 6. Parse Claude's output
      const rawText = data.content?.[0]?.text || '';
      try {
        const jsonResult = JSON.parse(rawText.trim());
        return res.status(200).json({
          success: true,
          reply: jsonResult.reply || 'Sorry, can you repeat that?',
          intent: jsonResult.intent || 'question',
          goalAchieved: !!jsonResult.goalAchieved,
          source: 'claude'
        });
      } catch (parseErr) {
        console.warn('Failed to parse Claude output as JSON:', rawText);
        // If JSON parsing fails, execute fallback to guarantee a valid response payload
        const result = runLocalFallbackEngine(agent, conversationHistory, userMessage);
        return res.status(200).json({ success: true, ...result, source: 'fallback_parse_error' });
      }

    } catch (apiErr) {
      console.error('Claude API call failed, booting local fallback:', apiErr.message);
      const result = runLocalFallbackEngine(agent, conversationHistory, userMessage);
      return res.status(200).json({ success: true, ...result, source: 'fallback_after_api_error' });
    }

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.formatMessagesForClaude = formatMessagesForClaude;
router.runLocalFallbackEngine = runLocalFallbackEngine;
module.exports = router;

