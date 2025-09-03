"use client"

import React, { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Clock, Settings, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// JWT 만료시간 옵션들 (초 단위)
const JWT_PRESETS = [
  { label: "30분", value: 30 * 60, description: "짧은 세션용" },
  { label: "1시간", value: 60 * 60, description: "일반적인 웹 사용" },
  { label: "4시간", value: 4 * 60 * 60, description: "업무 시간" },
  { label: "12시간", value: 12 * 60 * 60, description: "반나절" },
  { label: "1일", value: 24 * 60 * 60, description: "하루 종일" },
  { label: "7일", value: 7 * 24 * 60 * 60, description: "일주일" },
  { label: "30일", value: 30 * 24 * 60 * 60, description: "한 달 (기본값)" },
  { label: "무제한", value: -1, description: "만료되지 않음" },
]

// 시간 단위 변환
const TIME_UNITS = [
  { label: "초", value: "seconds", multiplier: 1 },
  { label: "분", value: "minutes", multiplier: 60 },
  { label: "시간", value: "hours", multiplier: 60 * 60 },
  { label: "일", value: "days", multiplier: 24 * 60 * 60 },
]

interface JWTExpirySelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function JWTExpirySelector({ value, onChange, className }: JWTExpirySelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [customValue, setCustomValue] = useState<string>('')
  const [customUnit, setCustomUnit] = useState<string>('hours')

  // 현재 값이 프리셋 중 하나인지 확인
  useEffect(() => {
    const numericValue = parseInt(value || '-1')
    const isPreset = JWT_PRESETS.some(preset => preset.value === numericValue)
    
    if (isPreset) {
      setMode('preset')
    } else {
      setMode('custom')
      // 커스텀 값으로 변환
      if (numericValue > 0) {
        const days = Math.floor(numericValue / (24 * 60 * 60))
        const hours = Math.floor(numericValue / (60 * 60))
        const minutes = Math.floor(numericValue / 60)
        
        if (days > 0 && numericValue % (24 * 60 * 60) === 0) {
          setCustomValue(days.toString())
          setCustomUnit('days')
        } else if (hours > 0 && numericValue % (60 * 60) === 0) {
          setCustomValue(hours.toString())
          setCustomUnit('hours')
        } else if (minutes > 0 && numericValue % 60 === 0) {
          setCustomValue(minutes.toString())
          setCustomUnit('minutes')
        } else {
          setCustomValue(numericValue.toString())
          setCustomUnit('seconds')
        }
      }
    }
  }, [value])

  // 커스텀 값이나 단위가 변경될 때마다 업데이트
  useEffect(() => {
    if (mode === 'custom') {
      const numValue = parseInt(customValue || '0')
      const unit = TIME_UNITS.find(u => u.value === customUnit)
      if (unit && numValue > 0) {
        const seconds = numValue * unit.multiplier
        onChange(seconds.toString())
      }
    }
  }, [customValue, customUnit, mode, onChange])

  // 현재 설정에 대한 간단한 설명
  const getCurrentDescription = () => {
    const numericValue = parseInt(value || '-1')
    
    if (numericValue === -1) return "무제한"
    if (numericValue <= 0) return "잘못된 값"

    const days = Math.floor(numericValue / (24 * 60 * 60))
    const hours = Math.floor((numericValue % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((numericValue % (60 * 60)) / 60)

    if (days > 0) return `${days}일${hours > 0 ? ` ${hours}시간` : ''}`
    if (hours > 0) return `${hours}시간${minutes > 0 ? ` ${minutes}분` : ''}`
    if (minutes > 0) return `${minutes}분`
    return `${numericValue}초`
  }

  return (
    <div className={className}>
      <Tabs value={mode} onValueChange={(value) => setMode(value as 'preset' | 'custom')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preset" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            일반 설정
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            사용자 정의
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="mt-3 space-y-3">
          {/* 컴팩트한 프리셋 버튼들 */}
          <div className="grid grid-cols-4 gap-2">
            {JWT_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={parseInt(value || '-1') === preset.value ? "secondary" : "outline"}
                size="sm"
                className={`h-auto p-2 flex flex-col items-center transition-colors ${
                  parseInt(value || '-1') === preset.value 
                    ? 'bg-blue-100 border-blue-300 hover:bg-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onChange(preset.value.toString())}
              >
                <span className="text-xs font-medium">{preset.label}</span>
                <span className="text-xs opacity-70">{preset.description}</span>
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="1"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="숫자 입력"
                className="w-32"
              />
              <Select value={customUnit} onValueChange={setCustomUnit}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {customValue && parseInt(customValue) > 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                = {(parseInt(customValue) * (TIME_UNITS.find(u => u.value === customUnit)?.multiplier || 1)).toLocaleString()}초
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 현재 설정 표시 */}
      <div className="mt-2 p-2 bg-gray-50 rounded-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-600">현재:</span>
          <Badge variant="secondary" className="text-xs">
            {getCurrentDescription()}
          </Badge>
        </div>
        <span className="text-xs text-gray-400">
          {parseInt(value || '0').toLocaleString()}초
        </span>
      </div>
    </div>
  )
}
