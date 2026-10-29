import { useCallback, useEffect, useState } from 'react'
import { DEMO_SESSION, loadUserProfile } from '../lib/constants'

export interface AuthSession {
  access_token: string
  user: {
    email: string
    user_metadata: {
      full_name: string
    }
  }
}

export function useAuth(showNotice?: (msg: string) => void) {
  const initialProfile = loadUserProfile()
  const [session, setSession] = useState<AuthSession>({
    access_token: DEMO_SESSION.access_token,
    user: {
      email: initialProfile.email,
      user_metadata: { full_name: initialProfile.fullName },
    },
  })
  const [authReady, setAuthReady] = useState(true)
  const [userName, setUserName] = useState(initialProfile.fullName)
  const [userEmail, setUserEmail] = useState(initialProfile.email)

  useEffect(() => {
    setAuthReady(true)
    const profile = loadUserProfile()
    setUserName(profile.fullName)
    setUserEmail(profile.email)
    setSession({
      access_token: 'demo-token',
      user: { email: profile.email, user_metadata: { full_name: profile.fullName } },
    })
  }, [])

  const handleUpdateProfile = useCallback(
    (name: string, email: string) => {
      const trimmedName = name.trim() || 'Analyst'
      const trimmedEmail = email.trim() || 'demo@datalume.local'
      setUserName(trimmedName)
      setUserEmail(trimmedEmail)
      setSession(curr => ({
        ...curr,
        user: {
          ...curr.user,
          email: trimmedEmail,
          user_metadata: { ...curr.user.user_metadata, full_name: trimmedName },
        },
      }))
      localStorage.setItem(
        'datalume-user-profile',
        JSON.stringify({ fullName: trimmedName, email: trimmedEmail })
      )
      showNotice?.('Profile updated successfully.')
    },
    [showNotice]
  )

  return {
    session,
    token: session.access_token,
    authReady,
    userName,
    userEmail,
    handleUpdateProfile,
  }
}
