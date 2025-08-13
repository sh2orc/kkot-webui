"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type TimezoneContextType = {
  gmtOffsetMinutes: number
  setGmtOffsetMinutes: (offset: number) => void
  formatTime: (date: Date, locale?: string, options?: Intl.DateTimeFormatOptions) => string
  formatDate: (date: Date, locale?: string, options?: Intl.DateTimeFormatOptions) => string
  shiftToGmtDate: (date: Date) => Date
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

function getBrowserGmtOffsetMinutes(): number {
  // getTimezoneOffset: minutes ahead of UTC are negative (e.g., Seoul returns -540)
  // We store offset as minutes from UTC (positive for east of GMT)
  return -new Date().getTimezoneOffset()
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function shiftDateByOffset(date: Date, targetOffsetMinutes: number): Date {
  // Display the given instant as if it were in the target GMT offset by
  // shifting the timestamp so that local rendering matches the target zone time.
  // delta = targetOffset - localOffset
  const localOffsetMinutes = -new Date().getTimezoneOffset()
  const deltaMinutes = targetOffsetMinutes - localOffsetMinutes
  const shiftedMs = date.getTime() + deltaMinutes * 60_000
  return new Date(shiftedMs)
}

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [gmtOffsetMinutes, setGmtOffsetMinutes] = useState<number>(getBrowserGmtOffsetMinutes())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin-settings?key=system.gmtOffsetMinutes')
        if (!res.ok) {
          // If not found, just keep browser default locally
          return
        }
        const data = await res.json()
        const value = parseInt(data?.value ?? '', 10)
        if (!Number.isNaN(value) && !cancelled) {
          setGmtOffsetMinutes(value)
        }
      } catch {
        // ignore and fallback to browser offset
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const shiftToGmtDate = useCallback((date: Date) => shiftDateByOffset(date, gmtOffsetMinutes), [gmtOffsetMinutes])

  const formatTime = useCallback((date: Date, locale = 'ko-KR', options?: Intl.DateTimeFormatOptions) => {
    const shifted = shiftToGmtDate(date)
    return shifted.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', ...(options || {}) })
  }, [shiftToGmtDate])

  const formatDate = useCallback((date: Date, locale = 'ko-KR', options?: Intl.DateTimeFormatOptions) => {
    const shifted = shiftToGmtDate(date)
    return shifted.toLocaleDateString(locale, options)
  }, [shiftToGmtDate])

  const value = useMemo(() => ({
    gmtOffsetMinutes,
    setGmtOffsetMinutes,
    formatTime,
    formatDate,
    shiftToGmtDate,
  }), [gmtOffsetMinutes, formatTime, formatDate, shiftToGmtDate])

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone(): TimezoneContextType {
  const ctx = useContext(TimezoneContext)
  if (!ctx) throw new Error('useTimezone must be used within a TimezoneProvider')
  return ctx
}

export function formatGmtLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `GMT${sign}${pad2(hours)}:${pad2(mins)}`
}

export function formatGmtWithCity(offsetMinutes: number, city?: string | null): string {
  const base = formatGmtLabel(offsetMinutes)
  return city ? `${base} (${city.toUpperCase()})` : base
}


