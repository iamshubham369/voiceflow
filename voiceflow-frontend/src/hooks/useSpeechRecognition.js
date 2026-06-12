/** @module useSpeechRecognition */
import { useState, useEffect, useRef, useCallback } from 'react'

export default function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [supported, setSupported] = useState(false)
  
  const recognitionRef = useRef(null)
  const accumulatedTranscript = useRef('')

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSupported(true)
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      recognitionRef.current = rec
    } else {
      setSupported(false)
    }
  }, [])

  const start = useCallback((lang = 'en-US') => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    setError(null)
    recognitionRef.current.lang = lang
    
    // Set up event listeners
    recognitionRef.current.onstart = () => {
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }

      if (final) {
        accumulatedTranscript.current += final
        setTranscript(accumulatedTranscript.current.trim())
      }
      setInterimTranscript(interim)
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      
      // Map standard recognition errors to friendly terms
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please grant permission in browser settings.')
      } else if (event.error === 'no-speech') {
        // Do not display hard warning, just clear local interim buffer
        setInterimTranscript('')
      } else {
        setError(`Speech recognition issue: ${event.error}`)
      }
      
      // Stop isListening on terminal errors (excluding transient no-speech or sound-start blocks)
      if (event.error !== 'no-speech') {
        setIsListening(false)
      }
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    try {
      recognitionRef.current.start()
    } catch (err) {
      console.warn('Recognition start error:', err.message)
    }
  }, [])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  const resetTranscript = useCallback(() => {
    accumulatedTranscript.current = ''
    setTranscript('')
    setInterimTranscript('')
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return {
    transcript,
    interimTranscript,
    isListening,
    supported,
    error,
    start,
    stop,
    resetTranscript
  }
}
