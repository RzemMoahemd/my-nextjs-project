"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/hooks/use-toast"

export default function CheckoutPage() {
  const { items, subtotal, coupon, discount, freeShipping, clearCart } = useCart()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0)
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    address: "",
    postal_code: "",
    city: "",
    notes: "",
  })

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart")
    }
  }, [items, router])

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

    // Récupérer le profil utilisateur pour pré-remplir le formulaire
    fetch("/api/user/profile")
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error("Non autorisé")
      })
      .then((profile) => {
        if (mounted) {
          setUserProfile(profile)
          // Pré-remplir le formulaire avec les informations du profil
          setFormData({
            customer_name: profile.full_name || "",
            customer_phone: profile.phone || "",
            customer_email: "", // L'email n'est pas dans le profil, il vient de auth
            address: profile.address || "",
            postal_code: profile.postal_code || "",
            city: profile.city || "",
            notes: "",
          })
        }
      })
      .catch((error) => {
        console.log("Utilisateur non connecté ou profil non trouvé:", error)
        setUserProfile(null)
      })
      .finally(() => {
        if (mounted) {
          setProfileLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  // Calculer les frais de livraison en fonction des paramètres et du coupon
  const calculatedDeliveryFee = useMemo(() => {
    if (items.length === 0) return 0

    // Priorité au coupon de livraison gratuite
    if (coupon && freeShipping) {
      return 0
    }

    // Sinon, livraison gratuite par seuil
    if (freeShippingEnabled && subtotal >= freeShippingThreshold) {
      return 0
    }

    return deliveryFee
  }, [items.length, subtotal, freeShippingEnabled, freeShippingThreshold, deliveryFee, coupon, freeShipping])

  // Calculer le total avec les remises
  const subtotalAfterDiscount = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount])
  const total = useMemo(() => subtotalAfterDiscount + calculatedDeliveryFee, [subtotalAfterDiscount, calculatedDeliveryFee])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    setLoading(true)

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email || undefined,
          address: formData.address,
          postal_code: formData.postal_code || undefined,
          city: formData.city,
          notes: formData.notes || undefined,
          items: items.map((item) => ({
            product_id: item.productId,
            name: item.name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
          })),
          reservations: items.map((item) => item.reservationId),
          // Inclure les informations du coupon si appliqué
          ...(coupon && {
            coupon: {
              code: coupon.code,
              discount,
              freeShipping,
            }
          }),
        }),
      })

      if (!res.ok) {
        throw new Error("Erreur lors de l'envoi de la commande")
      }

      await clearCart()
      toast({
        title: "Commande envoyée",
        description: "Nous vous contacterons rapidement pour confirmer la livraison.",
      })
      router.push("/products")
    } catch (error) {
      console.error(error)
      toast({
        title: "Impossible de finaliser",
        description: "Veuillez réessayer dans quelques instants.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-neutral-900 mb-6">Finaliser ma commande</h1>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Nom complet *</label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="Ex: Sarah Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Téléphone *</label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Email (optionnel)</label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Adresse *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="123 Rue de la Paix"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">Code postal (optionnel)</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="75001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">Ville *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Notes (optionnel)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="Instructions spéciales, détails supplémentaires..."
                />
              </div>

              <button
                type="submit"
                disabled={items.length === 0 || loading}
                className="w-full bg-neutral-900 text-white py-3 rounded-lg font-semibold hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Envoi..." : "Confirmer ma commande"}
              </button>
              <p className="text-xs text-neutral-500">
                Aucun paiement en ligne : nous confirmons d'abord la commande avec vous par téléphone.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-6 h-fit">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Récapitulatif</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}-${item.color}`} className="flex justify-between text-sm text-neutral-700">
                    <div>
                      <p className="font-medium text-neutral-900">{item.name}</p>
                      <p>
                        {item.color && `${item.color}, `}Taille {item.size} — {item.quantity} pièce{item.quantity > 1 ? "s" : ""}
                      </p>
                    </div>
                     <p className="font-semibold text-neutral-900">{(item.price * item.quantity).toFixed(2)} DT</p>
                  </div>
                ))}

                {/* Détails des prix avec remises */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-neutral-700">
                    <span>Sous-total</span>
                    <span>{subtotal.toFixed(2)} DT</span>
                  </div>

                  {/* Remise coupon */}
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Remise coupon ({coupon?.code})</span>
                      <span>-{discount.toFixed(2)} DT</span>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-700">
                    <span>Frais de livraison</span>
                    <span>
                      {calculatedDeliveryFee === 0 ? (
                        coupon && freeShipping ? (
                          <span className="text-green-600 font-semibold">Gratuit (Coupon)</span>
                        ) : freeShippingEnabled && subtotal >= freeShippingThreshold ? (
                          <span className="text-green-600 font-semibold">Gratuit ✓</span>
                        ) : (
                          `${calculatedDeliveryFee.toFixed(2)} DT`
                        )
                      ) : (
                        `${calculatedDeliveryFee.toFixed(2)} DT`
                      )}
                    </span>
                  </div>

                  {/* Indications de livraison gratuite */}
                  {!coupon && freeShippingEnabled && subtotal < freeShippingThreshold && freeShippingThreshold > 0 && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      Plus que {(freeShippingThreshold - subtotal).toFixed(2)} DT pour la livraison gratuite !
                    </div>
                  )}

                  <div className="flex justify-between text-xl font-bold text-neutral-900 border-t pt-3">
                    <span>Total</span>
                    <span>{total.toFixed(2)} DT</span>
                  </div>

                  {/* Info coupon appliqué */}
                  {coupon && (
                    <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                      🎉 {coupon.description || `${coupon.code} appliqué`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
