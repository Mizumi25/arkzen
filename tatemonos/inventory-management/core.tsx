/* @arkzen:meta
name: inventory-management
version: 2.0.0
description: Full inventory management with stock tracking
auth: false
dependencies: []
*/

/* @arkzen:config
modal:
  borderRadius: 2xl
  backdrop: blur
  animation: fadeScale
toast:
  position: top-right
  duration: 3000
table:
  striped: true
  hoverable: true
*/

/* @arkzen:database:inventories
table: inventories
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  name:
    type: string
    length: 255
    nullable: false
  sku:
    type: string
    length: 100
    unique: true
    nullable: false
  quantity:
    type: integer
    default: 0
    nullable: false
  price:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  category:
    type: string
    length: 100
    nullable: true
  description:
    type: text
    nullable: true
seeder:
  count: 5
  data:
    - name: Wireless Keyboard
      sku: WK-001
      quantity: 50
      price: 1299.00
      category: Electronics
      description: Compact wireless keyboard
    - name: USB Hub 4-Port
      sku: UH-001
      quantity: 120
      price: 450.00
      category: Electronics
      description: 4-port USB 3.0 hub
    - name: Notebook A5
      sku: NB-001
      quantity: 200
      price: 85.00
      category: Stationery
      description: A5 lined notebook
    - name: Office Chair
      sku: OC-001
      quantity: 15
      price: 8500.00
      category: Furniture
      description: Ergonomic office chair
    - name: Monitor Stand
      sku: MS-001
      quantity: 30
      price: 750.00
      category: Furniture
      description: Adjustable monitor stand
*/

/* @arkzen:api:inventories
model: Inventory
controller: InventoryController
prefix: /api/inventories
middleware: []
endpoints:
  index:
    method: GET
    route: /
    description: Get paginated list of inventories
    query:
      search: string|optional
      per_page: integer|default:15
    response:
      type: paginated
  show:
    method: GET
    route: /{id}
    description: Get single inventory item
    response:
      type: single
  store:
    method: POST
    route: /
    description: Create new inventory item
    validation:
      name: required|string|max:255
      sku: required|string|unique:inventories
      quantity: required|integer|min:0
      price: required|numeric|min:0
      category: nullable|string|max:100
      description: nullable|string
    response:
      type: single
  update:
    method: PUT
    route: /{id}
    description: Update inventory item
    validation:
      name: sometimes|string|max:255
      quantity: sometimes|integer|min:0
      price: sometimes|numeric|min:0
      category: nullable|string|max:100
      description: nullable|string
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete inventory item
    response:
      type: message
      value: Item deleted successfully
*/

/* @arkzen:components:shared */

'use client'

import React, { useState } from 'react'
import { Package, TrendingUp, AlertTriangle, DollarSign, Edit2, Trash2, Plus } from 'lucide-react'
import { Modal }      from '@/arkzen/core/components/Modal'
import { Dialog }     from '@/arkzen/core/components/Dialog'
import { Badge }      from '@/arkzen/core/components/utils'
import { useToast }   from '@/arkzen/core/components/Toast'
import { useQuery }   from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'

interface InventoryItem {
  id:          number
  name:        string
  sku:         string
  quantity:    number
  price:       number
  category:    string | null
  description: string | null
  created_at:  string
  updated_at:  string
}

interface FormState {
  name: string; sku: string; quantity: string
  price: string; category: string; description: string
}

const emptyForm: FormState = { name: '', sku: '', quantity: '', price: '', category: '', description: '' }

const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) => (
  <div className="arkzen-card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-neutral-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
    </div>
  </div>
)

const InventoryRow = ({ item, onEdit, onDelete }: { item: InventoryItem; onEdit: (i: InventoryItem) => void; onDelete: (i: InventoryItem) => void }) => {
  const stockVariant = item.quantity === 0 ? 'error' : item.quantity < 20 ? 'warning' : 'success'
  const stockLabel   = item.quantity === 0 ? 'Out of stock' : item.quantity < 20 ? 'Low stock' : 'In stock'
  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors group">
      <td className="px-4 py-3.5">
        <p className="font-medium text-neutral-900 text-sm">{item.name}</p>
        <p className="text-xs text-neutral-400 font-mono mt-0.5">{item.sku}</p>
      </td>
      <td className="px-4 py-3.5 text-sm text-neutral-600">{item.category ?? '—'}</td>
      <td className="px-4 py-3.5"><Badge label={stockLabel} variant={stockVariant} dot /></td>
      <td className="px-4 py-3.5 text-sm font-medium">{item.quantity}</td>
      <td className="px-4 py-3.5 text-sm font-semibold">₱{Number(item.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"><Edit2 size={14} /></button>
          <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )
}

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const { toast }                                    = useToast()
  const [search, setSearch]                          = useState('')
  const [modalOpen, setModalOpen]                    = useState(false)
  const [deleteDialog, setDeleteDialog]              = useState(false)
  const [editing, setEditing]                        = useState<InventoryItem | null>(null)
  const [deleting, setDeleting]                      = useState<InventoryItem | null>(null)
  const [form, setForm]                              = useState<FormState>(emptyForm)

  const { data, isLoading, refetch } = useQuery<{ data: InventoryItem[] }>('/api/inventories', { params: { per_page: 100 } })
  const items = data?.data ?? []

  const { mutate: saveItem, isLoading: saving } = useMutation({
    method:     editing ? 'PUT' : 'POST',
    invalidates: ['/api/inventories'],
    onSuccess:  () => { toast.success(editing ? 'Item updated' : 'Item created'); setModalOpen(false); refetch() },
    onError:    () => toast.error('Failed to save item'),
  })

  const { mutate: removeItem } = useMutation({
    method:     'DELETE',
    invalidates: ['/api/inventories'],
    onSuccess:  () => { toast.success('Item deleted'); setDeleteDialog(false); refetch() },
    onError:    () => toast.error('Failed to delete item'),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit   = (item: InventoryItem) => {
    setEditing(item)
    setForm({ name: item.name, sku: item.sku, quantity: String(item.quantity), price: String(item.price), category: item.category ?? '', description: item.description ?? '' })
    setModalOpen(true)
  }
  const openDelete = (item: InventoryItem) => { setDeleting(item); setDeleteDialog(true) }

  const handleSave = () => {
    if (!form.name || !form.sku || !form.price) { toast.error('Name, SKU and price are required'); return }
    const url = editing ? `/api/inventories/${editing.id}` : '/api/inventories'
    saveItem(url, { ...form, quantity: parseInt(form.quantity) || 0, price: parseFloat(form.price) || 0 })
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = items.reduce((s, i) => s + (i.price * i.quantity), 0)
  const lowStock   = items.filter(i => i.quantity < 20 && i.quantity > 0).length
  const outOfStock = items.filter(i => i.quantity === 0).length

  return (
    <div className="arkzen-container">
      <div className="flex items-start justify-between mb-8 inventory-header">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Inventory</h1>
          <p className="text-neutral-500 mt-1">Manage your products and stock levels</p>
        </div>
        <button onClick={openCreate} className="arkzen-btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 inventory-stats">
        <StatCard label="Total Items"  value={items.length}                          icon={<Package size={20} className="text-blue-600" />}    color="bg-blue-50" />
        <StatCard label="Total Value"  value={`₱${totalValue.toLocaleString()}`}    icon={<DollarSign size={20} className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard label="Low Stock"    value={lowStock}                              icon={<AlertTriangle size={20} className="text-amber-600" />} color="bg-amber-50" />
        <StatCard label="Out of Stock" value={outOfStock}                            icon={<TrendingUp size={20} className="text-red-600" />}   color="bg-red-50" />
      </div>

      <div className="arkzen-card overflow-hidden inventory-table">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-semibold text-neutral-900">
            All Items <span className="ml-2 text-neutral-400 font-normal">({filtered.length})</span>
          </h2>
          <input type="text" placeholder="Search name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="arkzen-input w-56" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                {['Item', 'Category', 'Status', 'Qty', 'Price', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-4 bg-neutral-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-400 text-sm">
                    {search ? 'No items match your search' : 'No inventory items yet. Add your first item.'}
                  </td>
                </tr>
              ) : (
                filtered.map(item => <InventoryRow key={item.id} item={item} onEdit={openEdit} onDelete={openDelete} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Item' : 'Add New Item'}
        description={editing ? `Editing ${editing.name}` : 'Fill in the details below'}
        renderFooter={(onClose) => (
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="arkzen-btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="arkzen-btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">Name *</label>
            <input className="arkzen-input w-full" placeholder="Product name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">SKU *</label>
            <input className="arkzen-input w-full" placeholder="SKU-001" value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} disabled={!!editing} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">Category</label>
            <input className="arkzen-input w-full" placeholder="Electronics" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">Quantity</label>
            <input className="arkzen-input w-full" type="number" min="0" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">Price (₱) *</label>
            <input className="arkzen-input w-full" type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">Description</label>
            <textarea className="arkzen-input w-full resize-none" rows={3} placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
        </div>
      </Modal>

      <Dialog
        open={deleteDialog}
        onConfirm={() => deleting && removeItem(`/api/inventories/${deleting.id}`, {})}
        onCancel={() => setDeleteDialog(false)}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  )
}
/* @arkzen:page:index:end */

/* @arkzen:animation */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import React from 'react'

gsap.registerPlugin(ScrollTrigger)

const inventoryManagementAnimations = (pageRef: React.RefObject<HTMLDivElement>) => {
  const ctx = gsap.context(() => {
    gsap.fromTo('.inventory-header', { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
    gsap.fromTo('.inventory-stats > *', { opacity: 0, y: 20, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.2 })
    gsap.fromTo('.inventory-table', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.5 })
  }, pageRef)
  return () => ctx.revert()
}

export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25 } },
}

/* @arkzen:animation:end */
