/** @module TranscriptModal */
import React, { useEffect } from 'react'
import { X, Clock, HelpCircle, User, ShieldCheck } from 'lucide-react'

export default function TranscriptModal({ log, onClose }) {
  
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!log) return null

  const agentName = log.agentId?.name || log.agentName || 'Unknown Agent'
  const callDate = log.startTime ? new Date(log.startTime).toLocaleString() : log.date
  
  const formatOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'achieved':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'not-achieved':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'abandoned':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      default:
        if (outcome === 'Success' || outcome === 'Completed') {
          return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  const formatOutcomeLabel = (outcome) => {
    switch (outcome) {
      case 'achieved':
        return 'Goal Achieved'
      case 'not-achieved':
        return 'Not Achieved'
      case 'abandoned':
        return 'Abandoned'
      default:
        return outcome || 'Unknown'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      
      {/* Backdrop overlay closer */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Transcript: {agentName}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Session Date: {callDate}</p>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Call Info details */}
        <div className="bg-slate-950/40 p-4 border-b border-slate-800 flex justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1">
            <Clock className="h-3.5 w-3.5 text-brand-400" />
            <span>Duration: <strong className="text-slate-300 font-mono">{log.duration}s</strong></span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span>Outcome:</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${formatOutcomeBadge(log.outcome)}`}>
              {formatOutcomeLabel(log.outcome)}
            </span>
          </div>
        </div>

        {/* Scrollable Transcript logs */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 custom-scrollbar bg-slate-950/20">
          {(!log.transcript || log.transcript.length === 0) ? (
            <div className="py-8 text-center text-slate-500 italic text-xs flex flex-col items-center justify-center space-y-1">
              <HelpCircle className="h-8 w-8 text-slate-700 opacity-40" />
              <p>No dialogue recorded for this session.</p>
            </div>
          ) : (
            log.transcript.map((msg, i) => {
              const role = msg.role || msg.sender
              const text = msg.message || msg.text
              const isUser = role === 'user'
              const isAI = role === 'ai' || role === 'agent' || role === 'assistant'

              return (
                <div 
                  key={i} 
                  className={`flex flex-col max-w-[85%] rounded-xl p-3 ${
                    isUser 
                      ? 'bg-slate-900 border border-slate-805 ml-auto' 
                      : isAI 
                        ? 'bg-brand-950/40 border border-brand-900 text-slate-200' 
                        : 'bg-slate-950 text-slate-500 border border-transparent text-center mx-auto italic text-[10px] py-1'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {isUser ? (
                      <>
                        <User className="h-3 w-3 text-slate-400" />
                        <span>Caller</span>
                      </>
                    ) : isAI ? (
                      <>
                        <ShieldCheck className="h-3 w-3 text-brand-400" />
                        <span>{agentName}</span>
                      </>
                    ) : (
                      <span>System</span>
                    )}
                  </div>
                  
                  <p className="text-xs leading-relaxed">{text}</p>
                  <span className="text-[9px] text-slate-605 mt-1 block text-right">{msg.timestamp}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-355 text-xs font-semibold py-2 px-4 rounded-xl transition-colors"
          >
            Close Viewer
          </button>
        </div>

      </div>

    </div>
  )
}
