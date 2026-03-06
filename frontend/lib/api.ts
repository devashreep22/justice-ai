const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface LoginPayload {
  email: string
  password: string
}

interface SignupPayload extends LoginPayload {
  fullName?: string
  userType?: 'admin' | 'lawyer' | 'police'
  [key: string]: any
}

export async function login(payload: LoginPayload) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error || 'Login failed')
  }

  return body
}

export async function signup(payload: SignupPayload) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error || 'Signup failed')
  }

  return body
}

export async function getMyComplaints(token: string) {
  const res = await fetch(`${API_URL}/my-complaints`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Failed to fetch complaints')
  return res.json()
}
