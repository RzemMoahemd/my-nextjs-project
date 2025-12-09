"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "@/hooks/use-toast"
import type { CartItem, Coupon } from "@/lib/types"

interface AddItemPayload {
  productId: string
  name: string
  price: number
  size: string
  color?: string
  image?: string
  quantity?: number
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  coupon?: Coupon
  discount: number
  freeShipping: boolean
  addItem: (payload: AddItemPayload) => Promise<void>
  removeItem: (productId: string, size: string) => Promise<void>
  updateQuantity: (productId: string, size: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  applyCoupon: (coupon: Coupon, discount: number, freeShipping: boolean) => void
  removeCoupon: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)
const STORAGE_KEY = "elegance-cart"
const CART_ID_KEY = "elegance-cart-id"

async function reserveRequest(payload: {
  cartId: string
  productId: string
  size: string
  color?: string
  quantity: number
  reservationId?: string
}) {
  const response = await fetch("/api/cart/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart_id: payload.cartId,
      product_id: payload.productId,
      size: payload.size,
      color: payload.color,
      quantity: payload.quantity,
      reservation_id: payload.reservationId,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (errorData.error === "INSUFFICIENT_STOCK") {
      const error = new Error("INSUFFICIENT_STOCK")
      error.name = "INSUFFICIENT_STOCK"
      throw error
    }
    throw new Error("Réservation impossible")
  }

  return response.json()
}

async function releaseRequest(reservationId: string) {
  await fetch("/api/cart/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: reservationId }),
  })
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [cartId, setCartId] = useState<string>("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | undefined>(undefined)
  const [discount, setDiscount] = useState<number>(0)
  const [freeShipping, setFreeShipping] = useState<boolean>(false)
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const storedCart = window.localStorage.getItem(STORAGE_KEY)
      if (storedCart) {
        setItems(JSON.parse(storedCart))
      }
    } catch (error) {
      console.error("[cart] failed to load cart", error)
    }

    let storedId = window.localStorage.getItem(CART_ID_KEY)
    if (!storedId) {
      storedId = generateId()
      window.localStorage.setItem(CART_ID_KEY, storedId)
    }
    setCartId(storedId)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error("[cart] failed to persist cart", error)
    }
  }, [items])

  useEffect(() => {
    Object.values(timersRef.current).forEach((timeoutId) => clearTimeout(timeoutId))
    timersRef.current = {}

    items.forEach((item) => {
      if (!item.expiresAt) return
      const delay = new Date(item.expiresAt).getTime() - Date.now()
      if (delay <= 0) {
        handleExpiration(item)
      } else {
        timersRef.current[item.reservationId] = setTimeout(() => handleExpiration(item), delay)
      }
    })

    return () => {
      Object.values(timersRef.current).forEach((timeoutId) => clearTimeout(timeoutId))
      timersRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const handleExpiration = async (item: CartItem) => {
    try {
      await releaseRequest(item.reservationId)
    } catch {
      // ignore
    }
    setItems((prev) => prev.filter((p) => p.reservationId !== item.reservationId))
    toast({
      title: "Réservation expirée",
      description: `${item.name} (${item.size}) est revenu en stock.`,
    })
  }

  const addItem = async (payload: AddItemPayload) => {
    if (!cartId) return
    const quantityToAdd = payload.quantity ?? 1

    // Trouver l'item existant
    const existing = items.find((item) => item.productId === payload.productId && item.size === payload.size)
    const targetQuantity = (existing?.quantity ?? 0) + quantityToAdd

    try {
      const reservation = await reserveRequest({
        cartId,
        productId: payload.productId,
        size: payload.size,
        color: payload.color,
        quantity: targetQuantity,
        reservationId: existing?.reservationId,
      })

      setItems((prev) => {
        const filtered = prev.filter((item) => !(item.productId === payload.productId && item.size === payload.size))
        return [
          ...filtered,
          {
            productId: payload.productId,
            name: payload.name,
            price: payload.price,
            size: payload.size,
            color: payload.color,
            quantity: reservation.quantity,
            image: payload.image,
            reservationId: reservation.reservation_id,
            expiresAt: reservation.expires_at,
          },
        ]
      })
    } catch (error: any) {
      if (error?.name === "INSUFFICIENT_STOCK" || error?.message === "INSUFFICIENT_STOCK") {
        const stockError = new Error("Quantité disponible épuisée")
        stockError.name = "INSUFFICIENT_STOCK"
        throw stockError
      }
      throw error
    }
  }

  const removeItem = async (productId: string, size: string) => {
    const target = items.find((item) => item.productId === productId && item.size === size)
    if (!target) return
    await releaseRequest(target.reservationId)
    setItems((prev) => prev.filter((item) => item.reservationId !== target.reservationId))
  }

  const updateQuantity = async (productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId, size)
      return
    }

    // Trouver l'item cible
    const target = items.find((item) => item.productId === productId && item.size === size)
    if (!target) return

    try {
      const reservation = await reserveRequest({
        cartId,
        productId,
        size,
        color: target.color,
        quantity,
        reservationId: target.reservationId,
      })

      setItems((prev) =>
        prev.map((item) =>
          item.reservationId === target.reservationId
            ? { ...item, quantity: reservation.quantity, expiresAt: reservation.expires_at }
            : item,
        ),
      )
    } catch (error: any) {
      if (error?.name === "INSUFFICIENT_STOCK" || error?.message === "INSUFFICIENT_STOCK") {
        const stockError = new Error("Quantité disponible épuisée")
        stockError.name = "INSUFFICIENT_STOCK"
        throw stockError
      }
      throw error
    }
  }

  const applyCoupon = (coupon: Coupon, discountAmount: number, hasFreeShipping: boolean) => {
    setAppliedCoupon(coupon)
    setDiscount(discountAmount)
    setFreeShipping(hasFreeShipping)

    toast({
      title: "Code promo appliqué !",
      description: coupon.description || `${coupon.code} a été appliqué à votre panier.`,
    })
  }

  const removeCoupon = () => {
    setAppliedCoupon(undefined)
    setDiscount(0)
    setFreeShipping(false)

    toast({
      title: "Code promo retiré",
      description: "Le code promo a été retiré de votre panier.",
    })
  }

  const clearCart = async () => {
    await Promise.allSettled(items.map((item) => releaseRequest(item.reservationId)))
    setItems([])
    // Réinitialiser aussi le coupon lorsqu'on vide le panier
    removeCoupon()
  }

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    return {
      items,
      itemCount,
      subtotal,
      coupon: appliedCoupon,
      discount,
      freeShipping,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      applyCoupon,
      removeCoupon,
    }
  }, [items, appliedCoupon, discount, freeShipping])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}
