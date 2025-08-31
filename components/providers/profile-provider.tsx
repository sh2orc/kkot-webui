"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useImagePreload } from '@/hooks/use-image-preload'

interface UserProfile {
  id: string
  username: string
  email: string
  role: string
  profileImage?: string | null
  createdAt: string
}

interface ProfileContextType {
  userProfile: UserProfile | null
  profileImage: string | null
  isImageLoaded: boolean
  updateProfile: (profile: UserProfile) => void
  updateProfileImage: (imageUrl: string | null) => void
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

interface ProfileProviderProps {
  children: ReactNode
  initialProfile?: UserProfile | null
}

export function ProfileProvider({ children, initialProfile }: ProfileProviderProps) {
  const { data: session, status } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile || null)
  const [profileImage, setProfileImage] = useState<string | null>(initialProfile?.profileImage || null)
  const isImageLoaded = useImagePreload(profileImage)

  const updateProfile = (profile: UserProfile) => {
    setUserProfile(profile)
    // Only update profile image if it's different to prevent unnecessary re-renders
    if (profile.profileImage !== profileImage) {
      setProfileImage(profile.profileImage || null)
    }
  }

  const updateProfileImage = (imageUrl: string | null) => {
    setProfileImage(imageUrl)
    if (userProfile) {
      setUserProfile({ ...userProfile, profileImage: imageUrl })
    }
  }

  const refreshProfile = async () => {
    if (!session?.user?.email) return

    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        updateProfile(data.user)
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error)
    }
  }

  // Load profile on session change
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      refreshProfile()
    }
  }, [status, session?.user?.email])

  // Update profile image when userProfile changes
  useEffect(() => {
    if (userProfile?.profileImage !== profileImage) {
      setProfileImage(userProfile?.profileImage || null)
    }
  }, [userProfile?.profileImage])

  return (
    <ProfileContext.Provider
      value={{
        userProfile,
        profileImage,
        isImageLoaded,
        updateProfile,
        updateProfileImage,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}
