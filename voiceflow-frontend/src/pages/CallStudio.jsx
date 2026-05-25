import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Phone, 
  PhoneOff, 
  AlertCircle, 
  Clock, 
  User, 
  HelpCircle,
  Volume2,
  CheckCircle2
} from 'lucide-react'
import useSpeechRecognition from '../hooks/useSpeechRecognition'
import useSpeechSynthesis from '../hooks/useSpeechSynthesis'
import MicButton from '../components/MicButton'
import VoiceWaveform from '../components/VoiceWaveform'
import { toast } from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CallStudio({ agents = [], onAddLog }) {
  // Agent Selection
  const [selectedAgentId, setSelectedAgentId] = useState('')

  // Session Control States
  const [isCalling, setIsCalling] = useState(false)
  const [callStatus, setCallStatus] = useState('idle') // idle, connecting, listening, processing, speaking
  const [callSeconds, setCallSeconds] = useState(0)
  const [transcripts, setTranscripts] = useState([])
  const [goalAchieved, setGoalAchieved] = useState(false)
  const [keyboardInput, setKeyboardInput] = useState('')

  const timerRef = useRef(null)
  const transcriptsEndRef = useRef(null)
  const transcriptsContainerRef = useRef(null)
  
  // Reference to track MongoDB Call Log ID
  const currentCallIdRef = useRef(null)
  
  const stateRef = useRef({ isCalling: false, callSeconds: 0, transcripts: [] })
  const silenceTimerRef = useRef(null)

  // Synchronize state ref for event handlers
  useEffect(() => {
    stateRef.current = { isCalling, callSeconds, transcripts }
  }, [isCalling, callSeconds, transcripts])


  // Get active agent configuration
  const rawAgent = agents.find(a => (a._id || a.id) === selectedAgentId) || agents[0]
  
  // Normalize agent fields between backend schema and legacy mocks
  const activeAgent = rawAgent ? {
    id: rawAgent._id || rawAgent.id,
    name: rawAgent.name,
    scenario: rawAgent.scenarioType || rawAgent.scenario || 'Custom Scenario',
    prompt: rawAgent.systemPrompt || rawAgent.prompt || '',
    voice: rawAgent.voiceType || rawAgent.voice || 'default',
    rate: rawAgent.rate || 1.0,
    pitch: rawAgent.pitch || 1.0,
    language: rawAgent.language || 'en-US'
  } : null

  // Custom Speech Hooks
  const {
    transcript: sttText,
    interimTranscript: sttInterimText,
    isListening,
    supported: sttSupported,
    error: sttError,
    start: startListening,
    stop: stopListening,
    resetTranscript: resetSTT
  } = useSpeechRecognition()

  const {
    speak: playTTS,
    stop: stopTTS,
    isSpeaking,
    availableVoices
  } = useSpeechSynthesis()

  // Watch for speech errors to fire Toast notifications
  useEffect(() => {
    if (sttError) {
      toast.error(sttError)
    }
  }, [sttError])

  // Select first agent on mount
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0]._id || agents[0].id)
    }
  }, [agents, selectedAgentId])

  // Scroll transcripts container
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts, sttText, sttInterimText])

  // Timer control
  const startCallTimer = () => {
    setCallSeconds(0)
    timerRef.current = setInterval(() => {
      setCallSeconds(prev => prev + 1)
    }, 1000)
  }

  const stopCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // --- Calling Loop Mechanics ---

  // 1. Dial Call (Initiation)
  const startCall = async () => {
    if (isCalling || !activeAgent) return
    setIsCalling(true)
    setTranscripts([])
    setGoalAchieved(false)
    resetSTT()
    startCallTimer()
    
    setCallStatus('connecting')

    // Create session in backend Mongoose CallLog DB
    try {
      const response = await fetch(`${API_BASE}/api/calls/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId: activeAgent.id })
      })
      const json = await response.json()
      if (response.ok && json.success) {
        currentCallIdRef.current = json.callId
      }
    } catch (err) {
      console.error('Failed to log call start in database:', err)
    }
    
    // Speak first AI greeting
    setTimeout(() => {
      const greeting = `Hello! This is ${activeAgent.name}. I am online and operating under instructions: "${activeAgent.scenario}". How may I help you?`
      appendMessage('ai', greeting, 'greeting')
      
      setCallStatus('speaking')
      playTTS(greeting, {
        voiceName: activeAgent.voice,
        rate: activeAgent.rate,
        pitch: activeAgent.pitch
      })
    }, 1000)
  }

  // 2. Handshake: AI completed speaking -> Trigger User listening loop
  useEffect(() => {
    if (isCalling && callStatus === 'speaking' && !isSpeaking && !goalAchieved) {
      // Clear previous inputs
      resetSTT()
      
      // Turn on microphone
      setCallStatus('listening')
      const targetLang = activeAgent.language || 'en-US'
      startListening(targetLang)
    }
  }, [isSpeaking, isCalling, callStatus, goalAchieved])

  // 3. User stopped speaking -> Trigger AI responder
  useEffect(() => {
    // When isListening transitions from true to false while call is active
    if (isCalling && callStatus === 'listening' && !isListening) {
      // If speech recognition is unsupported or has errored, pause auto-listening loop
      if (!sttSupported || sttError) {
        console.warn('Speech recognition is not supported or encountered an error, pausing auto-listening.')
        return
      }

      // If we have finalized user speech
      if (sttText.trim()) {
        const finalizedSpeech = sttText.trim()
        appendMessage('user', finalizedSpeech)
        resetSTT()
        
        setCallStatus('processing')
        triggerAIResponder(finalizedSpeech)
      } else {
        // If they stopped speaking but captured nothing, cycle back to listening
        const targetLang = activeAgent.language || 'en-US'
        startListening(targetLang)
      }
    }
  }, [isListening, isCalling, callStatus, sttText, sttSupported, sttError])

  // Auto-submit user speech after 1.5 seconds of silence (no new speech input)
  useEffect(() => {
    if (isCalling && callStatus === 'listening') {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }

      if (sttText.trim() && !sttInterimText) {
        silenceTimerRef.current = setTimeout(() => {
          const finalizedSpeech = sttText.trim()
          appendMessage('user', finalizedSpeech)
          resetSTT()
          stopListening()
          setCallStatus('processing')
          triggerAIResponder(finalizedSpeech)
        }, 1500)
      }
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [sttText, sttInterimText, isCalling, callStatus])

  // 4. Calls Backend Conversation Engine respond API
  const triggerAIResponder = async (userText) => {
    setCallStatus('processing')
    try {
      const response = await fetch(`${API_BASE}/api/conversation/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: activeAgent.id,
          conversationHistory: stateRef.current.transcripts,
          userMessage: userText
        })
      })

      const json = await response.json()
      if (response.ok && json.success) {
        const { reply, intent, goalAchieved: isGoalMet } = json
        
        appendMessage('ai', reply, intent)
        setCallStatus('speaking')
        
        playTTS(reply, {
          voiceName: activeAgent.voice,
          rate: activeAgent.rate,
          pitch: activeAgent.pitch
        })

        if (isGoalMet) {
          setGoalAchieved(true)
          // Automatically disconnect call after short reading gap
          setTimeout(() => {
            endCall('Completed')
          }, 5500)
        }
      } else {
        throw new Error(json.error || 'Failed to query conversation logic')
      }

    } catch (err) {
      console.error('API responder connection failure:', err)
      const errorMsgText = "I encountered an API latency warning. Can you please state that once more?"
      appendMessage('ai', errorMsgText, 'error')
      setCallStatus('speaking')
      playTTS(errorMsgText, {
        voiceName: activeAgent.voice,
        rate: activeAgent.rate,
        pitch: activeAgent.pitch
      })
    }
  }

  const handleKeyboardSubmit = (e) => {
    e.preventDefault()
    const text = keyboardInput.trim()
    if (!text) return
    
    setKeyboardInput('')
    
    // Stop listening if speech recognition is active to prevent conflicts
    if (isListening) {
      stopListening()
    }
    
    appendMessage('user', text)
    setCallStatus('processing')
    triggerAIResponder(text)
  }

  // 5. Terminate Session
  const endCall = async (forceOutcome = 'Interrupted') => {
    if (!stateRef.current.isCalling) return
    setIsCalling(false)
    setCallStatus('idle')
    stopCallTimer()
    
    stopListening()
    stopTTS()

    // Determine final outcome mapped to DB schema enums: achieved, not-achieved, abandoned
    let finalOutcome = 'not-achieved'
    if (goalAchieved) {
      finalOutcome = 'achieved'
    } else if (stateRef.current.callSeconds <= 5) {
      finalOutcome = 'abandoned'
    } else if (forceOutcome === 'Failed') {
      finalOutcome = 'abandoned'
    }

    // Save end metrics in Mongoose CallLog DB
    if (currentCallIdRef.current) {
      try {
        await fetch(`${API_BASE}/api/calls/${currentCallIdRef.current}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            outcome: finalOutcome,
            duration: stateRef.current.callSeconds
          })
        })
      } catch (err) {
        console.error('Failed to log call end in database:', err)
      }
      
      currentCallIdRef.current = null
    }

    // Notify parent to fetch/refresh logs
    if (onAddLog) {
      onAddLog()
    }
    resetSTT()
  }

  const appendMessage = async (sender, text, intent = '') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    // Add to local state list immediately
    setTranscripts(prev => [
      ...prev,
      { sender, text, timestamp, intent }
    ])

    // Save message bubble details to current call log session in backend
    if (currentCallIdRef.current) {
      try {
        await fetch(`${API_BASE}/api/calls/${currentCallIdRef.current}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: sender === 'user' ? 'user' : 'ai',
            message: text
          })
        })
      } catch (err) {
        console.error('Failed to append transcript to database call:', err)
      }
    }
  }

  // Handle Manual Mic Click Toggle (Mute/Resume)
  const handleMicToggle = () => {
    if (!isCalling) return
    if (callStatus === 'listening') {
      stopListening()
      setCallStatus('processing') // put in processing state while muted
    } else if (callStatus === 'processing') {
      resetSTT()
      setCallStatus('listening')
      startListening(activeAgent.language || 'en-US')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left panel: Agent Details */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        
        {/* Selector card */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center">
            <User className="h-4.5 w-4.5 mr-1.5 text-brand-400" />
            Select Call Agent
          </h2>
          
          {agents.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                You haven't created any voice agents yet. Create one to begin.
              </p>
              <Link 
                to="/agents/new"
                className="w-full text-center bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs py-2 rounded-lg block transition-colors"
              >
                Go Create Agent
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Profile</label>
              <select
                value={selectedAgentId}
                disabled={isCalling}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 focus:outline-none focus:border-brand-500 text-slate-200 disabled:opacity-50"
              >
                {agents.map(a => (
                  <option key={a._id || a.id} value={a._id || a.id}>
                    {a.name} ({a.scenarioType || a.scenario})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selected Agent settings info */}
        {activeAgent && (
          <div className="glass-card rounded-2xl p-5 flex-1 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Agent Configuration</h3>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-slate-500 font-semibold">Objective System Instructions</span>
                <p className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg text-slate-350 leading-relaxed font-mono max-h-[140px] overflow-y-auto custom-scrollbar">
                  {activeAgent.prompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-[9px] uppercase text-slate-500 block mb-0.5">Voice Profile</span>
                  <span className="font-semibold text-slate-300 truncate block" title={activeAgent.voice}>
                    {activeAgent.voice.split('(')[0] || 'System Voice'}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-[9px] uppercase text-slate-500 block mb-0.5">Speed Rate</span>
                  <span className="font-semibold text-slate-300 block">{activeAgent.rate}x</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-850 text-[10px] text-slate-500 space-y-2">
              <div className="flex items-center space-x-1.5">
                <span className={`h-2 w-2 rounded-full ${sttSupported ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span>Web Speech STT: {sttSupported ? 'Supported' : 'Unsupported'}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={`h-2 w-2 rounded-full ${availableVoices.length > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span>Voice Profiles Loaded: {availableVoices.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: Dialer and Transcripts */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        
        {/* Browser Warning Alerts */}
        {!sttSupported && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3 text-amber-400 text-xs">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Browser Compatibility Warning</p>
              <p className="mt-0.5 leading-relaxed text-slate-400">
                Web Speech recognition is unsupported in your current browser. Please launch this console using Google Chrome or Microsoft Edge to run voice dialogue simulations.
              </p>
            </div>
          </div>
        )}

        {sttError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start space-x-3 text-rose-450 text-xs animate-pulse">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Microphone Permission Denied</p>
              <p className="mt-0.5 leading-relaxed text-slate-450">
                {sttError}
              </p>
            </div>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col min-h-[460px]">
          
          {/* Header status bar */}
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                callStatus === 'listening' ? 'bg-rose-500 animate-ping' :
                callStatus === 'speaking' ? 'bg-amber-400 animate-pulse' :
                callStatus === 'processing' ? 'bg-indigo-500 animate-pulse' :
                callStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-slate-600'
              }`}></span>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                {callStatus === 'idle' && 'Console Off'}
                {callStatus === 'connecting' && 'Opening Connection...'}
                {callStatus === 'listening' && 'Listening (Speak now)'}
                {callStatus === 'processing' && 'AI Thinking...'}
                {callStatus === 'speaking' && 'AI Speaking...'}
              </span>
            </div>

            {isCalling && (
              <div className="flex items-center space-x-2.5 bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-brand-400" />
                <span className="font-mono text-xs text-white font-bold">{formatTimer(callSeconds)}</span>
              </div>
            )}
          </div>

          {/* Virtual display call flow transcript */}
          <div 
            ref={transcriptsContainerRef}
            className="flex-1 my-4 bg-slate-950/70 border border-slate-850 rounded-xl p-5 overflow-y-auto space-y-3 custom-scrollbar max-h-[280px]"
          >
            {/* Goal Achieved Banner */}
            {goalAchieved && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-3 text-emerald-400 text-xs flex items-center space-x-2 animate-bounce">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                <span className="font-bold flex-1">🎯 Goal Achieved successfully! Wrapping up call.</span>
              </div>
            )}

            {transcripts.length === 0 && !sttText && !sttInterimText ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                <Volume2 className="h-10 w-10 opacity-30 text-brand-400 animate-pulse-slow" />
                <p className="text-xs font-semibold">Ready to connect calling session</p>
                <p className="text-[10px] text-slate-600">Select an agent and press Start Call to engage speech simulator.</p>
              </div>
            ) : (
              <>
                {/* Past Messages */}
                {transcripts.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col max-w-[85%] rounded-xl p-3 ${
                      msg.sender === 'user' 
                        ? 'bg-slate-900 border border-slate-800 ml-auto' 
                        : msg.sender === 'ai' 
                          ? 'bg-brand-950/50 border border-brand-900 text-slate-200' 
                          : 'bg-slate-950 text-slate-500 border border-transparent text-center mx-auto italic text-[11px]'
                    }`}
                  >
                    <p className="text-xs leading-relaxed">{msg.text}</p>
                    
                    <div className="flex items-center justify-between mt-1 border-t border-slate-805/40 pt-1 space-x-2">
                      {msg.intent && (
                        <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/30">
                          {msg.intent}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-600 ml-auto">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}

                {/* Active user typing speech transcription bubble */}
                {(sttText || sttInterimText) && callStatus === 'listening' && (
                  <div className="flex flex-col max-w-[85%] rounded-xl p-3 bg-slate-900 border border-slate-855 ml-auto shadow-md">
                    <p className="text-xs leading-relaxed text-slate-200">
                      {sttText}
                      <span className="text-slate-500 italic"> {sttInterimText}</span>
                    </p>
                    <span className="text-[9px] text-slate-600 mt-1 block text-right">Drafting...</span>
                  </div>
                )}
              </>
            )}
            <div ref={transcriptsEndRef} />
          </div>

          {/* Keyboard input fallback when listening */}
          {isCalling && callStatus === 'listening' && (
            <form 
              onSubmit={handleKeyboardSubmit}
              className="flex items-center space-x-2.5 pb-3 border-b border-slate-900 w-full animate-fadeIn"
            >
              <input
                type="text"
                placeholder={!sttSupported || sttError ? "Type your response here..." : "Type response here (or speak)..."}
                value={keyboardInput}
                onChange={(e) => setKeyboardInput(e.target.value)}
                className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-500 text-slate-200"
                autoFocus
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-brand-600/10 active:scale-[0.98]"
              >
                Send
              </button>
            </form>
          )}

          {/* Waveform and Controls section */}
          <div className="border-t border-slate-850 pt-4 flex flex-col items-center space-y-4">
            
            {/* Audio Waveform */}
            <VoiceWaveform isActive={isCalling && (callStatus === 'listening' || callStatus === 'speaking')} />

            {/* Calling control center */}
            <div className="flex items-center space-x-6">
              
              {/* Dialer Button */}
              {!isCalling ? (
                <button
                  onClick={startCall}
                  disabled={!activeAgent}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="h-4.5 w-4.5" />
                  <span>Start Live Session</span>
                </button>
              ) : (
                <>
                  {/* Toggle Listening controls (mute) */}
                  <MicButton 
                    isListening={callStatus === 'listening'} 
                    onClick={handleMicToggle} 
                  />

                  {/* Red Hangup button */}
                  <button
                    onClick={() => endCall('Completed')}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                  >
                    <PhoneOff className="h-4.5 w-4.5" />
                    <span>Hang Up (Save Session)</span>
                  </button>
                </>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
