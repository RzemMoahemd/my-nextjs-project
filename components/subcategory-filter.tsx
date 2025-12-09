import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface SubcategoryFilterProps {
  category: string | null
  subcategories: string[]
}

export function SubcategoryFilter({ category, subcategories }: SubcategoryFilterProps) {
  const searchParams = useSearchParams()
  const selectedSubcategory = searchParams.get('subcategory')

  if (!category || subcategories.length === 0) return null

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex space-x-3 pb-2">
        <Link 
          href={`/products?category=${category}`}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
            selectedSubcategory === null
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
          }`}
        >
          Tous
        </Link>
        
        {subcategories.map(sub => (
          <Link
            key={sub}
            href={`/products?category=${category}&subcategory=${sub}`}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
              selectedSubcategory === sub
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
            }`}
          >
            {sub}
          </Link>
        ))}
      </div>
    </div>
  )
}
