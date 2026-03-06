'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, LogOut, CheckCircle, XCircle, Clock, Save } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface LawyerRequest {
  id: string
  request_tracking_id: string
  linked_case_tracking_id: string | null
  requester_name: string
  requester_email: string | null
  requester_phone: string
  requester_city: string | null
  requester_case_number: string | null
  requester_message: string
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed'
  progress_percent: number
  progress_notes: string | null
  lawyer_response_note: string | null
  created_at: string
}

export default function LawyerDashboard() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [requests, setRequests] = useState<LawyerRequest[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [responseNote, setResponseNote] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressNotes, setProgressNotes] = useState('')
  const [progressStatus, setProgressStatus] = useState<'accepted' | 'in_progress' | 'completed'>('in_progress')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed'>('all')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const rawToken = localStorage.getItem('token')
    const rawUser = localStorage.getItem('user')
    if (!rawToken || !rawUser) {
      router.replace('/login')
      return
    }
    try {
      const user = JSON.parse(rawUser)
      if (user?.userType !== 'lawyer') {
        router.replace('/login')
        return
      }
      setToken(rawToken)
    } catch {
      router.replace('/login')
    }
  }, [router])

  const loadRequests = async () => {
    if (!token) return
    setLoading(true)
    setMessage('')
    try {
      const url =
        statusFilter === 'all'
          ? `${API_BASE_URL}/lawyer-help/requests/me`
          : `${API_BASE_URL}/lawyer-help/requests/me?status=${statusFilter}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load requests')
      setRequests(data.requests || [])
      if (!selectedId && data.requests?.length) setSelectedId(data.requests[0].id)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter])

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  )

  useEffect(() => {
    if (!selected) return
    setResponseNote(selected.lawyer_response_note || '')
    setProgressPercent(selected.progress_percent || 0)
    setProgressNotes(selected.progress_notes || '')
    if (selected.status === 'completed') setProgressStatus('completed')
    else if (selected.status === 'accepted') setProgressStatus('accepted')
    else setProgressStatus('in_progress')
  }, [selected])

  const respond = async (action: 'accepted' | 'rejected') => {
    if (!selected || !token) return
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-help/requests/${selected.id}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, note: responseNote }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update request')
      setMessage(data.message || `Request ${action}`)
      await loadRequests()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to update request')
    }
  }

  const saveProgress = async () => {
    if (!selected || !token) return
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-help/requests/${selected.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progressPercent: Number(progressPercent),
          progressNotes,
          status: progressStatus,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save progress')
      setMessage(data.message || 'Progress updated')
      await loadRequests()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save progress')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lawyer Dashboard</h1>
              <p className="text-xs text-gray-500">Manage incoming client requests</p>
            </div>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-red-600 font-semibold">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <button onClick={loadRequests} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold">
            Refresh
          </button>
          {message && <p className="text-sm text-indigo-700">{message}</p>}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Requests ({requests.length})</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500">No requests found</p>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto">
                {requests.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left border rounded-lg p-3 transition ${
                      selectedId === r.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{r.requester_name}</p>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{r.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Request ID: {r.request_tracking_id}</p>
                    {r.linked_case_tracking_id && (
                      <p className="text-xs text-gray-600">Case Tracking: {r.linked_case_tracking_id}</p>
                    )}
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{r.requester_message}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            {!selected ? (
              <p className="text-gray-500">Select a request to manage details.</p>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-semibold">Tracking ID:</span> {selected.request_tracking_id}</p>
                  <p><span className="font-semibold">Status:</span> {selected.status}</p>
                  <p><span className="font-semibold">Name:</span> {selected.requester_name}</p>
                  <p><span className="font-semibold">Phone:</span> {selected.requester_phone}</p>
                  <p><span className="font-semibold">Email:</span> {selected.requester_email || '-'}</p>
                  <p><span className="font-semibold">City:</span> {selected.requester_city || '-'}</p>
                  <p><span className="font-semibold">Case Number:</span> {selected.requester_case_number || '-'}</p>
                  <p><span className="font-semibold">Case Tracking:</span> {selected.linked_case_tracking_id || '-'}</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Client Message</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.requester_message}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Accept/Reject Note</label>
                  <textarea
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Add note for client (optional)"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => respond('accepted')}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => respond('rejected')}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-semibold text-gray-900 mb-2">Update Progress</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Progress %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={progressPercent}
                        onChange={(e) => setProgressPercent(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Status</label>
                      <select
                        value={progressStatus}
                        onChange={(e) => setProgressStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="accepted">Accepted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <label className="block text-sm text-gray-700 mt-3 mb-1">Progress Notes</label>
                  <textarea
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Case preparation, documents reviewed, hearing update, next steps..."
                  />
                  <button
                    onClick={saveProgress}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    Save Progress
                  </button>
                </div>

                <div className="text-xs text-gray-500 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  User can track this request using: {selected.request_tracking_id}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
