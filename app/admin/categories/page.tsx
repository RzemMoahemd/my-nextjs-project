"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { Category, User } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react"

export default function CategoriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    parent_id: "",
  })
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/admin/login")
        return
      }

      const { data: adminUser, error } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

      if (error || !adminUser) {
        await supabase.auth.signOut()
        router.push("/admin/login")
        return
      }

      setUser(user as User)
      fetchCategories()
    } catch (error) {
      console.error("[v0] Auth error:", error)
      router.push("/admin/login")
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories")
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingCategory(null)
    setFormData({ name: "", parent_id: "" })
    setShowModal(true)
  }

  function openEditModal(category: Category) {
    setEditingCategory(category)
    setFormData({ name: category.name, parent_id: category.parent_id || "" })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingCategory) {
        // Update
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error("Failed to update category")
        alert("Catégorie mise à jour avec succès.")
      } else {
        // Create
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error("Failed to create category")
        alert("Catégorie créée avec succès.")
      }

      setShowModal(false)
      fetchCategories()
    } catch (error) {
      console.error("[v0] Error:", error)
      alert("Erreur lors de l'opération")
    }
  }

  async function handleDelete(categoryId: string, categoryName: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ? Cela supprimera aussi ses sous-catégories.`)) {
      return
    }

    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete category")

      alert("Catégorie supprimée avec succès.")
      fetchCategories()
    } catch (error) {
      console.error("[v0] Delete error:", error)
      alert("Erreur lors de la suppression de la catégorie.")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900" />
      </div>
    )
  }

  const parentCategories = categories.filter((cat) => !cat.parent_id)
  const getSubcategories = (parentId: string) => categories.filter((cat) => cat.parent_id === parentId)

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition">
                <ArrowLeft size={20} />
                Retour au dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Gestion des Catégories</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-neutral-800 transition"
          >
            <Plus size={20} />
            Ajouter une catégorie
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4" />
            <p className="text-neutral-600">Chargement des catégories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-neutral-600">Aucune catégorie. Créez-en une pour commencer.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <div className="p-6 space-y-4">
              {parentCategories.map((parent) => (
                <div key={parent.id} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-neutral-900">{parent.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(parent)}
                        className="p-2 text-neutral-600 hover:bg-neutral-100 rounded transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(parent.id, parent.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {getSubcategories(parent.id).length > 0 && (
                    <div className="ml-6 mt-3 space-y-2">
                      <p className="text-sm font-medium text-neutral-600">Sous-catégories:</p>
                      {getSubcategories(parent.id).map((sub) => (
                        <div key={sub.id} className="flex justify-between items-center bg-neutral-50 p-3 rounded">
                          <span className="text-neutral-700">{sub.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(sub)}
                              className="p-1 text-neutral-600 hover:bg-neutral-200 rounded transition"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id, sub.name)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">
              {editingCategory ? "Modifier la catégorie" : "Créer une catégorie"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Nom de la catégorie *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="Ex: T-shirts"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Catégorie parente (optionnel)</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">Aucune (catégorie principale)</option>
                  {parentCategories
                    .filter((cat) => cat.id !== editingCategory?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-neutral-900 text-white py-2 rounded-lg font-semibold hover:bg-neutral-800 transition"
                >
                  {editingCategory ? "Mettre à jour" : "Créer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-neutral-300 text-neutral-900 py-2 rounded-lg font-semibold hover:border-neutral-900 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}