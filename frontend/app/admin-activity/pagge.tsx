'use client'

import { useState, useEffect } from 'react'
import {
  Scale, LogOut, Bell, Settings, Search, Filter, Check, X,
  Eye, Shield, Briefcase, Clock, CheckCircle, XCircle, User, Activity
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface PendingApproval {
  id: string
  name: string
  email: string
  phone: string
  type: 'police' | 'lawyer'
  status: 'pending' | 'approved' | 'rejected'
  submittedDate: string
  aadharId: string
  location: string
  city: string
  additionalInfo?: {
    badgeNumber?: string
    station?: string
    licenseNumber?: string
    specialization?: string
    experience?: number
    hourlyRate?: number
  }
}

interface ApiUser {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  user_type: 'admin' | 'police' | 'lawyer'
  approval_status: 'pending' | 'approved' | 'rejected' | null
  created_at: string
  aadhar_id: string | null
  department: string | null
  city: string | null
  badge_number: string | null
  license_number: string | null
  specialization: string | null
  experience_years: number | null
  hourly_rate: number | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'police' | 'lawyer'>('all')
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('token')
    const rawUser = localStorage.getItem('user')

    if (!token || !rawUser) {
      router.replace('/admin-login')
      return
    }

    try {
      const user = JSON.parse(rawUser)
      if (user?.userType !== 'admin') {
        router.replace('/admin-login')
        return
      }
    } catch {
      router.replace('/admin-login')
      return
    }

    const fetchApprovals = async () => {
      setIsLoadingData(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load approvals')
        }

        const mapped: PendingApproval[] = (data.users || [])
          .filter((u: ApiUser) => u.user_type === 'police' || u.user_type === 'lawyer')
          .map((u: ApiUser) => ({
            id: u.id,
            name: u.full_name || 'N/A',
            email: u.email,
            phone: u.phone || 'N/A',
            type: u.user_type,
            status: (u.approval_status || 'pending') as 'pending' | 'approved' | 'rejected',
            submittedDate: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'N/A',
            aadharId: u.aadhar_id || '',
            location: u.department || u.city || 'N/A',
            city: u.city || 'N/A',
            additionalInfo: u.user_type === 'police'
              ? { badgeNumber: u.badge_number || 'N/A', station: u.department || 'N/A' }
              : {
                  licenseNumber: u.license_number || 'N/A',
                  specialization: u.specialization || 'N/A',
                  experience: u.experience_years || 0,
                  hourlyRate: u.hourly_rate || 0,
                },
          }))

        setApprovals(mapped)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchApprovals()
  }, [router])

  const updateApprovalStatus = async (id: string, status: 'approved' | 'rejected') => {
    const token = localStorage.getItem('token')
    if (!token) return
    const response = await fetch(`${API_BASE_URL}/users/${id}/approval-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ approvalStatus: status }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update status')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await updateApprovalStatus(id, 'approved')
      setApprovals((prev) => prev.map((app) => (app.id === id ? { ...app, status: 'approved' } : app)))
      setSelectedApproval(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await updateApprovalStatus(id, 'rejected')
      setApprovals((prev) => prev.map((app) => (app.id === id ? { ...app, status: 'rejected' } : app)))
      setSelectedApproval(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rejection failed')
    }
  }

  const filteredApprovals = approvals.filter(app => {
    const matchesTab = app.status === activeTab
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || app.type === filterType
    return matchesTab && matchesSearch && matchesFilter
  })

  const stats = {
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
    totalPolice: approvals.filter(a => a.type === 'police').length,
    totalLawyer: approvals.filter(a => a.type === 'lawyer').length
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">JusticeAI Admin</h1>
                <p className="text-sm text-gray-600">Approval Management</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition relative">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
              </button>
              <Link
                href="/admin-activity"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <Activity className="w-5 h-5" />
                Activity Log
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  router.push('/admin-login')
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Approved</p>
                <p className="text-3xl font-bold text-gray-900">{stats.approved}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Police Officers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPolice}</p>
              </div>
              <Shield className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Lawyers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalLawyer}</p>
              </div>
              <Briefcase className="w-10 h-10 text-indigo-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'police' | 'lawyer')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="all">All Types</option>
              <option value="police">Police Officers</option>
              <option value="lawyer">Lawyers</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-gray-200">
          {['pending', 'approved', 'rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'pending' | 'approved' | 'rejected')}
              className={`px-6 py-3 font-medium transition border-b-2 ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Approvals Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
          )}
          {isLoadingData ? (
            <div className="p-12 text-center text-gray-600">Loading applications...</div>
          ) : (
          <>
          {filteredApprovals.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No {activeTab} applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Submitted</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApprovals.map(app => (
                    <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            {app.type === 'police' ? (
                              <Shield className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Briefcase className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{app.name}</p>
                            <p className="text-sm text-gray-600">{app.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          app.type === 'police'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {app.type === 'police' ? 'Police' : 'Lawyer'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{app.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{app.city}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{app.submittedDate}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedApproval(app)}
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Application Details</h2>
              <button
                onClick={() => setSelectedApproval(null)}
                className="p-2 hover:bg-blue-500 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-semibold text-gray-900">{selectedApproval.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{selectedApproval.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{selectedApproval.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Aadhar ID</p>
                    <p className="font-semibold text-gray-900">****{selectedApproval.aadharId.slice(-4)}</p>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Location</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-semibold text-gray-900">{selectedApproval.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold text-gray-900">{selectedApproval.location}</p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              {selectedApproval.additionalInfo && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {selectedApproval.type === 'police' ? 'Police Information' : 'Professional Information'}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedApproval.type === 'police' ? (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Badge Number</p>
                          <p className="font-semibold text-gray-900">{selectedApproval.additionalInfo.badgeNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Police Station</p>
                          <p className="font-semibold text-gray-900">{selectedApproval.additionalInfo.station}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">License Number</p>
                          <p className="font-semibold text-gray-900">{selectedApproval.additionalInfo.licenseNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Specialization</p>
                          <p className="font-semibold text-gray-900">{selectedApproval.additionalInfo.specialization}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Experience (Years)</p>
                          <p className="font-semibold text-gray-900">{selectedApproval.additionalInfo.experience}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Hourly Rate</p>
                          <p className="font-semibold text-gray-900">₹{selectedApproval.additionalInfo.hourlyRate}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Status and Actions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Current Status</p>
                <div className="flex items-center gap-2 mb-4">
                  {selectedApproval.status === 'pending' && (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  )}
                  {selectedApproval.status === 'approved' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {selectedApproval.status === 'rejected' && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-semibold text-gray-900 capitalize">
                    {selectedApproval.status}
                  </span>
                </div>

                {selectedApproval.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedApproval.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedApproval.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedApproval(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
