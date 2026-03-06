'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Search, Phone, User, MapPin, Copy, CheckCircle2 } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface Lawyer {
  id: string
  fullName: string
  specialization: string
  experienceYears: number
  hourlyRate: number
  city: string
  state: string
  barCouncil: string
  bio: string
}

export default function LawyerHelpPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [specializationSummary, setSpecializationSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [trackingIdInput, setTrackingIdInput] = useState('')
  const [trackingResult, setTrackingResult] = useState<any>(null)
  const [lastGeneratedTrackingId, setLastGeneratedTrackingId] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    caseNumber: '',
    caseTrackingId: '',
    message: '',
  })

  useEffect(() => {
    const loadLawyers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/lawyer-help/public/lawyers`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load lawyers')
        setLawyers(data.lawyers || [])
        setSpecializationSummary(data.specializationSummary || {})
      } catch (err) {
        setRequestMessage(err instanceof Error ? err.message : 'Unable to load lawyers')
      } finally {
        setLoading(false)
      }
    }
    loadLawyers()
  }, [])

  const filteredLawyers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return lawyers
    return lawyers.filter((l) =>
      [l.fullName, l.specialization, l.city, l.state, l.barCouncil, l.bio].join(' ').toLowerCase().includes(q)
    )
  }, [lawyers, search])

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLawyer) {
      setRequestMessage('Please choose a lawyer first')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-help/public/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyerId: selectedLawyer.id,
          ...formData,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to submit request')

      setRequestMessage(`Request submitted successfully`)
      setLastGeneratedTrackingId(data.request.requestTrackingId)
      setTrackingIdInput(data.request.requestTrackingId)
      setTrackingResult({
        requestTrackingId: data.request.requestTrackingId,
        status: data.request.status,
        progressPercent: data.request.progressPercent,
        progressNotes: data.request.progressNotes,
      })
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        caseNumber: '',
        caseTrackingId: '',
        message: '',
      })
    } catch (err) {
      setRequestMessage(err instanceof Error ? err.message : 'Unable to submit request')
    }
  }

  const trackRequest = async () => {
    if (!trackingIdInput.trim()) return
    const normalizedTrackingId = trackingIdInput.trim().toUpperCase()
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-help/public/track/${normalizedTrackingId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Tracking ID not found')
      setTrackingResult(data.tracking)
      setTrackingIdInput(normalizedTrackingId)
      setRequestMessage('')
    } catch (err) {
      setTrackingResult(null)
      setRequestMessage(err instanceof Error ? err.message : 'Unable to track request')
    }
  }

  const copyTrackingId = async () => {
    if (!lastGeneratedTrackingId) return
    try {
      await navigator.clipboard.writeText(lastGeneratedTrackingId)
      setRequestMessage('Tracking ID copied')
    } catch {
      setRequestMessage('Unable to copy tracking ID')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Lawyer Help</h1>
          </div>
          <Link href="/" className="text-indigo-600 font-semibold hover:text-indigo-700">Back Home</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">Available lawyers</p>
              <p className="text-3xl font-bold text-gray-900">{lawyers.length}</p>
            </div>
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, specialization, city"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(specializationSummary).map(([name, count]) => (
              <span key={name} className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold">
                {name}: {count}
              </span>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Lawyer Directory</h2>
            {loading ? (
              <p className="text-gray-500">Loading lawyers...</p>
            ) : filteredLawyers.length === 0 ? (
              <p className="text-gray-500">No lawyers found.</p>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredLawyers.map((lawyer) => (
                  <button
                    key={lawyer.id}
                    onClick={() => setSelectedLawyer(lawyer)}
                    className={`w-full text-left border rounded-lg p-4 transition ${
                      selectedLawyer?.id === lawyer.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{lawyer.fullName}</p>
                        <p className="text-sm text-indigo-700">{lawyer.specialization}</p>
                      </div>
                      <p className="text-sm font-bold text-green-700">Fee: Rs {Number(lawyer.hourlyRate || 0).toLocaleString()}/hr</p>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {lawyer.experienceYears} yrs</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {lawyer.city || '-'}, {lawyer.state || '-'}</span>
                    </div>
                    {lawyer.bio && <p className="mt-2 text-sm text-gray-700">{lawyer.bio}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Lawyer</h2>
              <p className="text-sm text-gray-600 mb-3">
                Selected lawyer: <span className="font-semibold">{selectedLawyer?.fullName || 'None'}</span>
              </p>
              <form onSubmit={submitRequest} className="space-y-3">
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your Name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                  required
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone Number"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                    required
                  />
                  <input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email (optional)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={formData.caseNumber}
                    onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                    placeholder="Your Case Number (optional)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                  />
                  <input
                    value={formData.caseTrackingId}
                    onChange={(e) => setFormData({ ...formData, caseTrackingId: e.target.value })}
                    placeholder="Case Tracking ID (optional)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                />
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Explain your case and what help you need"
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
                  required
                />
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg">
                  Submit Request to Lawyer
                </button>
              </form>

              {lastGeneratedTrackingId && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 space-y-2">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Lawyer request created
                  </p>
                  <p>
                    Your tracking ID: <span className="font-bold">{lastGeneratedTrackingId}</span>
                  </p>
                  <button
                    type="button"
                    onClick={copyTrackingId}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-green-700 text-white text-xs font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Tracking ID
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Track Lawyer Request</h2>
              <div className="flex gap-2">
                <input
                  value={trackingIdInput}
                  onChange={(e) => setTrackingIdInput(e.target.value)}
                  placeholder="LRT-YYYY-XXXXXX"
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
                <button onClick={trackRequest} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold">Track</button>
              </div>

              {trackingResult && (
                <div className="mt-4 p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm space-y-1">
                  <p><span className="font-semibold">Tracking ID:</span> {trackingResult.requestTrackingId}</p>
                  <p><span className="font-semibold">Status:</span> {trackingResult.status}</p>
                  <p><span className="font-semibold">Progress:</span> {trackingResult.progressPercent}%</p>
                  <p><span className="font-semibold">Notes:</span> {trackingResult.progressNotes || 'No updates yet'}</p>
                  {trackingResult.lawyerResponseNote && (
                    <p><span className="font-semibold">Lawyer Note:</span> {trackingResult.lawyerResponseNote}</p>
                  )}
                  {trackingResult.lawyer?.full_name && (
                    <p><span className="font-semibold">Lawyer:</span> {trackingResult.lawyer.full_name}</p>
                  )}
                </div>
              )}
            </div>

            {requestMessage && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-indigo-900 text-sm inline-flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {requestMessage}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
