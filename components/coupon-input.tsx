"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Tag, X, Check } from "lucide-react"
import type { Coupon } from "@/lib/types"

interface CouponInputProps {
  onCouponApplied: (coupon: Coupon, discount: number, freeShipping: boolean) => void
  onCouponRemoved: () => void
  subtotal: number
  appliedCoupon?: Coupon
  freeShipping?: boolean
}

export function CouponInput({
  onCouponApplied,
  onCouponRemoved,
  subtotal,
  appliedCoupon,
  freeShipping = false
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const applyCoupon = async () => {
    if (!couponCode.trim()) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          subtotal
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Coupon invalide')
      }

      const data = await response.json()

      // Calculer la réduction
      const coupon = data.coupon as Coupon
      let discount = 0
      let isFreeShipping = false

      if (coupon.type === 'percentage') {
        discount = (subtotal * (coupon.value! / 100))
      } else if (coupon.type === 'fixed') {
        discount = Math.min(coupon.value!, subtotal)
      } else if (coupon.type === 'free_shipping') {
        isFreeShipping = true
      }

      onCouponApplied(coupon, discount, isFreeShipping)
      setCouponCode("")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation')
    } finally {
      setLoading(false)
    }
  }

  const removeCoupon = () => {
    onCouponRemoved()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyCoupon()
    }
  }

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-green-600" />
            <span className="font-medium text-green-800">Coupon appliqué</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Tag size={12} className="mr-1" />
              {appliedCoupon.code}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeCoupon}
            className="text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="text-sm text-green-700">
          {appliedCoupon.description || getDiscountDescription(appliedCoupon, subtotal)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700">
        Code promo
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Entrez votre code promo"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          className={`flex-1 ${error ? 'border-red-300 focus:border-red-500' : ''}`}
          disabled={loading}
        />
        <Button
          onClick={applyCoupon}
          disabled={loading || !couponCode.trim()}
          variant="outline"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Appliquer'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

function getDiscountDescription(coupon: Coupon, subtotal: number): string {
  if (coupon.type === 'percentage') {
    return `${coupon.value}% de réduction`
  } else if (coupon.type === 'fixed') {
    return `${coupon.value}€ de réduction`
  } else if (coupon.type === 'free_shipping') {
    return 'Livraison gratuite'
  }
  return ''
}
