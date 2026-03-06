'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Mic, MicOff, Volume2 } from 'lucide-react'

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

const localeMap: Record<string, string> = {
  english: 'en-IN',
  hindi: 'hi-IN',
  marathi: 'mr-IN',
  tamil: 'ta-IN',
  telugu: 'te-IN',
  bengali: 'bn-IN',
  gujarati: 'gu-IN',
  kannada: 'kn-IN',
  malayalam: 'ml-IN',
  punjabi: 'pa-IN',
  urdu: 'ur-IN',
}

export default function VoiceAssistant() {
  const router = useRouter()
  const pathname = usePathname()
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [statusText, setStatusText] = useState('Voice assistant ready')
  const [lastHeard, setLastHeard] = useState('')

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    const selectedLang = localStorage.getItem('justiceai_ui_language') || 'english'
    utter.lang = localeMap[selectedLang] || 'en-IN'
    utter.rate = 1
    window.speechSynthesis.speak(utter)
  }

  const processCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim()

    if (text.includes('login')) {
      router.push('/login')
      speak('Opening login page.')
      return
    }
    if (text.includes('admin login')) {
      router.push('/admin-login')
      speak('Opening admin login page.')
      return
    }
    if (text.includes('lawyer signup') || text.includes('lawyer sign up')) {
      router.push('/lawyer-signup')
      speak('Opening lawyer signup page.')
      return
    }
    if (text.includes('police signup') || text.includes('police sign up')) {
      router.push('/police-signup')
      speak('Opening police signup page.')
      return
    }
    if (text.includes('home')) {
      router.push('/')
      speak('Opening home page.')
      return
    }
    if (text.includes('complaint form') || text.includes('file complaint') || text.includes('open complaint')) {
      router.push('/?openComplaint=1')
      speak('Opening complaint form.')
      return
    }
    if (text.includes('track case') || text.includes('track complaint')) {
      router.push('/#track-case-section')
      setTimeout(() => {
        document.getElementById('track-case-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
      speak('Scrolling to track case section.')
      return
    }
    if (text.includes('scroll down')) {
      window.scrollBy({ top: 500, behavior: 'smooth' })
      speak('Scrolling down.')
      return
    }
    if (text.includes('scroll up') || text.includes('top')) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      speak('Scrolling to top.')
      return
    }
    if (text.includes('stop voice') || text.includes('stop speaking')) {
      window.speechSynthesis.cancel()
      setStatusText('Speech stopped')
      return
    }

    speak('Command not recognized. Try saying open complaint form, login, or track case.')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setStatusText('Voice assistant stopped')
  }

  const startListening = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) {
      setIsSupported(false)
      setStatusText('Voice recognition is not supported in this browser')
      return
    }

    if (!recognitionRef.current) {
      const recognition = new Ctor()
      recognition.continuous = false
      recognition.interimResults = false
      const selectedLang = localStorage.getItem('justiceai_ui_language') || 'english'
      recognition.lang = localeMap[selectedLang] || 'en-IN'

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || ''
        setLastHeard(transcript)
        setStatusText(`Heard: ${transcript}`)
        processCommand(transcript)
      }

      recognition.onerror = () => {
        setStatusText('Could not hear clearly. Try again.')
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } else {
      const selectedLang = localStorage.getItem('justiceai_ui_language') || 'english'
      recognitionRef.current.lang = localeMap[selectedLang] || 'en-IN'
    }

    recognitionRef.current.start()
    setIsListening(true)
    setStatusText('Listening...')
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      recognitionRef.current?.stop()
    }
  }, [])

  if (pathname === '/ai-case-analysis') return null
  if (!isSupported) return null

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-72">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-600" />
            Voice Assistant
          </p>
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-lg text-white ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            aria-label={isListening ? 'Stop voice assistant' : 'Start voice assistant'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-600">{statusText}</p>
        {lastHeard && <p className="text-xs text-gray-500 mt-1">Last command: {lastHeard}</p>}
      </div>
    </div>
  )
}

