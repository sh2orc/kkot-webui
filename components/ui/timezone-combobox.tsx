"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatGmtLabel } from "@/components/providers/timezone-provider"
import { TIMEZONES } from "@/components/ui/timezone-data"

// Generate offsets from -12:00 to +14:00 (some regions use +14)
function buildOffsets(): number[] {
  const list: number[] = []
  // Quarter-hour aware regions exist; we include 15-minute steps for completeness
  for (let m = -12 * 60; m <= 14 * 60; m += 15) {
    list.push(m)
  }
  return list
}

const OFFSETS = buildOffsets()

export default function TimezoneCombobox({
  value,
  onChange,
  placeholder = 'Select GMT',
}: {
  value: number | null
  onChange: (value: number) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const listRef = useRef<HTMLDivElement | null>(null)

  const items = useMemo(() => {
    const byOffset = new Map<number, string>()
    TIMEZONES.forEach(tz => {
      const base = `${formatGmtLabel(tz.offsetMinutes)} (${tz.primaryCity.toUpperCase()})`
      byOffset.set(tz.offsetMinutes, base)
    })
    return OFFSETS.map((m) => {
      const label = byOffset.get(m) || formatGmtLabel(m)
      return { value: m, label }
    })
  }, [])

  const current = useMemo(() => items.find((i) => i.value === value) || null, [items, value])

  // Ensure scroll is at top whenever query changes
  useEffect(() => {
    if (listRef.current) {
      // Use rAF to wait for filtered render to apply
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = 0
      })
    }
  }, [query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {current ? current.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search GMT / City"
            value={query}
            onValueChange={(v) => setQuery(v)}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map(({ value: v, label }) => (
                <CommandItem
                  key={v}
                  value={`${label} ${TIMEZONES.find(t => t.offsetMinutes === v)?.cities.join(' ') || ''}`}
                  onSelect={() => {
                    onChange(v)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{label}</span>
                    {TIMEZONES.find(t => t.offsetMinutes === v)?.cities?.length ? (
                      <span className="text-xs text-muted-foreground">
                        {TIMEZONES.find(t => t.offsetMinutes === v)!.cities.join(', ')}
                      </span>
                    ) : null}
                  </div>
                  <Check className={cn("ml-auto h-4 w-4", v === value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


