import { useState, useEffect, useRef, useCallback } from 'react'

export default function useSpeechSynthesis(defaultSettings = {}) {
  const [availableVoices, setAvailableVoices] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const synthRef = useRef(null)

  // Initialize synthesis ref
  useEffect(() => {
    if (window.speechSynthesis) {
      synthRef.current = window.speechSynthesis
      
      const loadVoices = () => {
        const voicesList = window.speechSynthesis.getVoices()
        setAvailableVoices(voicesList)
      }

      loadVoices()
      
      // Chrome/Safari load voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    }
  }, [])

  const speak = useCallback((text, options = {}) => {
    if (!synthRef.current) return

    // Cancel any active speech queues
    synthRef.current.cancel()

    const mergedSettings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voiceName: '', // Match by voice name or voiceURI
      ...defaultSettings,
      ...options
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = mergedSettings.rate
    utterance.pitch = mergedSettings.pitch
    utterance.volume = mergedSettings.volume

    // Find and set requested voice
    if (mergedSettings.voiceName) {
      const match = availableVoices.find(v => v.name === mergedSettings.voiceName || v.voiceURI === mergedSettings.voiceName)
      if (match) {
        utterance.voice = match
      }
    }

    // Set callback event handlers
    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = (e) => {
      console.error('Speech synthesis execution issue:', e)
      setIsSpeaking(false)
    }

    synthRef.current.speak(utterance)
  }, [availableVoices, defaultSettings])

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }, [])

  // Terminate speech on component unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  return {
    speak,
    stop,
    isSpeaking,
    availableVoices
  }
}
