/** @module App */
import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster, toast } from 'react-hot-toast'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AgentCreation from './pages/AgentCreation'
import CallStudio from './pages/CallStudio'
import Logs from './pages/Logs'
import TranscriptModal from './components/TranscriptModal'

const API_BASE = import.meta.env.VITE_API_URL || '';

// Pre-defined initial mock logs
const DEFAULT_LOGS = [
  {
    id: 'log-1',
    agentName: 'Alex (Customer Support)',
    date: new Date(Date.now() - 1000 * 60 * 30).toLocaleString(),
    duration: 45,
    outcome: 'achieved',
    transcript: [
      { role: 'ai', message: 'Hello! This is Alex from customer support. How can I help you today?', timestamp: '10:00 AM' },
      { role: 'user', message: 'Hi Alex, I was wondering if your speech platform supports custom voices.', timestamp: '10:01 AM' },
      { role: 'ai', message: 'Yes, it does! We support configuring speech rate, pitch, and standard voice profiles directly in the settings panel.', timestamp: '10:01 AM' },
      { role: 'user', message: 'Awesome, thank you for the information. Goodbye.', timestamp: '10:02 AM' },
      { role: 'ai', message: 'You are welcome! Have a wonderful day. Goodbye.', timestamp: '10:02 AM' }
    ]
  }
]

// Animated router wrapper for page transitions
function AnimatedRoutes({ 
  agents, 
  logs, 
  onAgentUpdated, 
  onAgentDeleted, 
  onAgentCreated, 
  onAddLog, 
  onDeleteLog, 
  onViewTranscript,
  loadingLogs,
  loadingAgents
}) {
  const location = useLocation();

  const pageTransition = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
    transition: { duration: 0.25, ease: 'easeInOut' }
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <motion.div {...pageTransition} className="w-full">
              <Dashboard 
                agents={agents} 
                logs={logs} 
                onAgentUpdated={onAgentUpdated}
                onAgentDeleted={onAgentDeleted}
                loading={loadingLogs}
              />
            </motion.div>
          } 
        />
        
        <Route 
          path="/agents/new" 
          element={
            <motion.div {...pageTransition} className="w-full">
              <AgentCreation onAgentCreated={onAgentCreated} />
            </motion.div>
          } 
        />
        
        <Route 
          path="/studio" 
          element={
            <motion.div {...pageTransition} className="w-full">
              <CallStudio 
                agents={agents.filter(a => a.isActive)} 
                onAddLog={onAddLog} 
              />
            </motion.div>
          } 
        />
        
        <Route 
          path="/logs" 
          element={
            <motion.div {...pageTransition} className="w-full">
              <Logs 
                logs={logs} 
                onDeleteLog={onDeleteLog} 
                onViewTranscript={onViewTranscript} 
                loading={loadingLogs}
              />
            </motion.div>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  // App Global State
  const [agents, setAgents] = useState([])
  const [logs, setLogs] = useState([])
  
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)

  // Collapsible mobile sidebar toggle state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Selected Transcript for Viewer Modal
  const [selectedTranscriptLog, setSelectedTranscriptLog] = useState(null)

  // Backend Health States
  const [backendStatus, setBackendStatus] = useState('checking')
  const [dbStatus, setDbStatus] = useState('unknown')

  useEffect(() => {
    // Initial fetches
    checkBackendHealth()
    fetchAgents()
    fetchCalls()
    
    // Interval check every 30s
    const checkInterval = setInterval(checkBackendHealth, 30000)
    return () => clearInterval(checkInterval)
  }, [])

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`)
      const data = await response.json()
      if (response.ok) {
        setBackendStatus('connected')
        setDbStatus(data.database || 'unknown')
      } else {
        setBackendStatus('disconnected')
        setDbStatus('disconnected')
      }
    } catch (err) {
      setBackendStatus('disconnected')
      setDbStatus('disconnected')
    }
  }

  const fetchAgents = async () => {
    setLoadingAgents(true)
    try {
      const response = await fetch(`${API_BASE}/api/agents`)
      const json = await response.json()
      if (response.ok && json.success) {
        setAgents(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    } finally {
      setLoadingAgents(false)
    }
  }

  const fetchCalls = async () => {
    setLoadingLogs(true)
    try {
      const response = await fetch(`${API_BASE}/api/calls`)
      const json = await response.json()
      if (response.ok && json.success) {
        setLogs(json.data)
      } else {
        const saved = localStorage.getItem('vf_logs')
        setLogs(saved ? JSON.parse(saved) : DEFAULT_LOGS)
      }
    } catch (err) {
      console.error('Failed to fetch calls:', err)
      const saved = localStorage.getItem('vf_logs')
      setLogs(saved ? JSON.parse(saved) : DEFAULT_LOGS)
    } finally {
      setLoadingLogs(false)
    }
  }

  // Handlers for API Syncing
  const handleAgentCreated = (newAgent) => {
    setAgents(prev => [newAgent, ...prev])
    toast.success('Agent deployed successfully!')
  }

  const handleAgentUpdated = (updatedAgent) => {
    setAgents(prev => prev.map(agent => 
      (agent._id || agent.id) === (updatedAgent._id || updatedAgent.id) ? updatedAgent : agent
    ))
    toast.success('Agent profile updated successfully!')
  }

  const handleAgentDeleted = (deletedId) => {
    setAgents(prev => prev.filter(agent => (agent._id || agent.id) !== deletedId))
    toast.success('Agent profile deleted.')
  }

  // Deletes call logs from Mongoose
  const handleDeleteLog = async (id) => {
    if (!confirm('Are you sure you want to delete this call log?')) return
    
    try {
      const response = await fetch(`${API_BASE}/api/calls/${id}`, {
        method: 'DELETE'
      })
      const json = await response.json()
      if (response.ok && json.success) {
        setLogs(prev => prev.filter(log => (log._id || log.id) !== id))
        toast.success('Call log entry deleted.')
      } else {
        toast.error(json.error || 'Failed to delete call log')
      }
    } catch (err) {
      console.error('Failed to delete call log:', err)
      toast.error('Network error. Failed to delete call log.')
    }
  }

  // Fetch full details including conversation transcripts for Modal
  const handleViewTranscript = async (id) => {
    const fetchToast = toast.loading('Loading dialogue transcript...')
    try {
      const response = await fetch(`${API_BASE}/api/calls/${id}`)
      const json = await response.json()
      if (response.ok && json.success) {
        setSelectedTranscriptLog(json.data)
        toast.dismiss(fetchToast)
      } else {
        const match = logs.find(l => (l._id || l.id) === id)
        setSelectedTranscriptLog(match)
        toast.dismiss(fetchToast)
      }
    } catch (err) {
      console.error('Failed to fetch transcript details:', err)
      const match = logs.find(l => (l._id || l.id) === id)
      setSelectedTranscriptLog(match)
      toast.dismiss(fetchToast)
    }
  }

  const handleCallEnded = () => {
    // Refresh calls list from backend
    fetchCalls()
    toast.success('Call logged successfully!')
  }

  return (
    <BrowserRouter>
      {/* Toast Notification Container */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b',
            fontSize: '12px',
            borderRadius: '10px'
          }
        }} 
      />

      <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar 
          backendStatus={backendStatus} 
          dbStatus={dbStatus} 
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Collapsible content panel */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* Top Bar for Mobile Navigation toggles */}
          <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-slate-950/60 backdrop-blur lg:hidden sticky top-0 z-30">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-350">Console</span>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-200 transition-colors"
              title="Open Sidebar Menu"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Core Layout Display Viewport */}
          <div className="flex-1 p-6">
            <AnimatedRoutes 
              agents={agents}
              logs={logs}
              onAgentUpdated={handleAgentUpdated}
              onAgentDeleted={handleAgentDeleted}
              onAgentCreated={handleAgentCreated}
              onAddLog={handleCallEnded}
              onDeleteLog={handleDeleteLog}
              onViewTranscript={handleViewTranscript}
              loadingLogs={loadingLogs}
              loadingAgents={loadingAgents}
            />
          </div>

        </div>

        {/* Portal Dialog Modal for viewing full conversations transcripts */}
        {selectedTranscriptLog && (
          <TranscriptModal 
            log={selectedTranscriptLog} 
            onClose={() => setSelectedTranscriptLog(null)} 
          />
        )}

      </div>
    </BrowserRouter>
  )
}
