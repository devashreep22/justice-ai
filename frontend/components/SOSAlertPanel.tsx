'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, MapPin, Phone, Plus, Trash2, Camera, Mic, MicOff } from 'lucide-react'

type TrustedContact = {
  id: string
  name: string
  relation: string
  phone: string
}

const CONTACTS_STORAGE_KEY = 'justiceai_sos_contacts'
const LAST_SOS_STORAGE_KEY = 'justiceai_last_sos_message'

const toDigits = (value: string) => value.replace(/[^\d]/g, '')

const createEmergencyMessage = (lat: number, lon: number) => {
  const mapsLink = `https://maps.google.com/?q=${lat},${lon}`
  return [
    'SOS ALERT',
    'I may be in danger. Please help immediately.',
    `Live location: ${mapsLink}`,
    `Time: ${new Date().toLocaleString()}`,
  ].join('\n')
}

export default function SOSAlertPanel() {
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([])
  const [contactName, setContactName] = useState('')
  const [contactRelation, setContactRelation] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [locationText, setLocationText] = useState('Not shared yet')
  const [mapsLink, setMapsLink] = useState('')
  const [lastSOSMessage, setLastSOSMessage] = useState('')
  const [isSOSRunning, setIsSOSRunning] = useState(false)
  const [sosStatus, setSOSStatus] = useState('')

  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)

  const [cameraError, setCameraError] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem(CONTACTS_STORAGE_KEY)
      if (savedContacts) setTrustedContacts(JSON.parse(savedContacts))
      const savedLastMessage = localStorage.getItem(LAST_SOS_STORAGE_KEY)
      if (savedLastMessage) setLastSOSMessage(savedLastMessage)
    } catch {
      setSOSStatus('Unable to load local SOS settings.')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(trustedContacts))
  }, [trustedContacts])

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
      audioStreamRef.current?.getTracks().forEach((track) => track.stop())
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [audioUrl, photoUrl])

  const whatsappLinks = useMemo(() => {
    if (!lastSOSMessage) return []
    const encoded = encodeURIComponent(lastSOSMessage)
    return trustedContacts
      .map((contact) => {
        const phone = toDigits(contact.phone)
        if (!phone) return null
        return {
          id: contact.id,
          name: contact.name,
          href: `https://wa.me/${phone}?text=${encoded}`,
        }
      })
      .filter((item): item is { id: string; name: string; href: string } => Boolean(item))
  }, [lastSOSMessage, trustedContacts])

  const requestLocation = async (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not available on this device.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        (err) => reject(new Error(err.message || 'Location permission was denied.')),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    })

  const triggerSOS = async () => {
    setIsSOSRunning(true)
    setSOSStatus('Collecting live location...')
    try {
      const { lat, lon } = await requestLocation()
      const link = `https://maps.google.com/?q=${lat},${lon}`
      const message = createEmergencyMessage(lat, lon)
      setLocationText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`)
      setMapsLink(link)
      setLastSOSMessage(message)
      localStorage.setItem(LAST_SOS_STORAGE_KEY, message)

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message)
      }

      setSOSStatus('SOS prepared. Message copied. Use WhatsApp/SMS buttons below to notify contacts now.')
    } catch (err) {
      setSOSStatus(err instanceof Error ? err.message : 'Unable to trigger SOS.')
    } finally {
      setIsSOSRunning(false)
    }
  }

  const addContact = () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      setSOSStatus('Enter contact name and phone number.')
      return
    }
    const next: TrustedContact = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: contactName.trim(),
      relation: contactRelation.trim() || 'Trusted contact',
      phone: contactPhone.trim(),
    }
    setTrustedContacts((prev) => [next, ...prev])
    setContactName('')
    setContactRelation('')
    setContactPhone('')
    setSOSStatus('Trusted contact added.')
  }

  const removeContact = (id: string) => {
    setTrustedContacts((prev) => prev.filter((c) => c.id !== id))
  }

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecordingAudio(true)
      setSOSStatus('Audio recording started.')
    } catch {
      setSOSStatus('Microphone permission denied or unavailable.')
    }
  }

  const stopAudioRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecordingAudio(false)
    setSOSStatus('Audio saved. Download it for evidence.')
  }

  const openCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      cameraStreamRef.current = stream
      setIsCameraOpen(true)
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
        }
      }, 0)
    } catch {
      setCameraError('Camera access denied or unavailable.')
    }
  }

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    const video = cameraVideoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setPhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setSOSStatus('Photo captured. Download it for evidence.')
    }, 'image/jpeg', 0.92)
  }

  return (
    <section id="sos-alert-panel" className="mt-8 rounded-2xl border-2 border-red-200 bg-red-50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7" />
            Emergency SOS
          </h3>
          <p className="text-sm text-red-800 mt-1">Press once to prepare and share emergency alert with live location.</p>
        </div>
        <button
          type="button"
          onClick={triggerSOS}
          disabled={isSOSRunning}
          className="rounded-xl bg-red-600 px-8 py-4 text-lg font-bold text-white shadow hover:bg-red-700 disabled:bg-red-300"
        >
          {isSOSRunning ? 'Activating...' : 'ACTIVATE SOS'}
        </button>
      </div>

      {sosStatus && <p className="mt-4 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-800">{sosStatus}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="font-bold text-gray-900 mb-2">Live Location</h4>
          <p className="text-sm text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            {locationText}
          </p>
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900">
              Open Google Maps Link
            </a>
          )}
          {lastSOSMessage && (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-800">{lastSOSMessage}</pre>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="font-bold text-gray-900 mb-2">Direct Emergency Calling</h4>
          <div className="flex flex-wrap gap-2">
            <a href="tel:112" className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              <Phone className="w-4 h-4" />
              Call 112
            </a>
            <a href="tel:100" className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
              <Phone className="w-4 h-4" />
              Call 100
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <h4 className="font-bold text-gray-900 mb-3">Trusted Contacts</h4>
        <div className="grid gap-2 sm:grid-cols-4">
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={contactRelation}
            onChange={(e) => setContactRelation(e.target.value)}
            placeholder="Relation (Friend/Lawyer)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Phone with country code"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="button" onClick={addContact} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {trustedContacts.length === 0 ? (
            <p className="text-sm text-gray-500">No trusted contacts added yet.</p>
          ) : (
            trustedContacts.map((contact) => {
              const digits = toDigits(contact.phone)
              const smsHref = `sms:${digits}?body=${encodeURIComponent(lastSOSMessage || 'SOS alert: I need urgent help.')}`
              const waItem = whatsappLinks.find((item) => item.id === contact.id)
              return (
                <div key={contact.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{contact.name}</span> ({contact.relation}) - {contact.phone}
                  </p>
                  <div className="flex gap-2">
                    <a href={smsHref} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                      SMS
                    </a>
                    {waItem && (
                      <a href={waItem.href} target="_blank" rel="noreferrer" className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                        WhatsApp
                      </a>
                    )}
                    <button type="button" onClick={() => removeContact(contact.id)} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <h4 className="font-bold text-gray-900 mb-3">Evidence Capture (Optional)</h4>
        <div className="flex flex-wrap gap-2">
          {!isRecordingAudio ? (
            <button type="button" onClick={startAudioRecording} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              <Mic className="w-4 h-4" />
              Start Audio
            </button>
          ) : (
            <button type="button" onClick={stopAudioRecording} className="inline-flex items-center gap-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900">
              <MicOff className="w-4 h-4" />
              Stop Audio
            </button>
          )}

          {!isCameraOpen ? (
            <button type="button" onClick={openCamera} className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              <Camera className="w-4 h-4" />
              Open Camera
            </button>
          ) : (
            <>
              <button type="button" onClick={capturePhoto} className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                <Camera className="w-4 h-4" />
                Capture Photo
              </button>
              <button type="button" onClick={closeCamera} className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300">
                Close Camera
              </button>
            </>
          )}
        </div>

        {cameraError && <p className="mt-2 text-sm text-red-600">{cameraError}</p>}
        {isCameraOpen && <video ref={cameraVideoRef} autoPlay playsInline muted className="mt-3 w-full max-w-md rounded-lg border border-gray-200" />}
        {audioUrl && <a href={audioUrl} download="justiceai-sos-audio.webm" className="mt-3 inline-block text-sm font-semibold text-blue-700">Download Audio Evidence</a>}
        {photoUrl && <a href={photoUrl} download="justiceai-sos-photo.jpg" className="ml-4 mt-3 inline-block text-sm font-semibold text-blue-700">Download Photo Evidence</a>}
      </div>
    </section>
  )
}
