import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from "@/lib/supabase-client"

export interface FavoriteItem {
  product_id: string
  created_at: string
}

// SINGLETON PATTERN - Un seul état global pour toute l'app
class FavoritesManager {
  private static instance: FavoritesManager
  private favorites: FavoriteItem[] = []
  private loading = true
  private listeners: Array<(favorites: FavoriteItem[], loading: boolean) => void> = []
  private hasLoaded = false
  private isFetching = false

  private constructor() {}

  static getInstance(): FavoritesManager {
    if (!FavoritesManager.instance) {
      FavoritesManager.instance = new FavoritesManager()
    }
    return FavoritesManager.instance
  }

  // Ajouter un listener (composant)
  addListener(callback: (favorites: FavoriteItem[], loading: boolean) => void): () => void {
    this.listeners.push(callback)
    // Envoyer l'état actuel immédiatement
    callback(this.favorites, this.loading)

    // Retourner fonction pour se désabonner
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Notifier tous les listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.favorites, this.loading))
  }

  // Charger les favoris (une seule fois)
  async loadFavorites() {
    if (this.hasLoaded) return // DÉJÀ CHARGÉ

    this.hasLoaded = true

    // Charger immédiatement depuis localStorage
    try {
      const saved = localStorage.getItem('user_favorites')
      if (saved) {
        const parsed = JSON.parse(saved)
        this.favorites = parsed
        this.notifyListeners()
      }
    } catch (error) {
      console.log('Erreur localStorage favoris')
    }

    // Puis synchroniser avec serveur (une seule fois)
    await this.fetchFromServer()
  }

  // Récupérer depuis serveur
  private async fetchFromServer() {
    if (this.isFetching) return

    this.isFetching = true

    try {
      const response = await fetch('/api/user/favorites')
      if (response.ok) {
        const data = await response.json()
        this.favorites = data
        this.loading = false
        this.notifyListeners()
      } else {
        console.log('API favoris non disponible')
        this.loading = false
        this.notifyListeners()
      }
    } catch (error: any) {
      console.log('Erreur chargement favoris:', error?.message || 'Unknown')
      this.loading = false
      this.notifyListeners()
    } finally {
      this.isFetching = false
    }
  }

  // Basculer favori
  async toggleFavorite(productId: string) {
    const currentlyFavorite = this.favorites.some(fav => fav.product_id === productId)

    // Mise à jour instantanée
    if (currentlyFavorite) {
      this.favorites = this.favorites.filter(fav => fav.product_id !== productId)
    } else {
      this.favorites = [{
        product_id: productId,
        created_at: new Date().toISOString()
      }, ...this.favorites]
    }

    this.notifyListeners()

    // Sauvegarde localStorage
    localStorage.setItem('user_favorites', JSON.stringify(this.favorites))

    // Appel serveur en background
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: 'toggle' })
      })

      if (!response.ok) {
        // Revenir à l'état précédent en cas d'erreur
        if (currentlyFavorite) {
          this.favorites = [{
            product_id: productId,
            created_at: new Date().toISOString()
          }, ...this.favorites]
        } else {
          this.favorites = this.favorites.filter(fav => fav.product_id !== productId)
        }
        this.notifyListeners()
      }
    } catch (error) {
      // Revenir à l'état précédent en cas d'erreur réseau
      if (currentlyFavorite) {
        this.favorites = [{
          product_id: productId,
          created_at: new Date().toISOString()
        }, ...this.favorites]
      } else {
        this.favorites = this.favorites.filter(fav => fav.product_id !== productId)
        this.notifyListeners()
      }
    }
  }

  // Nettoyer tout
  clear() {
    this.favorites = []
    this.loading = true
    this.hasLoaded = false
    this.isFetching = false
    localStorage.removeItem('user_favorites')
    this.notifyListeners()
  }

  // Check if product is favorite
  isFavorite(productId: string): boolean {
    return this.favorites.some(fav => fav.product_id === productId)
  }

  getFavorites(): FavoriteItem[] {
    return this.favorites
  }
}

const favoritesManager = FavoritesManager.getInstance()

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [favoritesMap, setFavoritesMap] = useState<Set<string>>(new Set())

  // Charger les favoris au démarrage (singleton gère le cache)
  useEffect(() => {
    const unsubscribe = favoritesManager.addListener((newFavorites, newLoading) => {
      setFavorites(newFavorites)
      setLoading(newLoading)
    })

    // Charger si nécessaire
    favoritesManager.loadFavorites()

    return unsubscribe
  }, [])

  // Mettre à jour la map quand les favoris changent
  useEffect(() => {
    setFavoritesMap(new Set(favorites.map(fav => fav.product_id)))
  }, [favorites])

  const toggleFavorite = useCallback(async (productId: string) => {
    await favoritesManager.toggleFavorite(productId)
    return { success: true }
  }, [])

  const isFavorite = useCallback((productId: string): boolean => {
    return favoritesManager.isFavorite(productId)
  }, [])

  const clearLocalFavorites = useCallback(() => {
    favoritesManager.clear()
  }, [])

  const refetch = useCallback(async () => {
    await favoritesManager.loadFavorites()
  }, [])

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    refetch,
    clearLocalFavorites
  }
}
