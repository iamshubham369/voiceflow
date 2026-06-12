/** @module MicButton */
import React from 'react'
import { Mic, MicOff } from 'lucide-react'

export default function MicButton({ isListening, onClick, disabled = false }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Concentric pulsing background rings */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-md animate-pulse"></div>
          <div className="absolute -inset-3 rounded-full border border-rose-500/30 animate-ping opacity-60 pointer-events-none" style={{ animationDuration: '2s' }}></div>
          <div className="absolute -inset-6 rounded-full border border-rose-500/10 animate-ping opacity-30 pointer-events-none" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
        </>
      )}

      {/* Main button trigger */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative z-10 flex items-center justify-center p-6 rounded-full border transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
          isListening 
            ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-450 shadow-lg shadow-rose-600/30' 
            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700 shadow-md shadow-slate-950/50'
        }`}
        title={isListening ? 'Stop Listening' : 'Start Listening'}
      >
        {isListening ? (
          <Mic className="h-7 w-7 animate-pulse" />
        ) : (
          <MicOff className="h-7 w-7" />
        )}
      </button>
    </div>
  )
}
