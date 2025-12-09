"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, AlertTriangle, Home, Settings } from "lucide-react"
import Link from "next/link"
import type { Coupon } from "@/lib/types"

export default function EditCouponPage() {
  const router = useRouter()
  const params = useParams()
  const couponId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage" as Coupon['type'],
    value: "",
    expiration_date: "",
    max_uses: "",
    minimum_order: "0",
    description: "",
    is_active: true
  })

  useEffect(() => {
    fetchCoupon()
  }, [couponId])

  const fetchCoupon = async () => {
    try {
      const response = await fetch(`/api/coupons/${couponId}`)
      if (response.ok) {
        const coupon: Coupon = await response.json()

        // Formater les données pour le formulaire
        const formattedData = {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value?.toString() || "",
          expiration_date: coupon.expiration_date
            ? new Date(coupon.expiration_date).toISOString().slice(0, 16)
            : "",
          max_uses: coupon.max_uses?.toString() || "",
          minimum_order: coupon.minimum_order.toString(),
          description: coupon.description || "",
          is_active: coupon.is_active
        }

        setFormData(formattedData)
      } else {
        setError("Coupon non trouvé")
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err)
      setError('Erreur lors du chargement du coupon')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.code.trim()) {
      setError("Le code promo est requis")
      return
    }

    if (!formData.value && formData.type !== 'free_shipping') {
      setError("La valeur est requise pour ce type de coupon")
      return
    }

    if (!formData.expiration_date) {
      setError("La date d'expiration est obligatoire")
      return
    }

    // Vérifier que la date n'est pas dans le passé
    const expDate = new Date(formData.expiration_date)
    if (expDate <= new Date()) {
      setError("La date d'expiration doit être dans le futur")
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        expiration_date: formData.expiration_date,
        minimum_order: parseFloat(formData.minimum_order) || 0,
        description: formData.description.trim() || undefined,
        is_active: formData.is_active
      }

      if (formData.type !== 'free_shipping') {
        updateData.value = parseFloat(formData.value)
      } else {
        updateData.value = null
      }

      if (formData.max_uses) {
        updateData.max_uses = parseInt(formData.max_uses)
      } else {
        updateData.max_uses = null
      }

      const response = await fetch(`/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        router.push('/admin/coupons')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Erreur lors de la mise à jour')
      }
    } catch (err) {
      setError('Erreur serveur')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getCouponTypeDescription = () => {
    switch (formData.type) {
      case 'percentage':
        return 'Réduction en pourcentage (ex: 15 pour -15%)'
      case 'fixed':
        return 'Réduction fixe en euros (ex: 20 pour -20€)'
      case 'free_shipping':
        return 'Livraison gratuite (pas de valeur requise)'
      default:
        return ''
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900" />
      </div>
    )
  }

  if (error && !formData.code) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/admin/coupons">
            <Button variant="ghost" size="sm" className="mb-8">
              <ArrowLeft size={16} className="mr-2" />
              Retour aux coupons
            </Button>
          </Link>
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertTriangle size={48} className="mx-auto text-red-500" />
                <div>
                  <p className="text-lg font-medium text-neutral-900">Erreur de chargement</p>
                  <p className="text-neutral-600">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="flex items-center">
                  <Home size={16} className="mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div className="h-4 w-px bg-gray-300" />
              <Link href="/admin/coupons">
                <Button variant="ghost" size="sm" className="flex items-center">
                  <ArrowLeft size={16} className="mr-2" />
                  Coupons
                </Button>
              </Link>
            </div>
            <div className="flex items-center">
              <Settings size={20} className="text-gray-400 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Modifier Coupon</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Modifier le coupon</h1>
          <p className="mt-2 text-sm text-gray-600">
            {formData.code ? `Modifiez les paramètres de ${formData.code}` : 'Chargement du coupon...'}
          </p>
        </div>

        <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Paramètres du coupon</CardTitle>
          <CardDescription>
            Modifiez les informations de votre code promo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Code promo */}
              <div className="space-y-2">
                <Label htmlFor="code">Code promo *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  required
                />
                <p className="text-xs text-neutral-500">
                  Le code sera automatiquement converti en majuscules
                </p>
              </div>

              {/* Type de coupon */}
              <div className="space-y-2">
                <Label htmlFor="type">Type de réduction *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">%</Badge>
                        Pourcentage
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">€</Badge>
                        Montant fixe
                      </div>
                    </SelectItem>
                    <SelectItem value="free_shipping">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">🚚</Badge>
                        Livraison gratuite
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valeur (conditionnelle) */}
              {formData.type !== 'free_shipping' && (
                <div className="space-y-2">
                  <Label htmlFor="value">Valeur *</Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    placeholder={formData.type === 'percentage' ? '15' : '20'}
                    required
                  />
                  <p className="text-xs text-neutral-500">
                    {getCouponTypeDescription()}
                  </p>
                </div>
              )}

              {/* Date d'expiration */}
              <div className="space-y-2">
                <Label htmlFor="expiration_date">Date d'expiration *</Label>
                <Input
                  id="expiration_date"
                  type="datetime-local"
                  value={formData.expiration_date}
                  onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                  required
                />
                <p className="text-xs text-neutral-500">
                  Le coupon expire automatiquement après cette date
                </p>
              </div>

              {/* Utilisations max */}
              <div className="space-y-2">
                <Label htmlFor="max_uses">Nombre d'utilisations max</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => handleInputChange('max_uses', e.target.value)}
                  placeholder="Illimité si vide"
                />
                <p className="text-xs text-neutral-500">
                  Laisser vide pour utilisation illimitée
                </p>
              </div>

              {/* Montant minimum */}
              <div className="space-y-2">
                <Label htmlFor="minimum_order">Montant minimum (€)</Label>
                <Input
                  id="minimum_order"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimum_order}
                  onChange={(e) => handleInputChange('minimum_order', e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-neutral-500">
                  Montant minimum pour appliquer le coupon
                </p>
              </div>

              {/* Statut actif */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    Coupon actif
                  </Label>
                </div>
                <p className="text-xs text-neutral-500">
                  Désactivez pour empêcher l'utilisation temporairement
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez votre coupon pour vos clients..."
                rows={3}
              />
              <p className="text-xs text-neutral-500">
                Cette description sera visible par vos clients
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Mettre à jour
                  </>
                )}
              </Button>
              <Link href="/admin/coupons">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
