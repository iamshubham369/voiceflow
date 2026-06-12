/** @module Dashboard */
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts'
import { 
  Users, 
  PhoneCall, 
  Clock, 
  ShieldCheck, 
  TrendingUp, 
  Plus, 
  Play, 
  Award,
  Activity,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Volume2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || '';
const PIE_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981']

// Stat Loading Skeleton Component
function StatSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 animate-pulse flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-3 w-28 bg-slate-800 rounded"></div>
        <div className="h-6 w-16 bg-slate-800 rounded"></div>
      </div>
      <div className="w-11 h-11 bg-slate-800 rounded-xl"></div>
    </div>
  )
}

// Chart Loading Skeleton Component
function ChartSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 animate-pulse flex flex-col justify-between min-h-[300px]">
      <div className="h-4 w-40 bg-slate-800 rounded mb-4"></div>
      <div className="flex-1 w-full bg-slate-900/40 rounded flex items-center justify-center">
        <Activity className="h-7 w-7 text-slate-800 animate-spin" />
      </div>
    </div>
  )
}

export default function Dashboard({ agents = [], logs = [], onAgentUpdated, onAgentDeleted }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingAgent, setEditingAgent] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchAnalytics()
  }, [logs, agents])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/analytics/summary`)
      const json = await response.json()
      if (response.ok && json.success) {
        setData(json.data)
      } else {
        throw new Error('Summary fetch failed')
      }
    } catch (err) {
      console.warn('Analytics API query failed, generating metrics locally...', err)
      
      // Compute metrics locally if backend is online but analytics endpoint has errors
      if (logs.length > 0) {
        const total = logs.length
        const totalA = agents.length
        const duration = Math.round(logs.reduce((acc, l) => acc + (parseInt(l.duration) || 0), 0) / total)
        const achieved = logs.filter(l => l.outcome === 'achieved').length
        const rate = Math.round((achieved / total) * 100)

        // Scenario aggregation
        const scMap = {
          'Lead Qualification': 0,
          'Appointment Reminder': 0,
          'Feedback Collection': 0,
          'Information Gathering': 0
        }
        logs.forEach(l => {
          const sc = l.agentId?.scenarioType || 'Lead Qualification'
          if (scMap[sc] !== undefined) scMap[sc]++
        })
        const callsByScenario = Object.keys(scMap).map(k => ({ name: k, value: scMap[k] }))

        setData({
          summary: {
            totalCalls: total,
            totalAgents: totalA,
            avgCallDuration: duration,
            goalAchievementRate: rate,
            topPerformingAgent: { name: 'Local Tester', count: achieved }
          },
          callsByScenarioType: callsByScenario,
          callsOverTime: [
            { date: 'May 20', count: 2 },
            { date: 'May 21', count: 1 },
            { date: 'May 22', count: 3 },
            { date: 'May 23', count: total }
          ],
          agentPerformance: agents.map(a => {
            const agentLogs = logs.filter(l => (l.agentId?._id || l.agentId) === a._id)
            const count = agentLogs.length
            const ach = agentLogs.filter(l => l.outcome === 'achieved').length
            return { name: a.name, total: count, achieved: ach }
          }).filter(a => a.total > 0)
        })
      } else {
        setData({
          summary: { totalCalls: 0, totalAgents: agents.length, avgCallDuration: 0, goalAchievementRate: 0, topPerformingAgent: { name: 'None Deployed', count: 0 } },
          callsByScenarioType: [
            { name: 'Lead Qualification', value: 0 },
            { name: 'Appointment Reminder', value: 0 },
            { name: 'Feedback Collection', value: 0 },
            { name: 'Information Gathering', value: 0 }
          ],
          callsOverTime: [
            { date: 'Today', count: 0 }
          ],
          agentPerformance: []
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Toggle active status in database
  const handleToggleActive = async (agent) => {
    const toggleToast = toast.loading('Syncing state changes...')
    try {
      const response = await fetch(`${API_BASE}/api/agents/${agent._id || agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !agent.isActive })
      })
      const json = await response.json()
      if (response.ok && json.success) {
        onAgentUpdated(json.data)
        toast.dismiss(toggleToast)
      } else {
        throw new Error(json.error || 'Failed to update toggle')
      }
    } catch (err) {
      console.error(err)
      toast.dismiss(toggleToast)
      toast.error('Network error. Failed to toggle status.')
    }
  }

  // Delete agent from database
  const handleDeleteAgent = async (id) => {
    if (!confirm('Are you sure you want to delete this calling agent? This removes its configurations permanently.')) return
    
    const deleteToast = toast.loading('Deleting agent profile...')
    try {
      const response = await fetch(`${API_BASE}/api/agents/${id}`, { method: 'DELETE' })
      const json = await response.json()
      if (response.ok && json.success) {
        onAgentDeleted(id)
        toast.dismiss(deleteToast)
      } else {
        throw new Error(json.error || 'Delete failed')
      }
    } catch (err) {
      console.error(err)
      toast.dismiss(deleteToast)
      toast.error('Network error. Failed to delete agent.')
    }
  }

  // Submit edit form updates
  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setUpdating(true)
    const editToast = toast.loading('Saving profile changes...')

    try {
      const response = await fetch(`${API_BASE}/api/agents/${editingAgent._id || editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAgent.name,
          voiceType: editingAgent.voiceType,
          scenarioType: editingAgent.scenarioType,
          goal: editingAgent.goal,
          systemPrompt: editingAgent.systemPrompt
        })
      })

      const json = await response.json()
      if (response.ok && json.success) {
        onAgentUpdated(json.data)
        setEditingAgent(null)
        toast.dismiss(editToast)
      } else {
        setErrorMsg(json.error || 'Failed to update agent details')
        toast.dismiss(editToast)
        toast.error('Failed to update agent.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Network error. Failed to reach the API server.')
      toast.dismiss(editToast)
      toast.error('Network connection issue.')
    } finally {
      setUpdating(false)
    }
  }

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
        return 'Achieved'
      case 'not-achieved':
        return 'Not Achieved'
      case 'abandoned':
        return 'Abandoned'
      default:
        return outcome || 'Unknown'
    }
  }

  // Show Loading Skeletons
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-900 border border-slate-800 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-4">
            <ChartSkeleton />
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Calls',
      value: data.summary.totalCalls,
      icon: PhoneCall,
      color: 'text-brand-400 border-brand-500/20'
    },
    {
      label: 'Total Agents',
      value: data.summary.totalAgents,
      icon: Users,
      color: 'text-indigo-400 border-indigo-500/20'
    },
    {
      label: 'Avg Duration',
      value: `${data.summary.avgCallDuration}s`,
      icon: Clock,
      color: 'text-amber-400 border-amber-500/20'
    },
    {
      label: 'Goal Achievement Rate',
      value: `${data.summary.goalAchievementRate}%`,
      icon: ShieldCheck,
      color: 'text-emerald-400 border-emerald-500/20'
    }
  ]

  const recentLogs = [...logs].slice(0, 10)

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative space-y-2 max-w-xl">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            VoiceFlow AI Console
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Manage your AI calling agents, monitor call logs, toggle agent deployment states, and configure prompts dynamically.
          </p>
        </div>

        <div className="relative mt-4 md:mt-0 flex flex-wrap gap-3">
          <Link
            to="/agents/new"
            className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md shadow-brand-600/10 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Agent</span>
          </Link>
          <Link
            to="/studio"
            className="flex items-center space-x-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
          >
            <Play className="h-4 w-4 text-brand-400 animate-pulse" />
            <span>Call Studio</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <p className="text-2xl font-extrabold text-white tracking-tight">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl border bg-slate-950/60 ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Top Performing Agent banner */}
      {data.summary.topPerformingAgent && data.summary.topPerformingAgent.count > 0 && (
        <div className="glass-card rounded-2xl p-4 bg-gradient-to-r from-brand-950/30 to-indigo-950/10 border border-brand-500/10 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="bg-brand-500/10 border border-brand-500/20 p-2 rounded-xl text-brand-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Top Performing Agent Profile</p>
              <h4 className="text-xs font-bold text-white mt-0.5">{data.summary.topPerformingAgent.name}</h4>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Goals Achieved</span>
            <span className="text-sm font-extrabold text-brand-400 font-mono">{data.summary.topPerformingAgent.count} calls</span>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Line Chart */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[320px]">
          <div className="pb-3 border-b border-slate-800/80 mb-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Calls Volume (Last 7 Days)</h3>
          </div>
          
          <div className="flex-1 w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.callsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '10px' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[320px]">
          <div className="pb-3 border-b border-slate-800/80 mb-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Calls by Scenario Type</h3>
          </div>

          <div className="flex-1 w-full h-[180px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.callsByScenarioType}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.callsByScenarioType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mt-2">
            {data.callsByScenarioType.map((entry, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                <span className="truncate" title={entry.name}>{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        {data.agentPerformance && data.agentPerformance.length > 0 && (
          <div className="lg:col-span-12 glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[320px]">
            <div className="pb-3 border-b border-slate-800/80 mb-4">
              <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Goal Achievement per Deployed Agent</h3>
            </div>

            <div className="flex-1 w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.agentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="total" name="Total Calls" fill="#1e293b" stroke="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="achieved" name="Goals Achieved" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* Deployed Agent cards list */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Deployed Agents Cards</h3>
        
        {agents.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <Users className="h-10 w-10 text-slate-750 opacity-40 animate-pulse-slow" />
            <p className="text-xs font-semibold">No voice agents deployed</p>
            <p className="text-[10px] text-slate-600">Create a calling agent to start deploying call flows.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div 
                key={agent._id || agent.id} 
                className={`glass-card rounded-2xl p-5 flex flex-col justify-between border transition-all ${
                  agent.isActive 
                    ? 'border-slate-800/80 bg-slate-900/10' 
                    : 'border-slate-900 bg-slate-950/20 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-800/60">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{agent.name}</h4>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mt-1 block">
                        {agent.scenarioType}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(agent)}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors border ${
                        agent.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-950 text-slate-500 border-slate-900'
                      }`}
                      title={agent.isActive ? 'Deactivate Agent' : 'Activate Agent'}
                    >
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="py-4 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 font-semibold block">Voice Profile Type</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <Volume2 className="h-3.5 w-3.5 text-brand-400" />
                        <span className="capitalize text-slate-350">{agent.voiceType}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase text-slate-500 font-semibold block">Goal Objective</span>
                      <p className="text-slate-350 leading-relaxed line-clamp-2 mt-0.5">
                        {agent.goal}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between">
                  <span className="text-[9px] text-slate-600 font-mono">
                    ID: {(agent._id || agent.id).substring(0, 8)}...
                  </span>

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={() => setEditingAgent({ ...agent })}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700 transition-all"
                      title="Edit Agent details"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAgent(agent._id || agent.id)}
                      className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-450 border border-transparent hover:border-rose-500/20 transition-all"
                      title="Delete Agent profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Calls Table */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Recent Calls Audit (Last 10 sessions)</h3>
        </div>

        <div className="overflow-x-auto">
          {recentLogs.length === 0 ? (
            <div className="py-6 text-center text-slate-500 italic text-xs">
              No calling log sessions available. Launch Call Studio to run calls.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <th className="py-3.5 px-5">Agent Profile</th>
                  <th className="py-3.5 px-5">Scenario Type</th>
                  <th className="py-3.5 px-5">Duration</th>
                  <th className="py-3.5 px-5">Outcome</th>
                  <th className="py-3.5 px-5">Date Conducted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 bg-slate-905/5">
                {recentLogs.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-slate-905/30 transition-colors">
                    <td className="py-3 px-5 font-bold text-slate-200">
                      {log.agentId?.name || log.agentName || 'Unknown Agent'}
                    </td>
                    <td className="py-3 px-5 text-slate-400">
                      {log.agentId?.scenarioType || 'Custom Scenario'}
                    </td>
                    <td className="py-3 px-5 text-slate-400 font-mono">
                      {log.duration}s
                    </td>
                    <td className="py-3 px-5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${formatOutcomeBadge(log.outcome)}`}>
                        {formatOutcomeLabel(log.outcome)}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-450">
                      {log.startTime ? new Date(log.startTime).toLocaleString() : log.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Agent Modal Overlay */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setEditingAgent(null)}></div>
          
          <form 
            onSubmit={handleUpdateSubmit} 
            className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Edit Agent profile</h3>
              <button 
                type="button"
                onClick={() => setEditingAgent(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/15 text-rose-450 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Agent Name</label>
                <input
                  type="text"
                  value={editingAgent.name || ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-brand-500 text-slate-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Voice Type</label>
                <select
                  value={editingAgent.voiceType || 'female'}
                  onChange={(e) => setEditingAgent({ ...editingAgent, voiceType: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-brand-500 text-slate-200"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Scenario Type</label>
              <select
                value={editingAgent.scenarioType || 'Lead Qualification'}
                onChange={(e) => setEditingAgent({ ...editingAgent, scenarioType: e.target.value })}
                className="w-full text-xs bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-brand-500 text-slate-200"
              >
                <option value="Lead Qualification">Lead Qualification</option>
                <option value="Appointment Reminder">Appointment Reminder</option>
                <option value="Feedback Collection">Feedback Collection</option>
                <option value="Information Gathering">Information Gathering</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Goal / Objective</label>
              <input
                type="text"
                value={editingAgent.goal || ''}
                onChange={(e) => setEditingAgent({ ...editingAgent, goal: e.target.value })}
                className="w-full text-xs bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-brand-500 text-slate-200"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">System Prompt</label>
              <textarea
                value={editingAgent.systemPrompt || ''}
                onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                className="w-full text-xs bg-slate-950 border border-slate-850 rounded-xl p-3 focus:outline-none focus:border-brand-500 text-slate-200 font-mono"
                rows={4}
                required
              />
            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-end space-x-2">
              <button 
                type="button" 
                onClick={() => setEditingAgent(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs py-2 px-4 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={updating}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs py-2 px-5 rounded-xl transition-colors"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  )
}
