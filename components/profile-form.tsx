import { useState } from "react"

interface ProfileFormProps {
  userProfile: any
  setUserProfile: (profile: any) => void
  setEditMode: (mode: boolean) => void
  profileLoading: boolean
  setProfileLoading: (loading: boolean) => void
  toast: any
}

export function ProfileForm({
  userProfile,
  setUserProfile,
  setEditMode,
  profileLoading,
  setProfileLoading,
  toast
}: ProfileFormProps) {
  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || "",
    phone: userProfile?.phone || "",
    address: userProfile?.address || "",
    postal_code: userProfile?.postal_code || "",
    city: userProfile?.city || "",
    gender: userProfile?.gender || "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)

    try {
      // Validation basique
      if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s+/g, ''))) {
        toast({
          title: "Téléphone invalide",
          description: "Format de numéro de téléphone incorrect",
          variant: "destructive",
        })
        return
      }

      if (formData.gender && !['male', 'female', 'other'].includes(formData.gender)) {
        toast({
          title: "Erreur",
          description: "Genre invalide",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          address: formData.address || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          gender: formData.gender || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour")
      }

      const updatedProfile = await response.json()
      setUserProfile(updatedProfile)

      toast({
        title: "Profil mis à jour !",
        description: "Vos informations ont été sauvegardées.",
      })

      setEditMode(false)
    } catch (error: any) {
      console.error("Erreur mise à jour profil:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informations personnelles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">Informations personnelles</h3>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-neutral-700 mb-2">
              Nom complet
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="Ex: Sarah Dupont"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-neutral-700 mb-2">
              Genre
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">Non indiqué</option>
              <option value="female">Femme</option>
              <option value="male">Homme</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>

        {/* Adresse */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">Adresse</h3>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-2">
              Adresse
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="123 Rue de la Paix"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-neutral-700 mb-2">
                Code postal
              </label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="75001"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-2">
                Ville
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Paris"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-6 border-t">
        <button
          type="submit"
          disabled={profileLoading}
          className="px-6 py-3 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
        >
          {profileLoading ? "Enregistrement..." : "Sauvegarder"}
        </button>

        <button
          type="button"
          onClick={() => setEditMode(false)}
          className="px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-50 transition"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
