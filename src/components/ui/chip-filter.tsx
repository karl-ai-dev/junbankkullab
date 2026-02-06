'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChipOption {
  value: string
  label: string
  icon?: string
  count?: number
}

interface ChipFilterProps {
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  multiple?: boolean
  className?: string
}

export function ChipFilter({
  options,
  value,
  onChange,
  multiple = false,
  className,
}: ChipFilterProps) {
  const handleClick = (optionValue: string) => {
    if (multiple) {
      // 다중 선택: 토글
      if (value.includes(optionValue)) {
        onChange(value.filter(v => v !== optionValue))
      } else {
        onChange([...value, optionValue])
      }
    } else {
      // 단일 선택
      onChange([optionValue])
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value)
        
        return (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
              "transition-all duration-200 ease-out",
              "border",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border",
              // 클릭 애니메이션
              "active:scale-95"
            )}
          >
            {option.icon && <span>{option.icon}</span>}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-xs tabular-nums",
                isSelected 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-background text-foreground"
              )}>
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
