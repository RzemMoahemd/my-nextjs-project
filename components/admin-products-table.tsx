"use client"

import type { Product } from "@/lib/types"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Trash2, Edit, ChevronLeft, ChevronRight } from "lucide-react"

interface AdminProductsTableProps {
  products: Product[]
  onDeleteClick: (id: string) => void
  isDeleting?: boolean
}

export function AdminProductsTable({ products, onDeleteClick, isDeleting = false }: AdminProductsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(products.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage)



  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900 w-48">Produit</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Catégorie</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Prix</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Tailles</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Stock</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product) => (
              <tr key={product.id} className="border-b border-neutral-200 hover:bg-neutral-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {product.images.length > 0 ? (
                      <Image
                        src={product.images[0] || "/placeholder.svg"}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-neutral-200 rounded" />
                    )}
                    <span className="line-clamp-2 text-sm font-medium text-neutral-900">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {/* Affichage forcé de la sous-sous-catégorie si elle existe */}
                      {product.subsubcategory && product.subsubcategory.trim() !== '' ? (
                        product.subsubcategory
                      ) : product.subcategory && product.subcategory.length > 0 ? (
                        `${product.category || 'N/A'} / ${product.subcategory[0]}`
                      ) : (
                        product.category || "N/A"
                      )}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 text-sm font-semibold text-neutral-900">{product.price.toFixed(2)} €</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{product.sizes.join(", ")}</td>
                <td className="px-6 py-4 text-sm">
                  {(() => {
                    // Calculate total stock from variants
                    const totalStock = product.variants?.reduce((sum, v) => sum + v.quantity, 0) ?? 0
                    return (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          totalStock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {totalStock > 0 ? `Stock: ${totalStock}` : "Rupture"}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-6 py-4 text-sm space-x-3 flex items-center">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 transition"
                  >
                    <Edit size={16} />
                    <span className="hidden sm:inline">Modifier</span>
                  </Link>
                  <button
                    onClick={() => onDeleteClick(product.id)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 transition disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-6">
          <p className="text-sm text-neutral-600">
            Page {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
