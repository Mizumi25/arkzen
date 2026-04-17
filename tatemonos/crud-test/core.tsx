/* @arkzen:meta
name: flower-shop
version: 1.0.1
description: Simple flower shop e‑commerce – products, cart, checkout, orders.
auth: false
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
modal:
  borderRadius: 2xl
  backdrop: blur
layout:
  guest:
    className: "min-h-screen bg-rose-50"
*/

/* @arkzen:database:products
table: products
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  name:
    type: string
    length: 200
    nullable: false
  description:
    type: text
    nullable: true
  price:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  image_url:
    type: string
    length: 500
    nullable: true
  stock:
    type: integer
    default: 0
seeder:
  count: 6
  data:
    - name: Red Rose Bouquet
      description: 12 long-stem red roses wrapped in elegant paper
      price: 25.00
      image_url: https://images.unsplash.com/photo-1561181286-d3fee7d8b4b2?w=400&h=300&fit=crop
      stock: 50
    - name: Sunny Daisies
      description: Bright yellow daisies in a ceramic pot
      price: 18.50
      image_url: https://images.unsplash.com/photo-1582793988951-9aed5509eb97?w=400&h=300&fit=crop
      stock: 30
    - name: Lavender Dreams
      description: Fragrant lavender bundle – perfect for relaxation
      price: 22.00
      image_url: https://images.unsplash.com/photo-1595970121640-52d1c5f1f0a8?w=400&h=300&fit=crop
      stock: 20
    - name: Mixed Tulips
      description: Assorted colorful tulips, freshly cut
      price: 19.90
      image_url: https://images.unsplash.com/photo-1526413233644-6db3ff2a6ceb?w=400&h=300&fit=crop
      stock: 40
    - name: Peony Perfection
      description: Soft pink peonies – elegant and fragrant
      price: 32.00
      image_url: https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=300&fit=crop
      stock: 15
    - name: Orchid Elegance
      description: White phalaenopsis orchid in a glass vase
      price: 45.00
      image_url: https://images.unsplash.com/photo-1567225557594-88d73e55f2b1?w=400&h=300&fit=crop
      stock: 10
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
  customer_name:
    type: string
    length: 200
    nullable: false
  customer_email:
    type: string
    length: 200
    nullable: false
  customer_address:
    type: text
    nullable: false
  total_amount:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  status:
    type: string
    length: 50
    default: pending
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
    index: true
  product_id:
    type: integer
    nullable: false
  product_name:
    type: string
    length: 200
  quantity:
    type: integer
    nullable: false
  unit_price:
    type: decimal
    precision: 10
    scale: 2
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
    description: List all products
    response:
      type: collection
  show:
    method: GET
    route: /{id}
    description: Get single product
*/

/* @arkzen:api:orders
model: Order
controller: OrderController
prefix: /api/flower-shop/orders
middleware: []
endpoints:
  index:
    method: GET
    route: /
    description: List all orders (admin view)
    response:
      type: collection
  store:
    method: POST
    route: /
    description: Create a new order (checkout)
    validation:
      customer_name: required|string|max:200
      customer_email: required|email|max:200
      customer_address: required|string
      items: required|array
      items.*.product_id: required|integer|exists:products,id
      items.*.quantity: required|integer|min:1
    response:
      type: single
  update_status:
    method: PUT
    route: /{id}/status
    description: Update order status
    validation:
      status: required|string|in:pending,paid,shipped,delivered,cancelled
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'
import { useToast } from '@/arkzen/core/components/Toast'
import { Modal } from '@/arkzen/core/components/Modal'

interface Product {
  id: number
  name: string
  description: string | null
  price: number   // will be cast from string
  image_url: string | null
  stock: number
}

interface CartItem extends Product {
  quantity: number
}

// Helper to ensure numeric values from API (which may return strings)
function toNumber(value: any): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */

const FlowerShopPage = () => {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [checkoutData, setCheckoutData] = useState({
    customer_name: '',
    customer_email: '',
    customer_address: ''
  })
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [showOrders, setShowOrders] = useState(false)

  // Load products on mount
  useEffect(() => {
    arkzenFetch('/api/flower-shop/products')
      .then(res => res.json())
      .then(data => {
        const rawProducts = data.data || []
        // Convert price and stock to numbers
        const normalized = rawProducts.map((p: any) => ({
          ...p,
          price: toNumber(p.price),
          stock: toNumber(p.stock)
        }))
        setProducts(normalized)
      })
      .catch(console.error)
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem('flower_shop_cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch(e) {}
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('flower_shop_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prev, { ...product, quantity: 1 }]
      }
    })
    toast.success(`Added ${product.name} to cart`)
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === productId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const removeItem = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId))
    toast.info('Item removed')
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleCheckout = async () => {
    if (!checkoutData.customer_name || !checkoutData.customer_email || !checkoutData.customer_address) {
      toast.error('Please fill in all checkout fields')
      return
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    const items = cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity
    }))

    try {
      const res = await arkzenFetch('/api/flower-shop/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...checkoutData,
          items
        })
      })
      const data = await res.json()
      if (res.ok) {
        setOrderPlaced(true)
        setCart([])
        localStorage.removeItem('flower_shop_cart')
        toast.success('Order placed! Thank you.')
        if (showOrders) loadOrders()
      } else {
        toast.error(data.message || 'Order failed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Network error, please try again')
    }
  }

  const loadOrders = async () => {
    try {
      const res = await arkzenFetch('/api/flower-shop/orders')
      const data = await res.json()
      setOrders(data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const toggleOrders = () => {
    if (!showOrders) loadOrders()
    setShowOrders(!showOrders)
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-rose-700">🌸 Bloom & Co.</h1>
          <p className="text-gray-500">Fresh flowers delivered with love</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleOrders}
            className="text-sm text-gray-500 hover:text-rose-600 underline"
          >
            {showOrders ? 'Hide Orders' : 'View Orders'}
          </button>
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative bg-white rounded-full p-3 shadow-md hover:shadow-lg transition"
          >
            🛒
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Orders Panel */}
      {showOrders && (
        <div className="mb-8 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Recent Orders</h2>
            <button className="text-xs text-neutral-400" onClick={loadOrders}>Refresh</button>
          </div>
          {orders.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-400">No orders yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {orders.map(order => (
                <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{order.customer_name}</p>
                    <p className="text-xs text-neutral-500">₱{toNumber(order.total_amount).toFixed(2)} · {order.status}</p>
                  </div>
                  <div className="text-xs text-neutral-400">{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map(product => {
          const priceNum = product.price; // already number
          return (
            <div key={product.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition">
              <img
                src={product.image_url || 'https://placehold.co/400x300?text=Flower'}
                alt={product.name}
                className="w-full h-48 object-cover"
                onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x300?text=Flower')}
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-rose-600 font-bold text-xl">₱{priceNum.toFixed(2)}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm hover:bg-rose-600 transition"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart Modal */}
      <Modal
        open={showCart}
        onClose={() => setShowCart(false)}
        title="Your Cart"
        description={cart.length === 0 ? "Your cart is empty" : `Total: ₱${cartTotal.toFixed(2)}`}
        renderFooter={(onClose) => (
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="arkzen-btn-secondary flex-1">Continue Shopping</button>
            {cart.length > 0 && !orderPlaced && (
              <button onClick={handleCheckout} className="arkzen-btn-primary flex-1">Checkout</button>
            )}
          </div>
        )}
      >
        {cart.length === 0 ? (
          <p className="text-neutral-400 text-center py-4">Your cart is empty</p>
        ) : (
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.id} className="flex gap-3 border-b pb-3">
                <img src={item.image_url || '/flower-placeholder.jpg'} className="w-16 h-16 object-cover rounded" alt={item.name} />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">₱{item.price.toFixed(2)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-100">-</button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-full bg-gray-100">+</button>
                    <button onClick={() => removeItem(item.id)} className="text-rose-500 text-sm ml-2">Remove</button>
                  </div>
                </div>
                <div className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
            {!orderPlaced && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  className="arkzen-input w-full"
                  value={checkoutData.customer_name}
                  onChange={e => setCheckoutData({...checkoutData, customer_name: e.target.value})}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  className="arkzen-input w-full"
                  value={checkoutData.customer_email}
                  onChange={e => setCheckoutData({...checkoutData, customer_email: e.target.value})}
                />
                <textarea
                  placeholder="Delivery address"
                  className="arkzen-input w-full resize-none"
                  rows={2}
                  value={checkoutData.customer_address}
                  onChange={e => setCheckoutData({...checkoutData, customer_address: e.target.value})}
                />
              </div>
            )}
            {orderPlaced && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded text-center">
                🎉 Order placed! Thank you for shopping with us.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

/* @arkzen:page:index:end */