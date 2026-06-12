/** @module Sidebar */
import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  UserPlus, 
  PhoneCall, 
  FileText, 
  Mic, 
  Database, 
  Server,
  X
} from 'lucide-react'

export default function Sidebar({ backendStatus, dbStatus, isOpen, onClose }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/agents/new', label: 'Create Agent', icon: UserPlus },
    { to: '/studio', label: 'Call Studio', icon: PhoneCall },
    { to: '/logs', label: 'Call Logs', icon: FileText }
  ]

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        ></div>
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-brand-500 blur opacity-45 animate-pulse"></div>
              <div className="relative bg-brand-600 p-2 rounded-lg">
                <Mic className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center">
                VoiceFlow <span className="text-brand-400 font-light ml-1 text-xs">AI</span>
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Console</p>
            </div>
          </div>

          {/* Close Sidebar button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose} // Auto-close drawer on link click
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* System connection Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 border border-slate-850 p-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <Server className={`h-3.5 w-3.5 ${backendStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>API Server</span>
            </div>
            <span className={`font-bold capitalize ${backendStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`}>
              {backendStatus === 'connected' ? 'online' : 'offline'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 border border-slate-850 p-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <Database className={`h-3.5 w-3.5 ${dbStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>MongoDB</span>
            </div>
            <span className={`font-bold capitalize ${dbStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`}>
              {dbStatus === 'connected' ? 'ready' : 'offline'}
            </span>
          </div>
        </div>

      </aside>
    </>
  )
}
