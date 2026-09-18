"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback
      }

      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <div className="mb-4 text-destructive">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
            Something went wrong
          </h2>
          <p className="mb-4 max-w-md text-sm text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred in this view."}
          </p>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }

  private get fallback(): ReactNode {
    return this.props.fallback
  }
}
