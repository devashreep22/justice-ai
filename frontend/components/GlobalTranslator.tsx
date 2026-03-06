'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const LANGUAGE_CODE_MAP: Record<string, string> = {
  english: 'en',
  hindi: 'hi',
  marathi: 'mr',
  tamil: 'ta',
  telugu: 'te',
  bengali: 'bn',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
  urdu: 'ur',
}

const applyGoogleTranslateLanguage = (lang: string) => {
  const code = LANGUAGE_CODE_MAP[lang] || 'en'
  document.cookie = `googtrans=/en/${code};path=/`
  document.cookie = `googtrans=/en/${code};path=/;domain=${window.location.hostname}`

  const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null
  if (combo) {
    combo.value = code
    combo.dispatchEvent(new Event('change'))
  }
}

export default function GlobalTranslator() {
  const pathname = usePathname()

  useEffect(() => {
    const init = () => {
      const w = window as any
      if (!w.google?.translate?.TranslateElement) return
      if (!document.getElementById('google_translate_element')) return

      if (!w.__justiceAiTranslateInitialized) {
        // eslint-disable-next-line no-new
        new w.google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element'
        )
        w.__justiceAiTranslateInitialized = true
      }

      const storedLang = localStorage.getItem('justiceai_ui_language') || 'english'
      setTimeout(() => applyGoogleTranslateLanguage(storedLang), 400)
    }

    ;(window as any).googleTranslateElementInit = init

    if (!(window as any).google?.translate?.TranslateElement) {
      const script = document.createElement('script')
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    } else {
      init()
    }

    const onLanguageChange = (e: Event) => {
      const lang = (e as CustomEvent<string>).detail || 'english'
      applyGoogleTranslateLanguage(lang)
    }
    window.addEventListener('justiceai-language-change', onLanguageChange as EventListener)

    return () => {
      window.removeEventListener('justiceai-language-change', onLanguageChange as EventListener)
    }
  }, [])

  useEffect(() => {
    const lang = localStorage.getItem('justiceai_ui_language') || 'english'
    const timers = [
      window.setTimeout(() => applyGoogleTranslateLanguage(lang), 250),
      window.setTimeout(() => applyGoogleTranslateLanguage(lang), 900),
      window.setTimeout(() => applyGoogleTranslateLanguage(lang), 1800),
    ]

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [pathname])

  return <div id="google_translate_element" />
}
