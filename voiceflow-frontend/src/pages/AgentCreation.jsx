/** @module AgentCreation */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, HelpCircle, User, BookOpen, Volume2, Target, FileText } from 'lucide-react'

const PROMPT_PLACEHOLDERS = {
  'Lead Qualification': 'You are a professional sales lead qualification agent for VoiceFlow AI. Your goal is to gather the caller\'s company size, current voice stack, timeline, and schedule a sales meeting. Be polite, direct, and conversational.',
  'Appointment Reminder': 'You are a receptionist assistant. Call patients to confirm their appointment details, verify their insurance changes, and answer standard rescheduling questions. Keep answers concise.',
  'Feedback Collection': 'You are David, gathering customer product feedback. Ask open-ended questions about their overall experience with the platform, take detailed notes, and thank them warmly.',
  'Information Gathering': 'You are a polling agent conducting a brief 3-question survey. Be courteous, gather quantitative ratings, and record any qualitative comments. Confirm their answers before concluding.'
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AgentCreation({ onAgentCreated }) {
  const navigate = useNavigate()
  
  // Form State
  const [name, setName] = useState('')
  const [voiceType, setVoiceType] = useState('female')
  const [scenarioType, setScenarioType] = useState('Lead Qualification')
  const [goal, setGoal] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Handle preset selector click
  const applyScenarioPreset = (scenario) => {
    setScenarioType(scenario)
    setSystemPrompt(PROMPT_PLACEHOLDERS[scenario] || '')
    
    // Auto populate goals based on selection
    if (scenario === 'Lead Qualification') {
      setGoal('Qualify business leads by gathering size, timeline, and booking a meeting.')
      setName('Sales Agent Jessica')
    } else if (scenario === 'Appointment Reminder') {
      setGoal('Confirm appointment times and verify billing changes.')
      setName('Receptionist Sarah')
    } else if (scenario === 'Feedback Collection') {
      setGoal('Collect qualitative product experiences from active subscribers.')
      setName('Researcher David')
    } else if (scenario === 'Information Gathering') {
      setGoal('Gather details on user technology integrations for surveys.')
      setName('Survey Agent Mark')
    }
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (!name || !goal || !systemPrompt) {
      setErrorMsg('Please complete all form fields.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          voiceType,
          scenarioType,
          goal,
          systemPrompt,
          isActive: true
        })
      })

      const json = await response.json()
      if (response.ok && json.success) {
        // Notify parent App component to refresh agent list
        if (onAgentCreated) {
          onAgentCreated(json.data)
        }
        navigate('/') // Redirect to Dashboard to view Agent Cards
      } else {
        setErrorMsg(json.errors ? json.errors.join(', ') : json.error || 'Failed to create agent')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Network error. Failed to reach the API server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Form Card */}
      <form onSubmit={handleSubmit} className="lg:col-span-8 glass-card rounded-2xl p-6 space-y-6">
        
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide uppercase">Deploy Call Agent</h2>
            <p className="text-[11px] text-slate-500 font-medium">Define LLM behaviors and configure system variables</p>
          </div>
          <Sparkles className="h-5 w-5 text-brand-400" />
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs flex items-center">
            <span className="font-bold mr-1.5">Error:</span> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Agent Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Agent Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="e.g., Support Agent Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-brand-500 text-slate-200"
                required
              />
            </div>
          </div>

          {/* Voice Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Voice Type</label>
            <div className="relative">
              <Volume2 className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
              <select
                value={voiceType}
                onChange={(e) => setVoiceType(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-brand-500 text-slate-200 appearance-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Scenario Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Scenario Type</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-brand-500 text-slate-200 appearance-none"
              >
                <option value="Lead Qualification">Lead Qualification</option>
                <option value="Appointment Reminder">Appointment Reminder</option>
                <option value="Feedback Collection">Feedback Collection</option>
                <option value="Information Gathering">Information Gathering</option>
              </select>
            </div>
          </div>

          {/* Goal/Objective */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Goal / Objective</label>
            <div className="relative">
              <Target className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="e.g., Capture company size and schedule a discovery meeting"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-brand-500 text-slate-200"
                required
              />
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-400">System Prompt</label>
            <span className="text-[10px] text-slate-500">LLM instruction templates</span>
          </div>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
            <textarea
              placeholder="Provide clear constraints: specify greeting, topic limitations, and speech length..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand-500 text-slate-200 font-mono"
              rows={6}
              required
            />
          </div>
        </div>

        {/* Submit Control */}
        <div className="border-t border-slate-800 pt-5 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Create calling agent'}
          </button>
        </div>

      </form>

      {/* Preset cards sidebar */}
      <div className="lg:col-span-4 space-y-4">
        
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4 flex items-center">
            <Sparkles className="h-4 w-4 mr-1.5 text-brand-400" />
            Presets & Templates
          </h3>
          
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Click any template scenario category below to auto-populate form configs.
          </p>

          <div className="space-y-2">
            {Object.keys(PROMPT_PLACEHOLDERS).map((scenario) => (
              <button
                key={scenario}
                type="button"
                onClick={() => applyScenarioPreset(scenario)}
                className="w-full text-left p-3 rounded-xl border border-slate-800 bg-slate-900/35 hover:bg-slate-900 hover:border-slate-700 transition-all flex flex-col group"
              >
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {scenario}
                </span>
                <span className="text-[9px] text-slate-500 mt-1 block leading-relaxed truncate w-full">
                  {PROMPT_PLACEHOLDERS[scenario]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-indigo-950/25 to-slate-900/40">
          <h4 className="text-xs font-bold text-slate-350 mb-2 flex items-center">
            <HelpCircle className="h-4 w-4 mr-1.5 text-indigo-400" />
            Objective Tips
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Configure clear goals so AI calling agents can audit metrics accurately. Specify exact questions the voice assistant should speak to gather survey inputs.
          </p>
        </div>

      </div>

    </div>
  )
}
