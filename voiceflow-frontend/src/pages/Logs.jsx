/** @module Logs */
import React, { useState } from 'react'
import { 
  Search, 
  Trash2, 
  FileText, 
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react'

// Pulsing Skeleton Row Component
function TableRowSkeleton() {
  return (
    <tr className="animate-pulse bg-slate-900/10">
      <td className="py-4 px-6"><div className="h-3.5 w-28 bg-slate-850 rounded"></div></td>
      <td className="py-4 px-6"><div className="h-3.5 w-36 bg-slate-850 rounded"></div></td>
      <td className="py-4 px-6"><div className="h-3.5 w-12 bg-slate-850 rounded"></div></td>
      <td className="py-4 px-6"><div className="h-5 w-20 bg-slate-850 rounded-md"></div></td>
      <td className="py-4 px-6 text-right flex justify-end space-x-2"><div className="h-7 w-20 bg-slate-850 rounded-lg"></div><div className="h-7 w-7 bg-slate-850 rounded-lg"></div></td>
    </tr>
  )
}

export default function Logs({ logs = [], onDeleteLog, onViewTranscript, loading = false }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter logs by search term
  const filteredLogs = logs.filter(log => {
    const agentName = log.agentId?.name || log.agentName || 'Unknown Agent'
    const outcome = log.outcome || ''
    const term = searchTerm.toLowerCase()
    
    return (
      agentName.toLowerCase().includes(term) ||
      outcome.toLowerCase().includes(term)
    )
  })

  const formatOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'achieved':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'not-achieved':
        return 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
      case 'abandoned':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase">Call History logs</h2>
          <p className="text-[11px] text-slate-500 font-medium">Search and audit conversations conducted by AI Voice agents</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Agent name or Outcome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-brand-500 text-slate-200"
          />
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
        
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <th className="py-4 px-6">Agent Profile</th>
                  <th className="py-4 px-6">Connection Time</th>
                  <th className="py-4 px-6">Call Duration</th>
                  <th className="py-4 px-6">Outcome</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/10">
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </tbody>
            </table>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2.5">
            <HelpCircle className="h-10 w-10 text-slate-650 opacity-40 animate-pulse-slow" />
            <p className="text-xs font-semibold">No call records found</p>
            <p className="text-[10px] text-slate-600">Simulate calling sessions in the Call Studio to generate history log files.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <th className="py-4 px-6">Agent Profile</th>
                  <th className="py-4 px-6">Connection Time</th>
                  <th className="py-4 px-6">Call Duration</th>
                  <th className="py-4 px-6">Outcome</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/10">
                {filteredLogs.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-slate-905/40 transition-colors">
                    
                    {/* Agent Name */}
                    <td className="py-4 px-6 font-bold text-slate-200">
                      {log.agentId?.name || log.agentName || 'Unknown Agent'}
                    </td>

                    {/* Connection Date */}
                    <td className="py-4 px-6 text-slate-400">
                      {log.startTime ? new Date(log.startTime).toLocaleString() : log.date}
                    </td>

                    {/* Duration */}
                    <td className="py-4 px-6 text-slate-400 font-mono">
                      {log.duration}s
                    </td>

                    {/* Status Outcome Badge */}
                    <td className="py-4 px-6">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${formatOutcomeBadge(log.outcome)}`}>
                        {formatOutcomeLabel(log.outcome)}
                      </span>
                    </td>

                    {/* Action links */}
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => onViewTranscript(log._id || log.id)}
                        className="inline-flex items-center space-x-1 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white border border-brand-500/20 hover:border-transparent py-1.5 px-3 rounded-lg font-semibold tracking-wide transition-all"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Transcript</span>
                      </button>

                      <button
                        onClick={() => onDeleteLog(log._id || log.id)}
                        className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-455 border border-transparent hover:border-rose-500/20 rounded-lg transition-all"
                        title="Delete log record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
