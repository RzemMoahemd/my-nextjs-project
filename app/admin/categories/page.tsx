"use client"

import React, { useEffect, useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { Category, User } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft, Plus, Edit2, Trash2, Info, ChevronRight, ChevronDown, FolderPlus, MoreVertical } from "lucide-react"

// =========================
// FORM FIELDS (Fix focus)
// =========================
const FormFields = React.memo(function FormFields({
  formData,
  setFormData,
  categories,
  selectedLevel,
  editingCategory,
  handleSubmit,
  categoryNameInputRef,
  validationErrors,
  parentError,
  grandParentError,
  setParentError,
  setGrandParentError
}: any) {

  return (
    <form id="category-form" onSubmit={handleSubmit} className="space-y-4">

      {/* Champ nom */}
      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-2">Nom de la catégorie *</label>
        <input
          ref={categoryNameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="Ex: T-shirts"
        />
      </div>

      {/* Niveau 1 */}
      {selectedLevel === "1" && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">ℹ️</span>
            <span className="text-sm text-blue-800">
              <strong>Catégorie principale :</strong> aucune catégorie parent requise.
            </span>
          </div>
        </div>
      )}

      {/* Niveau 2 */}
      {selectedLevel === "2" && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-600">📂</span>
            <span className="text-sm text-green-800 font-medium">
              Parent requis : Sélectionnez une catégorie principale (niveau 1)
            </span>
          </div>
          <div>
            <select
              value={formData.parent_id}
              onChange={(e) => {
                setFormData({ ...formData, parent_id: e.target.value })
                if (parentError) setParentError(false)
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                parentError
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-neutral-300 focus:ring-green-500'
              }`}
            >
              <option value="">Choisir une catégorie principale...</option>

              {categories
                .filter((cat: Category) => !cat.parent_id)
                .map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}

            </select>
            {parentError && (
              <p className="text-red-600 text-xs mt-1">Veuillez sélectionner une catégorie principale</p>
            )}
          </div>
        </div>
      )}

      {/* Niveau 3 */}
      {selectedLevel === "3" && (
        <>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-600">📄</span>
              <span className="text-sm text-purple-800 font-medium">
                Sélection des parents requise
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Parent niveau 1 */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Catégorie principale (niveau 1) *
                </label>
                <select
                  value={formData.grandParent_id}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      grandParent_id: e.target.value,
                      parent_id: "" // reset niveau 2 quand on change niveau 1
                    })
                    if (grandParentError) setGrandParentError(false)
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    grandParentError
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-neutral-300 focus:ring-purple-500'
                  }`}
                >
                  <option value="">Choisir niveau 1...</option>

                  {categories
                    .filter((cat: Category) => !cat.parent_id)
                    .map((cat: Category) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}

                </select>
                {grandParentError && (
                  <p className="text-red-600 text-xs mt-1">Veuillez sélectionner une catégorie principale</p>
                )}
              </div>

              {/* Parent niveau 2 */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Sous-catégorie (niveau 2) *
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => {
                    setFormData({ ...formData, parent_id: e.target.value })
                    if (parentError) setParentError(false)
                  }}
                  disabled={!formData.grandParent_id}
                  className={`w-full px-4 py-2 border rounded-lg disabled:bg-neutral-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                    parentError
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-neutral-300 focus:ring-purple-500'
                  }`}
                >
                  <option value="">
                    {formData.grandParent_id
                      ? "Choisir niveau 2..."
                      : "🔒 Sélectionnez une catégorie principale d'abord"}
                  </option>

                  {categories
                    .filter((cat: Category) => cat.parent_id === formData.grandParent_id)
                    .map((cat: Category) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}

                </select>
                {parentError && (
                  <p className="text-red-600 text-xs mt-1">Veuillez sélectionner une sous-catégorie</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

    </form>
  );
});


export default function CategoriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    selectedLevel: "1",
    parent_id: "",
    grandParent_id: "",
  })
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})

  // Mobile menu state
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null)

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})
  const [parentError, setParentError] = useState(false)
  const [grandParentError, setGrandParentError] = useState(false)

  // Étape de création (pour déterminer l'affichage)
  const [creationStep, setCreationStep] = useState<'level' | 'details'>('level')
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Ref pour maintenir le focus sur l'input de nom de catégorie
  const categoryNameInputRef = useRef<HTMLInputElement>(null)

  // Supprimé : le focus automatique causait des conflits avec la saisie
  // L'utilisateur peut cliquer dans le champ pour obtenir le focus naturellement

  // État pour différer la mise à jour du preview (éviter les re-renders constants)
  const [debouncedFormData, setDebouncedFormData] = useState(formData)

  // Debounce pour éviter les re-renders constants du preview
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFormData(formData)
    }, 300) // Délai de 300ms après la dernière frappe

    return () => clearTimeout(timeoutId)
  }, [formData])

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
      loadData()
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
      console.log("Catégories chargées:", data.length)
      return data // Retourner les données pour les utiliser
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
      return []
    }
  }

  async function loadData() {
    try {
      // D'abord charger les catégories
      const categoriesData = await fetchCategories()

      // Ensuite charger et compter les produits
      await fetchProductCounts(categoriesData)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProductCounts(categoriesData: Category[]) {
    try {
      // Les catégories viennent maintenant déjà avec le comptage depuis l'API
      const counts: Record<string, number> = {}

      categoriesData.forEach((category: any) => {
        counts[category.id] = category.product_count || 0
      })

      console.log("Comptes des produits depuis API:", counts)
      setProductCounts(counts)
    } catch (error) {
      console.error("[v0] Error fetching product counts:", error)
    }
  }

  function openCreateModal() {
    setEditingCategory(null)
    setCreationStep('level') // Toujours recommencer par le choix du niveau
    setFormData({
      name: "",
      parent_id: "",
      selectedLevel: "1",
      grandParent_id: ""
    })
    setShowModal(true)
  }

  function openCreateSubModal(parentLevel: number, parentId: string, parentParentId = "") {
    setEditingCategory(null)
    setCreationStep('details') // Aller directement au formulaire détaillé
    setFormData({
      name: "",
      parent_id: parentId,
      selectedLevel: parentLevel.toString(),
      grandParent_id: parentParentId
    })
    setShowModal(true)
  }

  function openEditModal(category: Category) {
    // Déterminer le niveau de la catégorie éditée
    const level = getCategoryLevel(category.id)
    setEditingCategory(category)
    setFormData({
      name: category.name,
      parent_id: category.parent_id || "",
      selectedLevel: level.toString(),
      grandParent_id: "",
    })
    setShowModal(true)
  }

  // Fonction pour déterminer le niveau d'une catégorie
  function getCategoryLevel(categoryId: string): number {
    const category = categories.find(cat => cat.id === categoryId)
    if (!category) return 1
    if (!category.parent_id) return 1

    const parent = categories.find(cat => cat.id === category.parent_id)
    return parent?.parent_id ? 3 : 2
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Reset validation errors
    setParentError(false)
    setGrandParentError(false)

    // Validation pour les niveaux 2 et 3
    if (formData.selectedLevel === "2" && !formData.parent_id) {
      setParentError(true)
      return
    }

    if (formData.selectedLevel === "3") {
      if (!formData.grandParent_id) {
        setGrandParentError(true)
        return
      }
      if (!formData.parent_id) {
        setParentError(true)
        return
      }
    }

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
      loadData() // Recharger toutes les données (catégories + compteurs)
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

  // Fonction récursive pour construire la hiérarchie complète
  const buildHierarchyTree = (categories: Category[]) => {
    const result: any[] = []
    const map = new Map()

    // Créer la map pour accéder rapidement aux catégories
    categories.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] })
    })

    // Construire la hiérarchie
    categories.forEach(cat => {
      const categoryWithChildren = map.get(cat.id)
      if (!cat.parent_id) {
        // Catégorie racine
        result.push(categoryWithChildren)
      } else {
        // Sous-catégorie - l'ajouter à son parent
        if (map.has(cat.parent_id)) {
          map.get(cat.parent_id).children?.push(categoryWithChildren)
        }
      }
    })

    return result
  }

  const hierarchyTree = buildHierarchyTree(categories)

  // Composants auxiliaires pour la modal (avec memo pour éviter re-renders constants)
  const HierarchyPreview = React.memo(({ selectedLevel, selectedParent, selectedGrandParent, newCategoryName, categories }: any) => {
    if (!newCategoryName || selectedLevel === '1') {
      return (
        <div className="text-sm text-neutral-600 flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded ${
            selectedLevel === '1' ? 'bg-blue-400' :
            selectedLevel === '2' ? 'bg-green-400' :
            'bg-purple-400'
          }`}></span>
          <span>{newCategoryName || 'Nouvelle catégorie'}</span>
          <span className="text-neutral-400">(Niveau {selectedLevel})</span>
        </div>
      )
    }

    if (selectedLevel === '2') {
      const parent = categories.find((c: Category) => c.id === selectedParent)
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block w-3 h-3 bg-blue-400 rounded"></span>
            <span className="text-neutral-700">{parent?.name || 'Catégorie parent'}</span>
          </div>
          <div className="flex items-center gap-2 ml-4 border-l-2 border-neutral-300 pl-4">
            <span className="inline-block w-3 h-3 bg-green-400 rounded"></span>
            <span>{newCategoryName} (sous-catégorie)</span>
          </div>
        </div>
      )
    }

    if (selectedLevel === '3') {
      const grandParent = categories.find((c: Category) => c.id === selectedGrandParent)
      const parent = categories.find((c: Category) => c.id === selectedParent)
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block w-3 h-3 bg-blue-400 rounded"></span>
            <span className="text-neutral-700">{grandParent?.name || 'Niveau 1'}</span>
          </div>
          <div className="flex items-center gap-2 ml-4 border-l-2 border-neutral-200 pl-4">
            <span className="inline-block w-3 h-3 bg-green-400 rounded"></span>
            <span className="text-neutral-600">{parent?.name || 'Niveau 2'}</span>
          </div>
          <div className="flex items-center gap-2 ml-8 border-l-2 border-neutral-100 pl-4">
            <span className="inline-block w-3 h-3 bg-purple-400 rounded"></span>
            <span>{newCategoryName} (sous-sous-catégorie)</span>
          </div>
        </div>
      )
    }

    return null
  })

  

  // Fonction pour basculer l'expansion d'un noeud
  const toggleNodeExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedNodes(newExpanded)
  }


  // Rendu en tree view moderne (style Notion)
  const renderTreeNode = (category: any, level: number = 0, isLastChild: boolean = true) => {
    const baseIndentation = 24 // Base indentation réduite
    const levelIndentation = level * 20 // Espacement réduit entre niveaux
    const totalIndentation = baseIndentation + levelIndentation
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedNodes.has(category.id)

    // Calculer si c'est le dernier enfant pour les connecteurs
    const isFirstChild = category.index === 0
    const isLastChildOfParent = category.isLastInGroup

    return (
      <div key={category.id} className="relative">
        {/* Lignes de connexion verticales et horizontales améliorées */}
        {level > 0 && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: `${totalIndentation - 28}px` }}
          >
            {/* Ligne verticale douce */}
            <div className={`absolute w-px bg-gradient-to-b from-neutral-200 via-neutral-300 to-transparent top-6 bottom-0 ${
              isLastChild ? 'h-8' : 'h-full'
            }`} style={{ left: '20px' }} />

            {/* Ligne horizontale avec arrondi */}
            <div
              className="absolute top-6 h-px bg-neutral-300 rounded-full"
              style={{
                left: '20px',
                width: '20px'
              }}
            />
          </div>
        )}

        {/* Container principal avec espacement plus compact */}
        <div className="flex items-center justify-between py-1.5 px-3 hover:bg-neutral-100/60 rounded-md transition-all duration-200 group">
          {/* Section gauche avec indentation et contrôles */}
          <div
            className="flex items-center gap-3 cursor-pointer flex-1"
            style={{ paddingLeft: `${totalIndentation}px` }}
            onClick={() => hasChildren && toggleNodeExpansion(category.id)}
          >

            {/* Chevron avec animation douce */}
            {hasChildren ? (
              <div className={`w-4 h-4 flex items-center justify-center transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-neutral-500"
                >
                  <path
                    d="M4.5 9L7.5 6L4.5 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-4" />
            )}

            {/* Badge de niveau avec style moderne */}
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm ${
              level === 0
                ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200/50'
                : level === 1
                  ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200/50'
                  : 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border border-purple-200/50'
            }`}>
              {level === 0 ? '1' : level === 1 ? '2' : '3'}
            </span>

            {/* Nom de la catégorie avec compteur de produits */}
            <div className="flex items-center gap-2 flex-1">
              <span className={`font-medium truncate leading-tight ${
                level === 0 ? 'text-neutral-900' :
                level === 1 ? 'text-neutral-700' :
                'text-neutral-600'
              }`}>
                {category.name}
              </span>

              {/* Badge du nombre de produits */}
              {productCounts[category.id] !== undefined && productCounts[category.id] > 0 && (
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                  productCounts[category.id] > 10
                    ? 'bg-green-100 text-green-800'
                    : productCounts[category.id] > 5
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-orange-100 text-orange-800'
                }`}>
                  {productCounts[category.id]} produit{productCounts[category.id] > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Boutons d'actions - Desktop */}
          <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Bouton "Ajouter sous-catégorie" pour niveau 1 */}
            {level === 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openCreateSubModal(2, category.id) // Niveau 2 avec parent = category.id
                }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors duration-150 hover:scale-105"
                title="Ajouter une sous-catégorie"
              >
                <Plus size={14} />
              </button>
            )}

            {/* Bouton "Ajouter sous-sous-catégorie" pour niveau 2 */}
            {level === 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Pour niveau 3 :
                  // parent = ID de la catégorie actuelle (niveau 2)
                  // grandParent = parent de la catégorie actuelle (niveau 1)
                  openCreateSubModal(3, category.id, category.parent_id)
                  // Ceci va pré-remplir :
                  // - "Sous-catégorie (niveau 2)" avec category.id
                  // - "Catégorie principale (niveau 1)" avec category.parent_id
                }}
                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors duration-150 hover:scale-105"
                title="Ajouter une sous-sous-catégorie"
              >
                <Plus size={14} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                openEditModal(category)
              }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150 hover:scale-105"
              title="Modifier cette catégorie"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(category.id, category.name)
              }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150 hover:scale-105"
              title="Supprimer cette catégorie"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Bouton menu mobile */}
          <div className="md:hidden md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-200 relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpenMobileMenu(openMobileMenu === category.id ? null : category.id)
              }}
              className="p-1.5 text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors duration-150"
              title="Options"
            >
              <MoreVertical size={14} />
            </button>

            {/* Menu mobile déroulant */}
            {openMobileMenu === category.id && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                {/* Bouton "Ajouter sous-catégorie" pour niveau 1 */}
                {level === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMobileMenu(null)
                      openCreateSubModal(2, category.id)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Ajouter sous-catégorie
                  </button>
                )}

                {/* Bouton "Ajouter sous-sous-catégorie" pour niveau 2 */}
                {level === 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMobileMenu(null)
                      openCreateSubModal(3, category.id, category.parent_id)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Ajouter sous-sous-catégorie
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMobileMenu(null)
                    openEditModal(category)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <Edit2 size={14} />
                  Modifier
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMobileMenu(null)
                    handleDelete(category.id, category.name)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children avec animation douce vertical expand + fade-in */}
        <div
          className={`relative overflow-hidden transition-all duration-400 ease-out ${
            isExpanded
              ? 'max-h-screen opacity-100 translate-y-0 scale-100'
              : 'max-h-0 opacity-0 -translate-y-2 scale-98'
          }`}
          style={{
            transition: isExpanded
              ? 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {hasChildren && (
            <div className="py-1 pl-2">
              {category.children.map((child: any, index: number) => {
                // Ajouter les métadonnées pour les connecteurs
                const childWithMeta = {
                  ...child,
                  index,
                  isLastInGroup: index === category.children.length - 1
                }
                return renderTreeNode(childWithMeta, level + 1, index === category.children.length - 1)
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-blue-50">
      {/* Header container compact avec structure claire */}
      {/* Header équilibré et professionnel */}
      <div className="bg-white/90 backdrop-blur-xl shadow-sm border-b border-neutral-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Zone gauche : Groupe Retour + Compteurs */}
            <div className="flex items-center gap-6">
              {/* Bouton Retour */}
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 px-3 py-2 bg-neutral-100/80 rounded-lg text-neutral-700 hover:bg-neutral-200/90 hover:text-neutral-900 transition-all duration-200 text-sm font-medium"
              >
                <ArrowLeft size={16} />
                <span>Retour</span>
              </Link>

              {/* Compteurs intégrés */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gradient-to-r from-blue-50 to-blue-25 rounded border border-gray-200/60 shadow-sm">
                  <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-[10px] font-semibold text-blue-700">
                    {categories.filter(c => !c.parent_id).length}
                  </span>
                </div>
                <div className="w-px h-2.5 bg-neutral-300"></div>
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gradient-to-r from-green-50 to-green-25 rounded border border-gray-200/60 shadow-sm">
                  <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-[10px] font-semibold text-green-700">
                    {categories.filter(c => c.parent_id && categories.find(p => p.id === c.parent_id && !p.parent_id)).length}
                  </span>
                </div>
                <div className="w-px h-2.5 bg-neutral-300"></div>
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-50 to-purple-25 rounded border border-gray-200/60 shadow-sm">
                  <div className="w-1 h-1 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span className="text-[10px] font-semibold text-purple-700">
                    {categories.filter(c => c.parent_id && categories.find(p => p.id === c.parent_id && p.parent_id)).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Zone centrale : Titre principal avec icône */}
            <div className="flex-1 text-center px-8">
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center justify-center gap-3">
                <FolderPlus size={20} className="text-blue-600" />
                <span>Gestion des Catégories</span>
              </h1>
            </div>

            {/* Zone droite : Micro-capsule blanche translucide pour badges niveaux */}
            <div className="flex items-center mr-2">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white/40 rounded-xl border border-white/60 shadow-sm backdrop-blur-sm">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200/60">
                  N1
                </span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-md border border-green-200/60">
                  N2
                </span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md border border-purple-200/60">
                  N3
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content with enhanced design - espacement réduit */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {loading ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-neutral-200/50 shadow-lg p-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-white"></div>
              </div>
              <p className="text-xl font-semibold text-neutral-700 mb-2">Chargement des catégories...</p>
              <p className="text-neutral-500">Veuillez patienter pendant la récupération des données</p>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-neutral-200/50 shadow-lg p-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6">
                <Plus size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">Aucune catégorie trouvée</h3>
              <p className="text-xl text-neutral-600 mb-8">Commencez par créer vos premières catégories pour organiser vos produits</p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Plus size={24} />
                Créer votre première catégorie
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
            {/* Header with enhanced design - petite séparation du header principal */}
            <div className="bg-gradient-to-r from-neutral-50 to-blue-50/30 border-t border-gray-100 border-b border-neutral-200/60 px-8 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-900">Arborescence des catégories</h2>
                  <span className="text-sm text-gray-500">• {categories.length} catégories</span>
                </div>
                <p className="text-neutral-600">Cliquez sur les catégories pour explorer les niveaux hiérarchiques</p>
              </div>
            </div>

            {/* Tree content with enhanced styling - respiration réduite */}
            <div className="pt-5 px-8 pb-8 bg-gradient-to-b from-white to-neutral-50/30">
              <div className="space-y-2" role="tree" aria-label="Hiérarchie des catégories">
                {hierarchyTree.map((category: any) => renderTreeNode(category))}
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Modal améliorée avec étapes */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* En-tête - plus compact */}
            <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 px-6 py-3 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  {editingCategory ? "Modifier la catégorie" : "Créer une nouvelle catégorie"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setCreationStep('level')
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition"
                >
                  ✕
                </button>
              </div>

              {/* Indicateur d'étapes */}
              {!editingCategory && (
                <div className="flex items-center gap-2 mt-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    creationStep === 'level' ? 'bg-white text-neutral-900' : 'bg-white/30 text-white'
                  }`}>
                    1
                  </div>
                  <div className="h-px w-8 bg-white/30" />
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    creationStep === 'details' ? 'bg-white text-neutral-900' : 'bg-white/30 text-white'
                  }`}>
                    2
                  </div>
                  <div className="ml-4 space-y-1">
                    <div className={`text-xs font-medium ${creationStep === 'level' ? 'text-white' : 'text-white/50'}`}>
                      Étape 1: {creationStep === 'level' ? 'Choisir le niveau' : 'Niveau choisi'}
                    </div>
                    <div className={`text-xs font-medium ${creationStep === 'details' ? 'text-white' : 'text-white/50'}`}>
                      Étape 2: {creationStep === 'details' ? 'Définir les informations' : 'Informations à saisir'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notice explicative */}
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Hiérarchie des 3 niveaux :</p>
                  <div className="space-y-1">
                    <p><span className="inline-block w-3 h-3 bg-blue-200 rounded mr-2"></span><strong>Niveau 1 :</strong> Catégories principales (ex: Homme, Femme, Enfants)</p>
                    <p><span className="inline-block w-3 h-3 bg-green-200 rounded mr-2"></span><strong>Niveau 2 :</strong> Sous-catégories (ex: Hoodies, Jeans, Vêtements sport)</p>
                    <p><span className="inline-block w-3 h-3 bg-purple-200 rounded mr-2"></span><strong>Niveau 3 :</strong> Sous-sous-catégories (ex: Hoodies Street, Joggers Baggy)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Corps de la modal */}
            <div className="p-6">
              {editingCategory ? (
                // Mode édition : formulaire direct
                <>
                  <FormFields
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                    editingCategory={editingCategory}
                    selectedLevel={editingCategory ? getCategoryLevel(editingCategory.id).toString() : '1'}
                    handleSubmit={handleSubmit}
                    categoryNameInputRef={categoryNameInputRef}
                    parentError={parentError}
                    grandParentError={grandParentError}
                    setParentError={setParentError}
                    setGrandParentError={setGrandParentError}
                  />
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 border border-neutral-300 text-neutral-900 py-2 rounded-lg font-semibold hover:border-neutral-900 transition"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      form="category-form"
                      className="flex-1 bg-neutral-900 text-white py-2 rounded-lg font-semibold hover:bg-neutral-800 transition"
                    >
                      Mettre à jour
                    </button>
                  </div>
                </>
              ) : creationStep === 'level' ? (
                // Étape 1 : Choix du niveau
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Dans quel niveau souhaitez-vous créer la catégorie ?</h3>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {[
                        { level: '1', title: 'Niveau 1', desc: 'Catégorie principale', icon: '🏷️', color: 'blue' },
                        { level: '2', title: 'Niveau 2', desc: 'Sous-catégorie', icon: '📂', color: 'green' },
                        { level: '3', title: 'Niveau 3', desc: 'Sous-sous-catégorie', icon: '📄', color: 'purple' }
                      ].map(({ level, title, desc, icon, color }) => (
                        <button
                          key={level}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, selectedLevel: level }))
                            setCreationStep('details')
                          }}
                          className={`p-4 border-2 rounded-lg transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 text-left ${
                            formData.selectedLevel === level
                              ? `border-${color}-500 bg-${color}-100 shadow-md ring-2 ring-${color}-200 ring-opacity-50`
                              : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">{icon}</div>
                            <div className="flex items-center justify-center gap-2 font-semibold text-neutral-900">
                              <div className={`w-2 h-2 rounded-full ${
                                level === '1' ? 'bg-blue-500' :
                                level === '2' ? 'bg-green-500' :
                                'bg-purple-500'
                              }`}></div>
                              <span>{title}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 border border-neutral-300 text-neutral-700 py-2 rounded-lg font-medium hover:bg-neutral-50 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                // Étape 2 : Champs dynamiques - espacement réduit
                <div className="space-y-4">
                  {/* Aperçu visuel de la hiérarchie - avec coloration par niveau */}
                  <div className={`p-4 rounded-lg border-2 ${
                    formData.selectedLevel === "1"
                      ? "bg-blue-50/50 border-blue-200"
                      : formData.selectedLevel === "2"
                        ? "bg-green-50/50 border-green-200"
                        : "bg-purple-50/50 border-purple-200"
                  }`}>
                    <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                      formData.selectedLevel === "1"
                        ? "text-blue-800"
                        : formData.selectedLevel === "2"
                          ? "text-green-800"
                          : "text-purple-800"
                    }`}>
                      <span className={`${
                        formData.selectedLevel === "1"
                          ? "text-blue-600"
                          : formData.selectedLevel === "2"
                            ? "text-green-600"
                            : "text-purple-600"
                      }`}>
                        🗂️
                      </span>
                      Aperçu de la hiérarchie
                    </h4>
                    <HierarchyPreview
                      selectedLevel={debouncedFormData.selectedLevel}
                      selectedParent={debouncedFormData.parent_id}
                      selectedGrandParent={debouncedFormData.grandParent_id}
                      newCategoryName={debouncedFormData.name}
                      categories={categories}
                    />
                  </div>

                  {/* Champs dynamiques selon le niveau */}
                  <FormFields
  formData={formData}
  setFormData={setFormData}
  categories={categories}
  editingCategory={editingCategory}
  selectedLevel={formData.selectedLevel}
  handleSubmit={handleSubmit}
  categoryNameInputRef={categoryNameInputRef}
  parentError={parentError}
  grandParentError={grandParentError}
  setParentError={setParentError}
  setGrandParentError={setGrandParentError}
/>


                  {/* Boutons de navigation */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCreationStep('level')}
                      className="px-4 py-2 text-neutral-600 hover:bg-neutral-50 rounded-lg transition"
                    >
                      ← Retour
                    </button>
                    <button
                      type="submit"
                      form="category-form"
                      className="flex-1 bg-neutral-900 text-white py-2 rounded-lg font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      <span>
                        {formData.selectedLevel === "1"
                          ? "Créer la catégorie principale"
                          : formData.selectedLevel === "2"
                            ? "Créer la sous-catégorie"
                            : "Créer la sous-sous-catégorie"
                        }
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Material Design Floating Action Button (FAB) amélioré */}
      {!showModal && (
        <button
          onClick={openCreateModal}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 hover:rotate-3 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 group z-50"
          title="Ajouter une nouvelle catégorie"
          aria-label="Ajouter une nouvelle catégorie"
        >
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-15 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center">
            <Plus
              size={24}
              className="transform group-hover:rotate-180 transition-transform duration-500 ease-out"
            />
          </div>

          {/* Ripple effect on click */}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-active:opacity-25 transition-opacity duration-200 animate-ping"></div>
        </button>
      )}
    </div>
  )
}
