"use client"

import { useState } from "react"

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = (options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(options)
      setIsOpen(true)
      setResolvePromise(() => resolve)
    })
  }

  const handleConfirm = () => {
    setIsOpen(false)
    resolvePromise?.(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolvePromise?.(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    resolvePromise?.(false)
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
    handleClose,
  }
}
