/* @arkzen:meta
name: flower-shop
version: 1.0.0
description: Full-stack flower shop management. Products, inventory, customer orders, and appointment scheduling. Includes authentication, real-time stock updates, and order notifications.
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 4000
layout:
  guest:
    className: "min-h-screen bg-rose-50"
  auth:
    className: "min-h-screen bg-rose-50"
*/

/* @arkzen:database:products
table: products
timestamps: true
softDeletes: true
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  name:
    type: string
    length: 255
    nullable: false
  description:
    type: text
    nullable: true
  price:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  stock_quantity:
    type: integer
    default: 0
  category:
    type: string
    length: 100
    nullable: false
  image_url:
    type: string
    length: 500
    nullable: true
  is_active:
    type: boolean
    default: true
seeder:
  count: 8
  data:
    - name: Red Roses Bouquet
      description: Classic dozen red roses, perfect for romance.
      price: 49.99
      stock_quantity: 25
      category: bouquets
      image_url: /images/red-roses.jpg
    - name: Sunflower Bunch
      description: Bright and cheerful sunflowers.
      price: 29.99
      stock_quantity: 15
      category: seasonal
      image_url: /images/sunflowers.jpg
    - name: Orchid Arrangement
      description: Elegant white orchids in a ceramic pot.
      price: 79.99
      stock_quantity: 8
      category: arrangements
      image_url: /images/orchids.jpg
    - name: Mixed Tulips
      description: Colorful spring tulips.
      price: 34.99
      stock_quantity: 20
      category: seasonal
      image_url: /images/tulips.jpg
*/

/* @arkzen:database:orders
table: orders
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  user_id:
    type: integer
    nullable: false
    foreign: flower_shop_users.id
  order_number:
    type: string
    length: 50
    nullable: false
    unique: true
  total_amount:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  status:
    type: string
    length: 50
    default: pending
  delivery_date:
    type: date
    nullable: true
  delivery_address:
    type: text
    nullable: false
  notes:
    type: text
    nullable: true
*/

/* @arkzen:database:order_items
table: order_items
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  order_id:
    type: integer
    nullable: false
    foreign: flower_shop_orders.id
  product_id:
    type: integer
    nullable: false
    foreign: flower_shop_products.id
  quantity:
    type: integer
    nullable: false
  unit_price:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
*/

/* @arkzen:database:appointments
table: appointments
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  user_id:
    type: integer
    nullable: false
    foreign: flower_shop_users.id
  service_type:
    type: string
    length: 100
    nullable: false
  appointment_date:
    type: datetime
    nullable: false
  status:
    type: string
    length: 50
    default: scheduled
  notes:
    type: text
    nullable: true
*/

/* @arkzen:api:products
model: Product
controller: ProductController
prefix: /api/flower-shop/products
middleware: []
endpoints:
  index:
    method: GET
    route: /
    description: List all products (public)
    query:
      category: string
      search: string
    response:
      type: paginated
  show:
    method: GET
    route: /{id}
    description: Get single product details
    response:
      type: single
  store:
    method: POST
    route: /
    description: Create a new product (admin only)
    type: role_admin_only
    validation:
      name: required|string|max:255
      description: nullable|string
      price: required|numeric|min:0
      stock_quantity: required|integer|min:0
      category: required|string
      image_url: nullable|url
      is_active: boolean
    response:
      type: single
  update:
    method: PUT
    route: /{id}
    description: Update product (admin only)
    type: role_admin_only
    validation:
      name: sometimes|string|max:255
      description: nullable|string
      price: sometimes|numeric|min:0
      stock_quantity: sometimes|integer|min:0
      category: sometimes|string
      image_url: nullable|url
      is_active: sometimes|boolean
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete product (admin only)
    type: role_admin_only
    response:
      type: message
      value: Product deleted
*/

/* @arkzen:api:orders
model: Order
controller: OrderController
prefix: /api/flower-shop/orders
middleware: [auth]
endpoints:
  index:
    method: GET
    route: /
    description: List user's orders (or all for admin)
    response:
      type: paginated
  show:
    method: GET
    route: /{id}
    description: Get order details with items
    response:
      type: single
  store:
    method: POST
    route: /
    description: Create a new order
    validation:
      items: required|array|min:1
      items.*.product_id: required|integer|exists:flower_shop_products,id
      items.*.quantity: required|integer|min:1
      delivery_date: required|date|after:today
      delivery_address: required|string
      notes: nullable|string
    response:
      type: single
  updateStatus:
    method: PATCH
    route: /{id}/status
    description: Update order status (admin only)
    type: role_admin_only
    validation:
      status: required|in:pending,confirmed,preparing,out_for_delivery,delivered,cancelled
    response:
      type: single
*/

/* @arkzen:api:appointments
model: Appointment
controller: AppointmentController
prefix: /api/flower-shop/appointments
middleware: [auth]
endpoints:
  index:
    method: GET
    route: /
    description: List user's appointments (or all for admin)
    response:
      type: paginated
  store:
    method: POST
    route: /
    description: Book a new appointment
    validation:
      service_type: required|in:consultation,wedding,event,custom
      appointment_date: required|date|after:now
      notes: nullable|string
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Cancel appointment
    response:
      type: message
      value: Appointment cancelled
*/

/* @arkzen:notifications:order-confirmation
channels: [mail, database]
subject: "Order Confirmation"
message: "Thank you for your order! We'll notify you when it's on the way."
*/
/* @arkzen:notifications:order-confirmation:end */

/* @arkzen:notifications:appointment-reminder
channels: [mail, database]
subject: "Appointment Reminder"
message: "You have a flower consultation tomorrow. We look forward to seeing you!"
*/
/* @arkzen:notifications:appointment-reminder:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, setActiveTatemono, arkzenFetch } from '@/arkzen/core/stores/authStore'

if (typeof window !== 'undefined') {
  setActiveTatemono('flower-shop')
}

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    try {
      await login(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-rose-800">🌸 Flower Shop</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to your account</p>
        </div>
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
        <div className="space-y-3">
          <input className="arkzen-input w-full" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="arkzen-input w-full" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="arkzen-btn w-full bg-rose-700 hover:bg-rose-800" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-xs text-center text-neutral-400">
          No account? <a href="/flower-shop/register" className="text-rose-700 underline underline-offset-2">Register</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  const { register, isLoading } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    try {
      await register(name, email, password, confirm)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-rose-800">🌸 Flower Shop</h1>
          <p className="text-sm text-neutral-500 mt-1">Create an account</p>
        </div>
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
        <div className="space-y-3">
          <input className="arkzen-input w-full" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
          <input className="arkzen-input w-full" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="arkzen-input w-full" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <input className="arkzen-input w-full" type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button className="arkzen-btn w-full bg-rose-700 hover:bg-rose-800" onClick={handleRegister} disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
        <p className="text-xs text-center text-neutral-400">
          Already have an account? <a href="/flower-shop/login" className="text-rose-700 underline underline-offset-2">Sign in</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])

  useEffect(() => {
    arkzenFetch('/api/flower-shop/products').then(r => r.json()).then(d => setProducts(d.data?.slice(0,4) || []))
    arkzenFetch('/api/flower-shop/orders').then(r => r.json()).then(d => setOrders(d.data || []))
    arkzenFetch('/api/flower-shop/appointments').then(r => r.json()).then(d => setAppointments(d.data || []))
  }, [])

  const handleLogout = async () => {
    await logout()
    router.refresh()
    router.replace('/flower-shop/login')
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-rose-800">🌸 Flower Shop Dashboard</h1>
            <p className="text-sm text-neutral-500">Welcome back, {user?.name}</p>
          </div>
          <button className="text-xs text-neutral-400 hover:text-neutral-700" onClick={handleLogout}>Sign out</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-rose-100 p-5">
            <h2 className="font-semibold mb-2">🌺 Featured Bouquets</h2>
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-medium">${p.price}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 text-xs text-rose-700" onClick={() => router.push('/flower-shop/shop')}>View all products →</button>
          </div>
          <div className="bg-white rounded-2xl border border-rose-100 p-5">
            <h2 className="font-semibold mb-2">📦 Recent Orders</h2>
            {orders.length === 0 ? <p className="text-sm text-neutral-400">No orders yet.</p> : orders.slice(0,3).map(o => (
              <div key={o.id} className="text-sm flex justify-between">
                <span>#{o.order_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
              </div>
            ))}
            <button className="mt-4 text-xs text-rose-700" onClick={() => router.push('/flower-shop/orders')}>View all orders →</button>
          </div>
          <div className="bg-white rounded-2xl border border-rose-100 p-5">
            <h2 className="font-semibold mb-2">📅 Upcoming Appointments</h2>
            {appointments.length === 0 ? <p className="text-sm text-neutral-400">No appointments.</p> : appointments.slice(0,3).map(a => (
              <div key={a.id} className="text-sm flex justify-between">
                <span>{a.service_type}</span>
                <span className="text-neutral-500">{a.appointment_date?.slice(0,10)}</span>
              </div>
            ))}
            <button className="mt-4 text-xs text-rose-700" onClick={() => router.push('/flower-shop/appointments')}>Schedule new →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */

/* @arkzen:page:shop */
/* @arkzen:page:layout:auth */
const ShopPage = () => {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const loadProducts = async () => {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (search) params.append('search', search)
    const res = await arkzenFetch(`/api/flower-shop/products?${params}`)
    const d = await res.json()
    setProducts(d.data || [])
  }

  useEffect(() => { loadProducts() }, [category])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? {...i, quantity: i.quantity+1} : i)
      return [...prev, {...product, quantity: 1}]
    })
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-rose-800">🌸 Shop Flowers</h1>
          <div className="relative">
            <button className="arkzen-btn-outline" onClick={() => router.push('/flower-shop/cart')}>🛒 Cart ({cart.reduce((s,i) => s+i.quantity, 0)})</button>
          </div>
        </div>
        <div className="flex gap-4">
          <select className="arkzen-input w-48" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="bouquets">Bouquets</option>
            <option value="seasonal">Seasonal</option>
            <option value="arrangements">Arrangements</option>
          </select>
          <input className="arkzen-input flex-1" placeholder="Search flowers..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter'&&loadProducts()} />
          <button className="arkzen-btn" onClick={loadProducts}>Search</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-rose-100 p-4 space-y-2">
              <div className="h-32 bg-rose-50 rounded-xl flex items-center justify-center text-3xl">🌸</div>
              <h3 className="font-medium">{p.name}</h3>
              <p className="text-sm text-neutral-500 line-clamp-2">{p.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-rose-800">${p.price}</span>
                <span className="text-xs text-neutral-400">{p.stock_quantity} in stock</span>
              </div>
              <button className="arkzen-btn w-full text-sm" onClick={() => addToCart(p)} disabled={p.stock_quantity < 1}>Add to Cart</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:shop:end */