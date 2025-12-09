"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Tag, Home, Settings, BarChart3 } from "lucide-react"
import type { Coupon } from "@/lib/types"
import Link from "next/link"

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/coupons')
      if (response.ok) {
        const data = await response.json()
        setCoupons(data)
      } else {
        const errorText = await response.text()
        console.error('Error:', response.status, errorText)
        alert(`Erreur ${response.status}: ${errorText}`)
      }
    } catch (error: any) {
      console.error('Network error:', error)
      alert(`Erreur: ${error?.message || 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce coupon ?')) return

    try {
      const response = await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setCoupons(coupons.filter(c => c.id !== id))
      } else {
        console.error('Erreur lors de la suppression API:', response.status)
        alert('Erreur lors de la suppression du coupon')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur serveur lors de la suppression')
    }
  }

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active })
      })
      if (response.ok) {
        setCoupons(coupons.map(c =>
          c.id === coupon.id ? { ...c, is_active: !c.is_active } : c
        ))
      } else {
        console.error('Erreur lors du toggle API:', response.status)
        alert('Erreur lors de la mise à jour du coupon')
      }
    } catch (error) {
      console.error('Erreur lors du toggle:', error)
      alert('Erreur serveur lors de la mise à jour')
    }
  }

  // Statistiques rapides
  const activeCoupons = coupons.filter(c => c.is_active).length
  const totalRedeems = coupons.reduce((sum, c) => sum + c.current_uses, 0)

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header avec navigation */}
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
              <div className="flex items-center">
                <Tag size={20} className="text-blue-600 mr-2" />
                <h1 className="text-xl font-semibold text-gray-900">Coupons</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  <BarChart3 size={16} className="mr-2" />
                  Statistiques
                </Button>
              </Link>
              <Link href="/admin/coupons/new">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus size={16} className="mr-2" />
                  Nouveau Coupon
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Coupons</h1>
          <p className="mt-2 text-sm text-gray-600">
            Créez et gérez vos codes promotionnels pour attirer plus de clients
          </p>
        </div>

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Tag size={24} className="text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{coupons.length}</div>
                    <div className="text-sm text-gray-600">Total coupons</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Settings size={24} className="text-green-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{activeCoupons}</div>
                    <div className="text-sm text-gray-600">Coupons actifs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 size={24} className="text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{totalRedeems}</div>
                    <div className="text-sm text-gray-600">Utilisations totales</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <Tag size={48} />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Aucun coupon créé
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Commencez par créer votre premier code promo pour offrir des réductions à vos clients.
                </p>
                <div className="mt-6">
                  <Link href="/admin/coupons/new">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <Plus size={20} className="mr-2" />
                      Créer votre premier coupon
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {coupons.map((coupon) => (
              <Card key={coupon.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {coupon.type === 'percentage' && (
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <span className="text-blue-600 font-bold text-lg">%</span>
                          </div>
                        )}
                        {coupon.type === 'fixed' && (
                          <div className="p-2 bg-green-100 rounded-lg">
                            <span className="text-green-600 font-bold">€</span>
                          </div>
                        )}
                        {coupon.type === 'free_shipping' && (
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <span className="text-purple-600 text-lg">🚚</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <CardTitle className="font-mono text-xl text-gray-900 mb-1">
                          {coupon.code}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {coupon.description || getCouponDescription(coupon)}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={coupon.type === 'percentage' ? 'default' :
                               coupon.type === 'fixed' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {coupon.type === 'percentage' && `${coupon.value}% de réduction`}
                        {coupon.type === 'fixed' && `${coupon.value}€ de réduction`}
                        {coupon.type === 'free_shipping' && 'Livraison gratuite'}
                      </Badge>
                      <Badge variant={coupon.is_active ? 'default' : 'destructive'}>
                        {coupon.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {coupon.expiration_date && (
                      <div className="flex items-center">
                        <div className="mr-3 h-5 w-5 text-gray-400">
                          📅
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Expiration</div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(coupon.expiration_date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    )}

                    {coupon.max_uses && (
                      <div className="flex items-center">
                        <div className="mr-3 h-5 w-5 text-gray-400">
                          🔄
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Utilisations</div>
                          <div className="text-sm font-medium text-gray-900">
                            {coupon.current_uses}/{coupon.max_uses}
                          </div>
                        </div>
                      </div>
                    )}

                    {coupon.minimum_order > 0 && (
                      <div className="flex items-center">
                        <div className="mr-3 h-5 w-5 text-gray-400">
                          💰
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Minimum</div>
                          <div className="text-sm font-medium text-gray-900">
                            {coupon.minimum_order}€
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <div className="mr-3 h-5 w-5 text-gray-400">
                        ⏰
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Créé</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(coupon.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCoupon(coupon)}
                      className={coupon.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                    >
                      {coupon.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Link href={`/admin/coupons/${coupon.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit size={14} className="mr-1" />
                        Modifier
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCoupon(coupon.id)}
                      className="text-red-600 hover:text-red-800 hover:border-red-800"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getCouponDescription(coupon: Coupon): string {
  if (coupon.type === 'percentage') {
    return `${coupon.value}% de réduction sur ${coupon.minimum_order > 0 ? `commandes à partir de ${coupon.minimum_order}€` : 'toutes les commandes'}`
  } else if (coupon.type === 'fixed') {
    return `${coupon.value}€ de réduction sur ${coupon.minimum_order > 0 ? `commandes à partir de ${coupon.minimum_order}€` : 'toutes les commandes'}`
  } else if (coupon.type === 'free_shipping') {
    return `Livraison gratuite sur ${coupon.minimum_order > 0 ? `commandes à partir de ${coupon.minimum_order}€` : 'toutes les commandes'}`
  }
  return ''
}
