"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, Minus, X, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { Order, OrderItem } from "@/lib/types"

interface ExchangeModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onExchangeCreated?: () => void
}

interface Product {
  id: string
  name: string
  price: number
  sizes: string[]
  colors?: string[]
}

export function ExchangeModal({ isOpen, onClose, order, onExchangeCreated }: ExchangeModalProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Produits sélectionnés pour l'échange
  const [returnedItems, setReturnedItems] = useState<OrderItem[]>([])
  const [newItems, setNewItems] = useState<OrderItem[]>([])
  const [notes, setNotes] = useState("")

  // Charger les produits disponibles
  useEffect(() => {
    if (isOpen) {
      loadProducts()
      // Pré-remplir avec les items de la commande originale comme produits retournés
      if (order?.items) {
        setReturnedItems(order.items.map(item => ({ ...item })))
      }
    } else {
      // Reset state when closing
      setReturnedItems([])
      setNewItems([])
      setNotes("")
    }
  }, [isOpen, order])

  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Failed to load products:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const addNewItem = (product: Product) => {
    const newItem: OrderItem = {
      product_id: product.id,
      name: product.name,
      size: product.sizes[0] || "M",
      color: product.colors?.[0] || "",
      quantity: 1,
      price: product.price
    }
    setNewItems([...newItems, newItem])
  }

  const updateItemQuantity = (items: OrderItem[], setItems: (items: OrderItem[]) => void, index: number, quantity: number, isReturnedItems = false) => {
    // Pour les produits retournés, permettre la quantité 0 (mais ne pas supprimer automatiquement)
    if (quantity < 0) {
      quantity = 0
    }

    // Pour les produits retournés, vérifier la limite de quantité originale
    if (isReturnedItems && order) {
      const originalItem = order.items.find(item =>
        item.product_id === items[index].product_id &&
        item.size === items[index].size &&
        item.color === items[index].color
      )
      if (originalItem && quantity > originalItem.quantity) {
        // Ne pas dépasser la quantité originale
        return
      }
    }

    const updatedItems = [...items]
    updatedItems[index].quantity = quantity
    setItems(updatedItems)
  }

  const updateItemProperty = <K extends keyof OrderItem>(
    items: OrderItem[],
    setItems: (items: OrderItem[]) => void,
    index: number,
    property: K,
    value: OrderItem[K]
  ) => {
    const updatedItems = [...items]
    updatedItems[index][property] = value
    setItems(updatedItems)
  }

  const calculateTotals = () => {
    const returnedTotal = returnedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const difference = Math.max(0, newTotal - returnedTotal)
    const deliveryFee = 7.00 // Frais de livraison fixes
    const total = difference + deliveryFee

    return { returnedTotal, newTotal, difference, deliveryFee, total }
  }

  const handleCreateExchange = async () => {
    if (!order) return

    // Vérifier qu'il y a au moins un produit avec quantité > 0 (retourné ou envoyé)
    const hasValidReturnedItems = returnedItems.some(item => item.quantity > 0)
    const hasValidNewItems = newItems.some(item => item.quantity > 0)

    if (!hasValidReturnedItems && !hasValidNewItems) {
      toast.error("Veuillez sélectionner au moins un produit à retourner ou à envoyer (quantité supérieure à 0).")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returned_items: returnedItems,
          new_items: newItems,
          notes: notes || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Échange créé avec succès !")
        onExchangeCreated?.()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de la création de l'échange")
      }
    } catch (error) {
      console.error("Exchange creation error:", error)
      toast.error("Erreur lors de la création de l'échange")
    } finally {
      setLoading(false)
    }
  }

  const { returnedTotal, newTotal, difference, deliveryFee, total } = calculateTotals()

  if (!order) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Créer un échange - Commande #{order.id.slice(-8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section Produits retournés */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-600">📦 Produits à retourner</h3>
            <div className="space-y-3">
              {returnedItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      Taille: {item.size} {item.color && `• Couleur: ${item.color}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(returnedItems, setReturnedItems, index, item.quantity - 1, true)}
                      disabled={item.quantity <= 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      max={order?.items.find(orig => orig.product_id === item.product_id && orig.size === item.size && orig.color === item.color)?.quantity || item.quantity}
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(returnedItems, setReturnedItems, index, Math.min(parseInt(e.target.value) || 0, order?.items.find(orig => orig.product_id === item.product_id && orig.size === item.size && orig.color === item.color)?.quantity || item.quantity), true)}
                      className="w-16 text-center"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(returnedItems, setReturnedItems, index, item.quantity + 1, true)}
                      disabled={item.quantity >= (order?.items.find(orig => orig.product_id === item.product_id && orig.size === item.size && orig.color === item.color)?.quantity || item.quantity)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <div className="font-semibold">{(item.price * item.quantity).toFixed(2)} DT</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReturnedItems(returnedItems.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {returnedItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun produit à retourner sélectionné
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Section Nouveaux produits */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-600">🛍️ Nouveaux produits à envoyer</h3>

            {/* Sélecteur de produits */}
            <div className="mb-4">
              <Label className="text-sm font-medium">Ajouter un produit :</Label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {loadingProducts ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des produits...
                  </div>
                ) : (
                  products.slice(0, 6).map((product) => (
                    <Button
                      key={product.id}
                      size="sm"
                      variant="outline"
                      onClick={() => addNewItem(product)}
                      className="text-xs"
                    >
                      {product.name} - {product.price.toFixed(2)} DT
                    </Button>
                  ))
                )}
              </div>
            </div>

            {/* Liste des nouveaux produits */}
            <div className="space-y-3">
              {newItems.map((item, index) => {
                const product = products.find(p => p.id === item.product_id)
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={item.size}
                          onChange={(e) => updateItemProperty(newItems, setNewItems, index, 'size', e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                        >
                          {product?.sizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                        {product?.colors && product.colors.length > 0 && (
                          <select
                            value={item.color}
                            onChange={(e) => updateItemProperty(newItems, setNewItems, index, 'color', e.target.value)}
                            className="text-xs border rounded px-2 py-1"
                          >
                            {product.colors.map(color => (
                              <option key={color} value={color}>{color}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(newItems, setNewItems, index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(newItems, setNewItems, index, parseInt(e.target.value) || 1)}
                        className="w-16 text-center"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(newItems, setNewItems, index, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <div className="font-semibold">{(item.price * item.quantity).toFixed(2)} DT</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNewItems(newItems.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
              {newItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun nouveau produit sélectionné
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Calcul des montants */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">💰 Récapitulatif</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-red-600">Produits retournés :</div>
                <div className="text-lg font-bold text-red-600">{returnedTotal.toFixed(2)} DT</div>
              </div>
              <div>
                <div className="text-green-600">Nouveaux produits :</div>
                <div className="text-lg font-bold text-green-600">{newTotal.toFixed(2)} DT</div>
              </div>
              <div>
                <div className="text-blue-600">Différence :</div>
                <div className="text-lg font-bold text-blue-600">{difference.toFixed(2)} DT</div>
              </div>
              <div>
                <div className="text-purple-600">Frais de livraison :</div>
                <div className="text-lg font-bold text-purple-600">{deliveryFee.toFixed(2)} DT</div>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between items-center">
              <div className="text-xl font-bold">Total à payer :</div>
              <div className="text-2xl font-bold text-blue-600">{total.toFixed(2)} DT</div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes sur cet échange..."
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleCreateExchange} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Créer l'échange
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
