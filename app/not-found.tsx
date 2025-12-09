import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-neutral-900 mb-4">404</h1>
        <p className="text-neutral-600 mb-8">La page que vous recherchez n'existe pas.</p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
