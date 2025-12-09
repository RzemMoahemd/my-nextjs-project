"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/hooks/use-toast"
import { CouponInput } from "@/components/coupon-input"
import { X } from "lucide-react"

export default function CartPage() {
  const { items, subtotal, coupon, discount, freeShipping, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCart()
  const { toast } = useToast()
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0)
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false)

  useEffect(() => {
    let mounted = true
    
    // Récupérer les frais de livraison
    fetch("/api/settings/delivery-fee")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setDeliveryFee(Number(data.amount ?? 0))
        }
      })
      .catch(() => setDeliveryFee(0))

    // Récupérer les paramètres de livraison gratuite
    fetch("/api/settings/free-shipping")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setFreeShippingThreshold(Number(data.threshold ?? 0))
          setFreeShippingEnabled(Boolean(data.enabled ?? false))
        }
      })
      .catch(() => {
        setFreeShippingThreshold(0)
        setFreeShippingEnabled(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Calculer les frais de livraison en fonction des paramètres et du coupon
  const hasFreeShippingFromCoupon = coupon && freeShipping
  const hasEligibleFreeShipping = freeShippingEnabled && subtotal >= freeShippingThreshold
  const calculatedDeliveryFee = items.length > 0 && (hasFreeShippingFromCoupon || hasEligibleFreeShipping) ? 0 : deliveryFee

  // Calculer le total avec les remises
  const subtotalAfterDiscount = Math.max(0, subtotal - discount)
  const total = items.length > 0 ? subtotalAfterDiscount + calculatedDeliveryFee : 0

  const handleQuantityChange = async (productId: string, size: string, value: number) => {
    try {
      await updateQuantity(productId, size, value)
    } catch (error: any) {
      if (error?.name === "INSUFFICIENT_STOCK" || error?.message?.includes("épuisée")) {
        toast({
          title: "Quantité disponible épuisée",
          description: "La quantité demandée n'est plus disponible en stock.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Impossible de mettre à jour",
          description: "Veuillez réessayer.",
        })
      }
      console.error(error)
    }
  }

  const handleRemove = async (productId: string, size: string) => {
    try {
      await removeItem(productId, size)
    } catch (error) {
      toast({
        title: "Suppression impossible",
        description: "Réessayez dans quelques instants.",
      })
      console.error(error)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-neutral-900 mb-6">Votre panier</h1>

          {items.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-lg p-10 text-center">
              <p className="text-neutral-600 mb-4">Votre panier est vide pour le moment.</p>
              <Link
                href="/products"
                className="inline-flex px-5 py-3 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition"
              >
                Voir les produits
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="bg-white border border-neutral-200 rounded-lg p-4 flex gap-4">
                    <div className="w-24 h-24 relative rounded-md overflow-hidden bg-neutral-100 flex-shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">Aperçu</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-neutral-900">{item.name}</h3>
                          <p className="text-sm text-neutral-500">Taille : {item.size}</p>
                        </div>
                        <button
                          onClick={() => handleRemove(item.productId, item.size)}
                          className="text-neutral-400 hover:text-neutral-900"
                          aria-label="Supprimer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <p className="text-sm text-neutral-500">Quantité</p>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(item.productId, item.size, Number.parseInt(e.target.value, 10) || 1)
                            }
                            className="w-20 border border-neutral-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>
                        <p className="ml-auto text-lg font-semibold text-neutral-900">
                          {(item.price * item.quantity).toFixed(2)} DT
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-6 h-fit space-y-6">
                <h2 className="text-xl font-semibold text-neutral-900">Récapitulatif</h2>

                {/* Code promo */}
                <CouponInput
                  onCouponApplied={applyCoupon}
                  onCouponRemoved={removeCoupon}
                  subtotal={subtotal}
                  appliedCoupon={coupon}
                  freeShipping={freeShipping}
                />

                {/* Détails du prix */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-neutral-700">
                    <span>Sous-total</span>
                    <span>{subtotal.toFixed(2)} DT</span>
                  </div>

                  {/* Remise coupon */}
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Remise coupon</span>
                      <span>-{discount.toFixed(2)} DT</span>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-700">
                    <span>Frais de livraison</span>
                    <span>
                      {calculatedDeliveryFee === 0 ? (
                        hasFreeShippingFromCoupon ? (
                          <span className="text-green-600 font-semibold">Gratuit (Coupon)</span>
                        ) : hasEligibleFreeShipping ? (
                          <span className="text-green-600 font-semibold">Gratuit ✓</span>
                        ) : (
                          `${calculatedDeliveryFee.toFixed(2)} DT`
                        )
                      ) : (
                        `${calculatedDeliveryFee.toFixed(2)} DT`
                      )}
                    </span>
                  </div>

                  {/* Indication livraison gratuite */}
                  {!hasFreeShippingFromCoupon && freeShippingEnabled && subtotal < freeShippingThreshold && freeShippingThreshold > 0 && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      Plus que {(freeShippingThreshold - subtotalAfterDiscount).toFixed(2)} DT pour la livraison gratuite !
                    </div>
                  )}

                  <div className="flex justify-between text-xl font-bold text-neutral-900 border-t pt-3">
                    <span>Total</span>
                    <span>{total.toFixed(2)} DT</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="w-full inline-flex justify-center bg-neutral-900 text-white py-3 rounded-lg font-semibold hover:bg-neutral-800 transition"
                >
                  Passer au paiement
                </Link>
                <p className="text-xs text-neutral-500 text-center">
                  Le paiement se fait après confirmation par téléphone.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
