"use client"

import { useConfirmDialog, type ConfirmDialogOptions } from "@/hooks/use-confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, Info, AlertCircle } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  options: ConfirmDialogOptions | null
  onConfirm: () => void
  onCancel: () => void
  onClose: () => void
}

export function ConfirmDialog({
  isOpen,
  options,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  if (!options) return null

  const {
    title,
    description,
    confirmText = "Confirmer",
    variant = "default",
  } = options

  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "default":
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white rounded-2xl shadow-2xl p-0 border-0 overflow-hidden">

        {/* Header */}
        <div className="p-6 pb-4">
          <DialogHeader className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-50 rounded-xl border">
                {getIcon()}
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {title}
              </DialogTitle>
            </div>

            {description && (
              <DialogDescription className="text-sm text-gray-700">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <DialogFooter className="flex gap-3 mt-4">
            {/* ✅ Bouton UX */}
            <Button
              variant="ghost"
              onClick={onCancel}
              className="flex-1"
            >
              Retour
            </Button>

            {/* ✅ Bouton action */}
            <Button
              onClick={onConfirm}
              className={`flex-1 font-semibold ${
                variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useConfirmDialogWithUI() {
  const dialog = useConfirmDialog()
  return { ...dialog }
}
