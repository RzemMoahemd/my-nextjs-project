"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import Link from "next/link"
import { ChevronLeft, Trash2 } from "lucide-react"
import type { Product } from "@/lib/types"

export default function EditProductPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    promotional_price: "",
    category: "",
    subcategory: "",
    subsubcategory: "",
    sku: "",
    badge: "",
    low_stock_threshold: "5",
    is_active: true,
  })
  const [sizes, setSizes] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [variants, setVariants] = useState<Array<{ color: string; size: string; quantity: number }>>([])
  const [newSize, setNewSize] = useState("")

  // Couleurs prédéfinies avec leurs codes hexadécimaux
  const availableColors = [
    { name: 'aucune_couleur', displayName: 'Aucune Couleur', hex: '#F3F4F6', isSpecial: true },
    { name: 'Noir', hex: '#000000' },
    { name: 'Blanc', hex: '#FFFFFF' },
    { name: 'Rouge', hex: '#DC2626' },
    { name: 'Bleu', hex: '#2563EB' },
    { name: 'Vert', hex: '#16A34A' },
    { name: 'Jaune', hex: '#EAB308' },
    { name: 'Rose', hex: '#EC4899' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Gris', hex: '#6B7280' },
    { name: 'Beige', hex: '#D4B08A' },
    { name: 'Marron', hex: '#92400E' },
    { name: 'Orange', hex: '#EA580C' },
    { name: 'Turquoise', hex: '#06B6D4' },
    { name: 'Bordeaux', hex: '#7F1D1D' },
    { name: 'Argent', hex: '#E5E7EB' },
    { name: 'Or', hex: '#F59E0B' },
    { name: 'Bleu clair', hex: '#60A5FA' },
    { name: 'Bleu marine', hex: '#1E3A8A' },
    { name: 'Bleu foncé', hex: '#1E40AF' },
    { name: 'Vert forêt', hex: '#166534' },
    { name: 'Vert olive', hex: '#4B5563' },
    { name: 'Rose pâle', hex: '#FBCFE8' },
    { name: 'Rouge brique', hex: '#B91C1C' },
    { name: 'Gris clair', hex: '#F3F4F6' },
    { name: 'Gris anthracite', hex: '#374151' },
    { name: 'Bleu ciel', hex: '#0EA5E9' },
    { name: 'Corail', hex: '#FF6B6B' },
    { name: 'Gris foncé', hex: '#374151' },
    { name: 'Bleu nuit', hex: '#1E3A8A' },
  ]
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const router = useRouter()
  const params = useParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchProduct()
    fetchCategories()
  }, [params.id])

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories")
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
    }
  }

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/products/${params.id}`)
      if (!res.ok) throw new Error("Product not found")
      const data = await res.json()
      setProduct(data)
      setFormData({
        name: data.name,
        description: data.description,
        price: data.price.toString(),
        promotional_price: data.promotional_price ? data.promotional_price.toString() : "",
        category: data.category,
        subcategory: data.subcategory || "",
        subsubcategory: data.subsubcategory || "",
        sku: data.sku || "",
        badge: data.badge || "",
        low_stock_threshold: (data.low_stock_threshold || 5).toString(),
        is_active: data.is_active ?? true,
      })
      setSizes(data.sizes || [])
      setColors(data.colors || [])
      setVariants(data.variants || [])
      setImagePreviews(data.images || [])
    } catch (err) {
      console.error("[v0] Error:", err)
      setError("Impossible de charger le produit")
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  function addSize() {
    if (newSize.trim() && !sizes.includes(newSize.trim())) {
      const size = newSize.trim()
      setSizes((prev) => [...prev, size])
      setNewSize("")
    }
  }

  function removeSize(sizeToRemove: string) {
    setSizes((prev) => prev.filter((size) => size !== sizeToRemove))
    setVariants((prev) => prev.filter((v) => v.size !== sizeToRemove))
  }

  function toggleColor(colorName: string) {
    if (colorName === 'aucune_couleur') {
      // Cliquer sur "aucune_couleur" : sélectionner seulement ça et désélectionner tout le reste
      if (!colors.includes('aucune_couleur')) {
        setColors(['aucune_couleur'])
        setVariants([]) // Reset variants car on passe à taille-only
      }
      // Si déjà sélectionné, ne rien faire (rester sélectionné)
      return
    }

    // Cliquer sur une couleur normale : désélectionner automatiquement "aucune_couleur"
    const newColors = colors.includes(colorName)
      ? colors.filter(c => c !== colorName) // Retirer cette couleur
      : [...colors.filter(c => c !== 'aucune_couleur'), colorName] // Ajouter cette couleur et retirer "aucune_couleur"

    setColors(newColors)
    setVariants((prev) => prev.filter((v) => newColors.includes(v.color)))
  }

  function removeColor(colorToRemove: string) {
    setColors((prev) => prev.filter((color) => color !== colorToRemove))
    setVariants((prev) => prev.filter((v) => v.color !== colorToRemove))
  }

  function addVariant(color: string, size: string) {
    const exists = variants.find((v) => v.color === color && v.size === size)
    if (!exists) {
      setVariants((prev) => [...prev, { color, size, quantity: 0 }])
    }
  }

  function updateVariantQuantity(color: string, size: string, quantity: number) {
    setVariants((prev) =>
      prev.map((v) => (v.color === color && v.size === size ? { ...v, quantity: Math.max(0, quantity) } : v))
    )
  }

  function removeVariant(color: string, size: string) {
    setVariants((prev) => prev.filter((v) => !(v.color === color && v.size === size)))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setNewImages(files)
  }

  function removeImage(index: number) {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadNewImages() {
    const uploadedUrls: string[] = []

    for (const file of newImages) {
      const filename = `${product?.id}/${Date.now()}-${file.name}`

      const { data, error } = await supabase.storage.from("products").upload(filename, file)

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(filename)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      let finalImages = imagePreviews

      if (newImages.length > 0) {
        const newUrls = await uploadNewImages()
        finalImages = [...imagePreviews, ...newUrls]
      }

      const res = await fetch(`/api/products/${product?.id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: Number.parseFloat(formData.price),
          promotional_price: formData.promotional_price ? Number.parseFloat(formData.promotional_price) : null,
          category: formData.category,
          subcategory: formData.subcategory || null,
          subsubcategory: formData.subsubcategory || null,
          sku: formData.sku || null,
          badge: formData.badge || null,
          low_stock_threshold: Number.parseInt(formData.low_stock_threshold) || 5,
          sizes,
          colors,
          variants,
          images: finalImages,
          is_active: formData.is_active,
        }),
      })

      if (!res.ok) throw new Error("Update failed")

      router.push("/admin/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error:", err)
      setError("Erreur lors de la modification du produit")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${product?.id}/delete`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Delete failed")

      router.push("/admin/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error:", err)
      setError("Erreur lors de la suppression")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-neutral-600 hover:text-neutral-900">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Modifier le produit</h1>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-lg p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Informations</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Nom du produit</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">Prix initial (€)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    required
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">Prix promotionnel (€)</label>
                  <input
                    type="number"
                    name="promotional_price"
                    value={formData.promotional_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Optionnel"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Laissez vide si pas de promotion</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">Catégorie *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={(e) => {
                      handleInputChange(e)
                      // Reset subcategory and subsubcategory when category changes
                      setFormData(prev => ({ ...prev, subcategory: "", subsubcategory: "" }))
                    }}
                    required
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories
                      .filter((cat) => !cat.parent_id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">
                    Sous-catégorie
                    {(() => {
                      const hasSubcategories = categories.some((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.category)
                      return hasSubcategories ? " *" : ""
                    })()}
                  </label>
                  <select
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => {
                      handleInputChange(e)
                      // Reset subsubcategory when subcategory changes
                      setFormData(prev => ({ ...prev, subsubcategory: "" }))
                    }}
                    required={(() => {
                      const hasSubcategories = categories.some((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.category)
                      return hasSubcategories
                    })()}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">
                      {(() => {
                        const hasSubcategories = categories.some((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.category)
                        return hasSubcategories ? "Sélectionner une sous-catégorie" : "Aucune sous-catégorie disponible"
                      })()}
                    </option>
                    {categories
                      .filter((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.category)
                      .map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">
                    Sous-sous-catégorie
                    {(() => {
                      const hasSubsubcategories = formData.subcategory && categories.some((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.subcategory)
                      return hasSubsubcategories ? " *" : ""
                    })()}
                  </label>
                  <select
                    name="subsubcategory"
                    value={formData.subsubcategory}
                    onChange={handleInputChange}
                    disabled={!formData.subcategory}
                    required={!!(formData.subcategory && categories.some((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.subcategory))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg disabled:bg-neutral-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">
                      {(() => {
                        if (!formData.subcategory) return "Sélectionner d'abord une sous-catégorie"
                        const hasSubsubcategories = categories.some((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.subcategory)
                        return hasSubsubcategories ? "Sélectionner une sous-sous-catégorie" : "Aucune sous-sous-catégorie disponible"
                      })()}
                    </option>
                    {formData.subcategory && categories
                      .filter((cat) => cat.parent_id && categories.find((p) => p.id === cat.parent_id)?.name === formData.subcategory)
                      .map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">SKU (Code produit)</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="TSHIRT-001"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Code unique pour identifier le produit</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">Badge</label>
                  <select
                    name="badge"
                    value={formData.badge}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">Aucun badge</option>
                    <option value="new">Nouveau</option>
                    <option value="top_sale">Top vente</option>
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">Le badge "Promo" s'affiche automatiquement quand le stock est à 0</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Seuil de stock faible</label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="5"
                />
                <p className="text-xs text-neutral-500 mt-1">Vous serez notifié quand le stock descend à ce niveau</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-4">Couleurs disponibles</label>
                <p className="text-sm text-neutral-600 mb-4">
                  Sélectionnez les couleurs disponibles pour ce produit. Cliquez sur les swatches pour les ajouter ou les retirer.
                </p>

                {/* Palette de couleurs prédéfinies */}
                <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-3 mb-4">
                  {availableColors.map((colorData) => {
                    const isSelected = colors.includes(colorData.name)
                    return (
                      colorData.isSpecial ? (
                        <button
                          key={colorData.name}
                          type="button"
                          onClick={() => toggleColor(colorData.name)}
                          className={`relative group w-12 h-12 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                            isSelected
                              ? 'border-red-500 bg-red-50 scale-110 shadow-lg'
                              : 'border-neutral-400 hover:border-red-400 hover:bg-red-50 hover:scale-105'
                          }`}
                          title={colorData.displayName || colorData.name}
                          style={{
                            backgroundColor: isSelected ? '#FCFCFC' : '#F3F4F6'
                          }}
                        >
                          {/* Symbole X barré */}
                          <div className="w-6 h-6 flex items-center justify-center">
                            <div className={`w-4 h-0.5 rounded transition-colors ${
                              isSelected ? 'bg-red-600' : 'bg-neutral-500'
                            }`} style={{ transform: 'rotate(45deg) translateY(0)' }} />
                            <div className={`w-4 h-0.5 rounded transition-colors ${
                              isSelected ? 'bg-red-600' : 'bg-neutral-500'
                            }`} style={{ transform: 'rotate(-45deg) translateY(0)' }} />
                          </div>

                          {/* Tooltip */}
                          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {colorData.displayName || colorData.name}
                            {isSelected && ' ✓'}
                          </div>
                        </button>
                      ) : (
                        <button
                          key={colorData.name}
                          type="button"
                          onClick={() => toggleColor(colorData.name)}
                          className={`relative group w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-neutral-900 scale-110 shadow-lg'
                              : 'border-neutral-300 hover:border-neutral-400 hover:scale-105'
                          }`}
                          title={colorData.name}
                          style={{
                            backgroundColor: colorData.hex,
                            boxShadow: isSelected
                              ? `0 0 0 3px ${colorData.hex}, 0 0 0 6px #000000`
                              : colorData.hex === '#FFFFFF'
                                ? '0 0 0 1px #D1D5DB, inset 0 0 0 1px #F3F4F6'
                                : 'none'
                          }}
                        >
                          {/* Indicateur de sélection pour couleurs claires */}
                          {isSelected && colorData.hex === '#FFFFFF' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 bg-neutral-900 rounded-full"></div>
                            </div>
                          )}

                          {/* Tooltip */}
                          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {colorData.displayName || colorData.name}
                            {isSelected && ' ✓'}
                          </div>
                        </button>
                      )
                    )
                  })}
                </div>

                {/* Couleurs sélectionnées */}
                {colors.length > 0 && (
                  <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                      {colors.includes('aucune_couleur') ? 'Configuration sélectionnée :' : 'Couleurs sélectionnées :'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((colorName) => {
                        const colorData = availableColors.find(c => c.name === colorName)
                        if (colorData?.isSpecial) {
                          // Affichage spécial pour "aucune_couleur"
                          return (
                            <div
                              key={colorName}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-red-400 rounded-full"
                            >
                              <div className="w-4 h-4 rounded-full border-2 border-red-500 flex items-center justify-center bg-red-50">
                                <div className="w-2 h-0.5 bg-red-600 rounded" style={{ transform: 'rotate(45deg) translateY(0)' }} />
                                <div className="w-2 h-0.5 bg-red-600 rounded" style={{ transform: 'rotate(-45deg) translateY(0)' }} />
                              </div>
                              <span className="text-sm font-medium text-red-700">{colorData.displayName || colorName}</span>
                              <button
                                type="button"
                                onClick={() => removeColor(colorName)}
                                className="text-red-600 hover:text-red-800 ml-1"
                              >
                                ×
                              </button>
                            </div>
                          )
                        } else {
                          // Affichage normal pour les couleurs
                          return (
                            <div
                              key={colorName}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-neutral-300 rounded-full"
                            >
                              <div
                                className="w-4 h-4 rounded-full border border-neutral-300"
                                style={{ backgroundColor: colorData?.hex }}
                                title={colorName}
                              />
                              <span className="text-sm font-medium text-neutral-700">{colorName}</span>
                              <button
                                type="button"
                                onClick={() => removeColor(colorName)}
                                className="text-red-600 hover:text-red-800 ml-1"
                              >
                                ×
                              </button>
                            </div>
                          )
                        }
                      })}
                    </div>
                  </div>
                )}

                {colors.length === 0 && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      ⚠️ Aucune couleur sélectionnée. Sélectionnez au moins une couleur pour permettre aux clients de choisir leur variante préférée.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Tailles disponibles</label>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSize()
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Ajouter une taille (ex: S, M, L, 32...)"
                  />
                  <button
                    type="button"
                    onClick={addSize}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition"
                  >
                    Ajouter
                  </button>
                </div>

                {sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-4 bg-neutral-50 rounded-lg">
                    {sizes.map((size) => (
                      <div key={size} className="flex items-center gap-2 px-3 py-1 bg-white border border-neutral-300 rounded-full">
                        <span className="text-sm font-medium text-neutral-700">{size}</span>
                        <button
                          type="button"
                          onClick={() => removeSize(size)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  {colors.includes('aucune_couleur') ? 'Variantes par taille (Quantité)' : 'Variantes (Couleur + Taille + Quantité)'}
                </label>

                {(colors.length > 0 && sizes.length > 0) || (colors.includes('aucune_couleur') && sizes.length > 0) ? (
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                      {!colors.includes('aucune_couleur') && (
                        <select
                          className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          id="variant-color"
                        >
                          <option value="">Sélectionner une couleur</option>
                          {colors.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      )}
                      <select
                        className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        id="variant-size"
                      >
                        <option value="">Sélectionner une taille</option>
                        {sizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const colorSelect = document.getElementById("variant-color") as HTMLSelectElement | null
                          const sizeSelect = document.getElementById("variant-size") as HTMLSelectElement

                          if (colorSelect && !colors.includes('aucune_couleur') && colorSelect.value && sizeSelect.value) {
                            addVariant(colorSelect.value, sizeSelect.value)
                          } else if (colors.includes('aucune_couleur') && sizeSelect.value) {
                            // Pour les produits sans couleur, on utilise 'aucune_couleur' comme couleur
                            addVariant('aucune_couleur', sizeSelect.value)
                          }
                        }}
                        className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition"
                      >
                        Ajouter variante
                      </button>
                    </div>

                    {variants.length > 0 ? (
                      <div className="space-y-2 p-4 bg-neutral-50 rounded-lg max-h-96 overflow-y-auto">
                        <h3 className="font-medium text-neutral-900 mb-3">
                          {colors.includes('aucune_couleur') ? 'Stocks par taille' : 'Stocks par variante'}
                        </h3>
                        {variants.map((variant, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded border border-neutral-200">
                            {!colors.includes('aucune_couleur') && (
                              <span className="text-sm font-medium text-neutral-700 min-w-[80px]">{variant.color}</span>
                            )}
                            <span className="text-sm font-medium text-neutral-700 min-w-[60px]">{variant.size}</span>
                            <input
                              type="number"
                              min="0"
                              value={variant.quantity}
                              onChange={(e) =>
                                updateVariantQuantity(variant.color, variant.size, Number.parseInt(e.target.value) || 0)
                              }
                              className="w-24 px-3 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                            <span className="text-sm text-neutral-600">pièces</span>
                            <button
                              type="button"
                              onClick={() => removeVariant(variant.color, variant.size)}
                              className="ml-auto text-sm text-red-600 hover:text-red-800"
                            >
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500 italic">
                        {colors.includes('aucune_couleur')
                          ? 'Ajoutez des variantes par taille pour gérer vos stocks'
                          : 'Ajoutez des variantes pour gérer vos stocks'
                        }
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 italic">
                    {colors.includes('aucune_couleur')
                      ? 'Ajoutez d\'abord des tailles pour créer des variantes par taille'
                      : 'Ajoutez d\'abord des couleurs et des tailles pour créer des variantes'
                    }
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  id="is_active"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-neutral-900">
                  Produit actif (visible pour les clients)
                </label>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Images</h2>

            {imagePreviews.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={preview || "/placeholder.svg"}
                      alt={`Preview ${idx}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">Ajouter de nouvelles images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-neutral-900 text-white py-3 rounded-lg font-semibold hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Sauvegarde..." : "Modifier le produit"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Supprimer
            </button>
            <Link
              href="/admin/dashboard"
              className="px-6 py-3 border-2 border-neutral-300 text-neutral-900 rounded-lg font-semibold hover:border-neutral-900 transition"
            >
              Annuler
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
