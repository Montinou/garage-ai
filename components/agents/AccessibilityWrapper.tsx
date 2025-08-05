"use client"

import React from "react"

interface AccessibilityWrapperProps {
  children: React.ReactNode
  className?: string
  role?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  tabIndex?: number
}

export function AccessibilityWrapper({
  children,
  className = "",
  role,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  tabIndex
}: AccessibilityWrapperProps) {
  return (
    <div
      className={`focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${className}`}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      tabIndex={tabIndex}
    >
      {children}
    </div>
  )
}

// Skip link component for keyboard navigation
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md"
    >
      {children}
    </a>
  )
}

// Loading skeleton with proper ARIA labels
export function LoadingSkeleton({ 
  count = 1, 
  height = "h-4", 
  ariaLabel = "Loading content" 
}: { 
  count?: number
  height?: string
  ariaLabel?: string 
}) {
  return (
    <div role="status" aria-label={ariaLabel} className="animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-muted rounded ${height} mb-2`} />
      ))}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  )
}

// Status indicator with accessible text
export function StatusIndicator({ 
  status, 
  variant = "dot" 
}: { 
  status: "healthy" | "warning" | "error" | "unknown"
  variant?: "dot" | "badge"
}) {
  const statusConfig = {
    healthy: {
      color: "bg-green-500",
      text: "System is healthy",
      textColor: "text-green-600"
    },
    warning: {
      color: "bg-yellow-500", 
      text: "System has warnings",
      textColor: "text-yellow-600"
    },
    error: {
      color: "bg-red-500",
      text: "System has errors", 
      textColor: "text-red-600"
    },
    unknown: {
      color: "bg-gray-500",
      text: "System status unknown",
      textColor: "text-gray-600"
    }
  }

  const config = statusConfig[status]

  if (variant === "dot") {
    return (
      <div className="flex items-center space-x-2">
        <div 
          className={`w-2 h-2 rounded-full ${config.color}`}
          aria-hidden="true"
        />
        <span className="sr-only">{config.text}</span>
      </div>
    )
  }

  return (
    <span 
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.textColor} bg-current/10`}
      role="status"
      aria-label={config.text}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${config.color} mr-1`} aria-hidden="true" />
      {status}
    </span>
  )
}

// Responsive table wrapper
export function ResponsiveTable({ 
  children, 
  ariaLabel 
}: { 
  children: React.ReactNode
  ariaLabel: string 
}) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div 
          className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"
          role="region"
          aria-label={ariaLabel}
          tabIndex={0}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Keyboard shortcut helper
export function KeyboardShortcut({ 
  keys, 
  description 
}: { 
  keys: string[]
  description: string 
}) {
  return (
    <div 
      className="flex items-center space-x-2 text-sm text-muted-foreground"
      role="note"
      aria-label={`Keyboard shortcut: ${keys.join(' + ')} - ${description}`}
    >
      <span>{description}:</span>
      <div className="flex items-center space-x-1">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="text-muted-foreground">+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// Mobile-friendly card layout
export function ResponsiveCard({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`
      bg-card text-card-foreground rounded-lg border shadow-sm
      p-4 sm:p-6
      space-y-4 sm:space-y-6
      ${className}
    `}>
      {children}
    </div>
  )
}

// Screen reader only text
export function SROnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}