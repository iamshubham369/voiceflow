/** @module VoiceWaveform */
import React from 'react'

export default function VoiceWaveform({ isActive }) {
  // Height, delay, and custom duration settings for organic staggered audio visuals
  const bars = [
    { height: 'h-3', delay: '0.1s', duration: '0.95s' },
    { height: 'h-6', delay: '0.3s', duration: '0.75s' },
    { height: 'h-4', delay: '0.5s', duration: '0.85s' },
    { height: 'h-8', delay: '0.2s', duration: '0.65s' },
    { height: 'h-10', delay: '0.4s', duration: '0.7s' },
    { height: 'h-5', delay: '0.6s', duration: '0.9s' },
    { height: 'h-9', delay: '0.15s', duration: '0.6s' },
    { height: 'h-7', delay: '0.35s', duration: '0.8s' },
    { height: 'h-4', delay: '0.55s', duration: '0.75s' },
    { height: 'h-6', delay: '0.25s', duration: '0.85s' },
    { height: 'h-3', delay: '0.1s', duration: '0.95s' }
  ]

  return (
    <div className="flex items-center justify-center space-x-1.5 h-16 w-full">
      {bars.map((bar, index) => (
        <div
          key={index}
          style={{
            animationDelay: isActive ? bar.delay : '0s',
            animationDuration: isActive ? bar.duration : '0.9s',
            transformOrigin: 'center'
          }}
          className={`w-[3.5px] rounded-full transition-all duration-500 bg-gradient-to-t from-brand-600 via-indigo-400 to-cyan-400 ${
            isActive 
              ? `${bar.height} animate-waveform-bounce` 
              : 'h-1.5 bg-slate-800'
          }`}
        />
      ))}
    </div>
  )
}
