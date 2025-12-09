export interface ProductVariant {
  id: string
  color: string
  size: string
  quantity: number
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  promotional_price?: number | null
  category: string
  subcategory?: string[] | null
  sizes: string[]
  colors?: string[]
  variants: ProductVariant[]
  images: string[]
  is_active: boolean
  sku?: string | null
  badge?: 'new' | 'top_sale' | null
  low_stock_threshold?: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  parent_id?: string | null
  created_at: string
  updated_at: string
}

export interface LowStockNotification {
  id: string
  product_id: string
  product_name: string
  size: string
  current_stock: number
  threshold: number
  notified_at: string
  is_resolved: boolean
}

export interface AdminUser {
  id: string
  email: string
  role: string
  created_at: string
}

export interface User {
  id: string
  email: string
}

export interface FavoriteItem {
  product_id: string
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  full_name?: string
  phone?: string
  address?: string
  postal_code?: string
  city?: string
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other'
  preferences?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CartItem {
  productId: string
  name: string
  price: number
  size: string
  color?: string
  quantity: number
  image?: string
  reservationId: string
  expiresAt: string | null
}

export interface OrderItem {
  product_id: string
  name: string
  size: string
  color?: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  address: string
  postal_code?: string
  city: string
  items: OrderItem[]
  total_amount: number
  delivery_fee: number
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled' | 'returned' | 'confirmed_delivery'
  inventory_restored?: boolean
  notes?: string
  coupon_code?: string
  coupon_discount?: number
  free_shipping_from_coupon?: boolean
  user_id?: string
  created_at: string
  updated_at: string
}

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value?: number // Pour les réductions % ou fixe (€)
  expiration_date?: string
  max_uses?: number
  current_uses: number
  is_active: boolean
  applicable_products?: string[] // IDs de produits
  applicable_categories?: string[] // Noms de catégories
  minimum_order: number // Montant minimum pour appliquer
  description?: string
  created_at: string
  updated_at: string
}

export interface CouponUsage {
  id: string
  coupon_id: string
  user_id?: string
  order_id?: string
  session_id?: string
  discount_amount: number
  created_at: string
}
