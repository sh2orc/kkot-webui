"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TextSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
  onText?: string
  offText?: string
}

const TextSwitch = React.forwardRef<
  HTMLButtonElement,
  TextSwitchProps
>(({ className, checked, onCheckedChange, disabled, onText = "ON", offText = "OFF", ...props }, ref) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 min-w-[50px] px-3 items-center justify-center rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked 
          ? "bg-green-600 text-primary-foreground hover:bg-green-600/90 hover:text-white" 
          : "bg-secondary text-secondary-foreground hover:bg-gray-300/80 border border-input",
        className
      )}
      ref={ref}
      {...props}
    >
      {checked ? onText : offText}
    </button>
  )
})

TextSwitch.displayName = "TextSwitch"

export { TextSwitch }
