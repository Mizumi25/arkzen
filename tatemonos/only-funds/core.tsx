/* @arkzen:meta
name: only-funds
version: 1.0.0
description: A donation platform for creating and managing fundraising campaigns
auth: true
dependencies: []
*/

/* @arkzen:config
modal:
  borderRadius: 2xl
  backdrop: blur
  animation: fadeScale
toast:
  position: top-right
  duration: 4000
layout:
  guest:
    className: "min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100"
  auth:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:campaigns
table: campaigns
timestamps: true
softDeletes: false

columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  user_id:
    type: integer
    foreign: users.id
    onDelete: cascade
    nullable: false
  title:
    type: string
    length: 255
    nullable: false
  slug:
    type: string
    length: 255
    unique: true
    nullable: false
  description:
    type: text
    nullable: false
  goal_amount:
    type: decimal
    precision: 12
    scale: 2
    nullable: false
  current_amount:
    type: decimal
    precision: 12
    scale: 2
    default: 0
    nullable: false
  image_url:
    type: string
    length: 500
    nullable: true
  status:
    type: string
    length: 20
    default: active
    nullable: false
  end_date:
    type: date
    nullable: true

seeder:
  count: 5
  data:
    - title: "Community Garden Project"
      slug: "community-garden"
      description: "Help us build a community garden for everyone to enjoy fresh produce"
      goal_amount: 5000.00
      current_amount: 1250.00
      status: "active"
    - title: "School Library Renovation"
      slug: "school-library"
      description: "Renovating the school library to create a better learning environment"
      goal_amount: 10000.00
      current_amount: 3400.00
      status: "active"
*/

/* @arkzen:database:donations
table: donations
timestamps: true
softDeletes: false

columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  campaign_id:
    type: integer
    foreign: campaigns.id
    onDelete: cascade
    nullable: false
  user_id:
    type: integer
    foreign: users.id
    onDelete: SET NULL
    nullable: true
  donor_name:
    type: string
    length: 255
    nullable: false
  donor_email:
    type: string
    length: 255
    nullable: false
  amount:
    type: decimal
    precision: 12
    scale: 2
    nullable: false
  message:
    type: text
    nullable: true
  is_anonymous:
    type: boolean
    default: false
    nullable: false
  payment_status:
    type: string
    length: 20
    default: pending
    nullable: false

seeder:
  count: 20
*/

/* @arkzen:api:campaigns
model: Campaign
controller: CampaignController
prefix: /api/campaigns
middleware: [auth:sanctum]
resource: true
policy: true
factory: true

endpoints:
  index:
    method: GET
    route: /
    description: Get all active campaigns
    query:
      status: string|optional
      search: string|optional
      per_page: integer|default:12
    response:
      type: paginated

  store:
    method: POST
    route: /
    description: Create a new campaign
    validation:
      title: required|string|max:255
      description: required|string
      goal_amount: required|numeric|min:1
      image_url: sometimes|url|max:500
      end_date: sometimes|date|after:today
    response:
      type: single

  show:
    method: GET
    route: /{slug}
    description: Get campaign by slug
    response:
      type: single

  update:
    method: PUT
    route: /{id}
    description: Update campaign
    validation:
      title: sometimes|string|max:255
      description: sometimes|string
      goal_amount: sometimes|numeric|min:1
      status: sometimes|in:active,paused,completed,cancelled
    response:
      type: single

  destroy:
    method: DELETE
    route: /{id}
    description: Delete campaign
    response:
      type: message
      value: Campaign deleted

  my-campaigns:
    method: GET
    route: /user/my-campaigns
    description: Get current user's campaigns
    response:
      type: collection
*/

/* @arkzen:api:donations
model: Donation
controller: DonationController
prefix: /api/donations
middleware: [auth:sanctum]
resource: false
policy: true
factory: true

endpoints:
  index:
    method: GET
    route: /
    description: Get donations for user's campaigns
    query:
      campaign_id: integer|optional
      per_page: integer|default:20
    response:
      type: paginated

  store:
    method: POST
    route: /
    description: Create a donation
    validation:
      campaign_id: required|exists:campaigns,id
      donor_name: required|string|max:255
      donor_email: required|email|max:255
      amount: required|numeric|min:1
      message: sometimes|string|max:1000
      is_anonymous: sometimes|boolean
    response:
      type: single

  campaign-donations:
    method: GET
    route: /campaign/{campaignId}
    description: Get donations for a specific campaign
    response:
      type: collection
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore, setActiveTatemono } from '@/arkzen/core/stores/authStore'
import { Heart, Plus, Edit2, Trash2, Users, Target, Calendar, Eye, TrendingUp, Award, Copy, Check, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from '@/arkzen/core/components/Modal'
import { Dialog } from '@/arkzen/core/components/Dialog'
import { useToast } from '@/arkzen/core/components/Toast'
import { useQuery } from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'
import { format } from 'date-fns'

if (typeof window !== 'undefined') {
  setActiveTatemono('only-funds')
}

interface Campaign {
  id: number
  user_id: number
  title: string
  slug: string
  description: string
  goal_amount: number
  current_amount: number
  image_url: string | null
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  end_date: string | null
  created_at: string
  progress_percent?: number
}

interface Donation {
  id: number
  campaign_id: number
  user_id: number | null
  donor_name: string
  donor_email: string
  amount: number
  message: string | null
  is_anonymous: boolean
  payment_status: string
  created_at: string
}

/* @arkzen:components:shared:end */

/* @arkzen:components:campaign-card */

const CampaignCard = ({ campaign, onView, onEdit, onDelete, isOwner = false }: {
  campaign: Campaign
  onView: () => void
  onEdit?: () => void
  onDelete?: () => void
  isOwner?: boolean
}) => {
  const progress = (campaign.current_amount / campaign.goal_amount) * 100
  const isCompleted = campaign.current_amount >= campaign.goal_amount

  return (
    <div className="arkzen-card overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group" onClick={onView}>
      <div className="relative h-48 bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center">
        {campaign.image_url ? (
          <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
        ) : (
          <Heart size={48} className="text-white/30" />
        )}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            campaign.status === 'active' ? 'bg-green-100 text-green-700' :
            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
            campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>
            {campaign.status}
          </span>
        </div>
        {isCompleted && campaign.status === 'active' && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Goal Reached!</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-neutral-900 mb-2 line-clamp-1">{campaign.title}</h3>
        <p className="text-neutral-500 text-sm mb-4 line-clamp-2">{campaign.description}</p>
        
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-neutral-600">{Math.round(progress)}% funded</span>
            <span className="text-neutral-600">${campaign.current_amount.toLocaleString()} / ${campaign.goal_amount.toLocaleString()}</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}</span>
          {campaign.end_date && <span>Ends {format(new Date(campaign.end_date), 'MMM d, yyyy')}</span>}
        </div>

        {isOwner && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="flex-1 arkzen-btn-secondary text-sm py-1.5">Edit</button>
            <button onClick={onDelete} className="flex-1 arkzen-btn-danger text-sm py-1.5">Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* @arkzen:components:campaign-card:end */

/* @arkzen:components:create-campaign-modal */

const CreateCampaignModal = ({ open, onClose, onSuccess }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) => {
  const { toast } = useToast()
  const [form, setForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    image_url: '',
    end_date: '',
  })

  const { mutate: createCampaign, isLoading } = useMutation({
    method: 'POST',
    invalidates: ['/api/campaigns', '/api/campaigns/user/my-campaigns'],
    onSuccess: () => {
      toast.success('Campaign created successfully!')
      onSuccess()
      onClose()
      setForm({ title: '', description: '', goal_amount: '', image_url: '', end_date: '' })
    },
    onError: () => toast.error('Failed to create campaign'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.goal_amount) {
      toast.error('Please fill in all required fields')
      return
    }
    createCampaign('/api/campaigns', {
      ...form,
      goal_amount: parseFloat(form.goal_amount),
      end_date: form.end_date || null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Start a New Campaign">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Campaign Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="arkzen-input w-full"
            placeholder="Help us build a community garden"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="arkzen-input w-full min-h-[100px]"
            placeholder="Tell your story and why people should support your cause..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Goal Amount ($) *</label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={form.goal_amount}
            onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
            className="arkzen-input w-full"
            placeholder="5000"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Image URL (optional)</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="arkzen-input w-full"
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">End Date (optional)</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="arkzen-input w-full"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="arkzen-btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={isLoading} className="arkzen-btn-primary flex-1">
            {isLoading ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* @arkzen:components:create-campaign-modal:end */

/* @arkzen:components:donation-modal */

const DonationModal = ({ open, onClose, campaign, onSuccess }: {
  open: boolean
  onClose: () => void
  campaign: Campaign | null
  onSuccess: () => void
}) => {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    donor_name: '',
    donor_email: '',
    amount: '',
    message: '',
    is_anonymous: false,
  })

  const { mutate: createDonation, isLoading } = useMutation({
    method: 'POST',
    invalidates: [`/api/donations/campaign/${campaign?.id}`, `/api/campaigns`],
    onSuccess: () => {
      toast.success('Thank you for your donation!')
      onSuccess()
      onClose()
      setForm({ donor_name: '', donor_email: '', amount: '', message: '', is_anonymous: false })
    },
    onError: () => toast.error('Failed to process donation'),
  })

  useEffect(() => {
    if (user && campaign) {
      setForm(prev => ({
        ...prev,
        donor_name: user.name || '',
        donor_email: user.email || '',
      }))
    }
  }, [user, campaign])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaign) return
    if (!form.donor_name || !form.donor_email || !form.amount) {
      toast.error('Please fill in all required fields')
      return
    }
    createDonation('/api/donations', {
      campaign_id: campaign.id,
      ...form,
      amount: parseFloat(form.amount),
    })
  }

  if (!campaign) return null

  const suggestedAmounts = [10, 25, 50, 100, 250]

  return (
    <Modal open={open} onClose={onClose} title={`Support: ${campaign.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Your Name *</label>
          <input
            type="text"
            value={form.donor_name}
            onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
            className="arkzen-input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Your Email *</label>
          <input
            type="email"
            value={form.donor_email}
            onChange={(e) => setForm({ ...form, donor_email: e.target.value })}
            className="arkzen-input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Donation Amount ($) *</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedAmounts.map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => setForm({ ...form, amount: amount.toString() })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  form.amount === amount.toString()
                    ? 'bg-rose-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="arkzen-input w-full"
            placeholder="Other amount"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Message (optional)</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="arkzen-input w-full min-h-[80px]"
            placeholder="Leave a message of support..."
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_anonymous}
            onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
            className="rounded border-neutral-300"
          />
          <span className="text-sm text-neutral-600">Donate anonymously</span>
        </label>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="arkzen-btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={isLoading} className="arkzen-btn-primary flex-1">
            {isLoading ? 'Processing...' : `Donate $${form.amount || '0'}`}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* @arkzen:components:donation-modal:end */

/* @arkzen:components:campaign-stats */

const CampaignStats = ({ campaign }: { campaign: Campaign }) => {
  const progress = (campaign.current_amount / campaign.goal_amount) * 100
  const daysLeft = campaign.end_date 
    ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h3 className="font-semibold text-neutral-900 mb-4">Campaign Stats</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-neutral-600">Funding Progress</span>
            <span className="font-medium text-neutral-900">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-3">
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-xs text-neutral-400">Raised</p>
            <p className="text-xl font-bold text-neutral-900">${campaign.current_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Goal</p>
            <p className="text-xl font-bold text-neutral-900">${campaign.goal_amount.toLocaleString()}</p>
          </div>
          {daysLeft !== null && (
            <div>
              <p className="text-xs text-neutral-400">Days Left</p>
              <p className="text-xl font-bold text-neutral-900">{daysLeft}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-neutral-400">Supporters</p>
            <p className="text-xl font-bold text-neutral-900">—</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* @arkzen:components:campaign-stats:end */

/* @arkzen:components:donations-list */

const DonationsList = ({ donations }: { donations: Donation[] }) => {
  if (donations.length === 0) {
    return (
      <div className="text-center py-8">
        <Heart size={48} className="mx-auto text-neutral-300 mb-3" />
        <p className="text-neutral-500">No donations yet. Be the first to support this campaign!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {donations.map((donation) => (
        <div key={donation.id} className="p-4 bg-neutral-50 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-neutral-900">
                {donation.is_anonymous ? 'Anonymous Donor' : donation.donor_name}
              </p>
              <p className="text-xs text-neutral-400">{format(new Date(donation.created_at), 'MMM d, yyyy h:mm a')}</p>
            </div>
            <p className="font-bold text-rose-600">${donation.amount.toLocaleString()}</p>
          </div>
          {donation.message && (
            <p className="text-sm text-neutral-600 mt-2 italic">"{donation.message}"</p>
          )}
        </div>
      ))}
    </div>
  )
}

/* @arkzen:components:donations-list:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  const { toast } = useToast()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await register(form.name, form.email, form.password, form.password_confirmation)
    if (result.success) {
      toast.success('Registration successful! Welcome aboard.')
    } else {
      toast.error(result.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full arkzen-card p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <Heart size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Create an Account</h1>
          <p className="text-neutral-500 mt-1">Join OnlyFunds and start making a difference</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="arkzen-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="arkzen-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="arkzen-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              className="arkzen-input w-full"
              required
            />
          </div>
          <button type="submit" disabled={isLoading} className="arkzen-btn-primary w-full">
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{' '}
          <a href="/only-funds/login" className="text-rose-500 hover:text-rose-600 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { toast } = useToast()
  const { login, isLoading } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await login(form.email, form.password)
    if (!result.success) {
      toast.error(result.message || 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full arkzen-card p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <Heart size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Welcome Back</h1>
          <p className="text-neutral-500 mt-1">Sign in to manage your campaigns</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="arkzen-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="arkzen-input w-full"
              required
            />
          </div>
          <button type="submit" disabled={isLoading} className="arkzen-btn-primary w-full">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-neutral-500 mt-6">
          Don't have an account?{' '}
          <a href="/only-funds/register" className="text-rose-500 hover:text-rose-600 font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:auth */
const IndexPage = () => {
  const { toast } = useToast()
  const { user, logout } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [donationModalOpen, setDonationModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)

  const { data: campaignsData, refetch: refetchCampaigns } = useQuery<{ data: Campaign[] }>(
    `/api/campaigns?${statusFilter !== 'all' ? `status=${statusFilter}&` : ''}${searchTerm ? `search=${searchTerm}` : ''}`
  )
  const campaigns = campaignsData?.data ?? []

  const { data: myCampaignsData } = useQuery<{ data: Campaign[] }>('/api/campaigns/user/my-campaigns')
  const myCampaigns = myCampaignsData?.data ?? []

  const { mutate: deleteCampaign } = useMutation({
    method: 'DELETE',
    invalidates: ['/api/campaigns', '/api/campaigns/user/my-campaigns'],
    onSuccess: () => {
      toast.success('Campaign deleted')
      setDeleteTarget(null)
      refetchCampaigns()
    },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const filteredCampaigns = campaigns.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="arkzen-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Heart size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">OnlyFunds</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setCreateModalOpen(true)} className="arkzen-btn-primary text-sm flex items-center gap-2">
                <Plus size={16} /> Start Campaign
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-medium text-neutral-700">{user?.name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button onClick={() => logout()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="arkzen-container py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-3xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Make a Difference Today</h2>
          <p className="text-rose-100 mb-6">Support causes that matter and help bring ideas to life</p>
          <button onClick={() => setCreateModalOpen(true)} className="bg-white text-rose-600 px-6 py-2 rounded-full font-medium hover:shadow-lg transition-shadow">
            Start Your Campaign
          </button>
        </div>

        {/* My Campaigns Section */}
        {myCampaigns.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900">Your Campaigns</h3>
              <button onClick={() => setCreateModalOpen(true)} className="text-rose-500 text-sm hover:text-rose-600 flex items-center gap-1">
                <Plus size={14} /> Create New
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCampaigns.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={{ ...campaign, progress_percent: (campaign.current_amount / campaign.goal_amount) * 100 }}
                  onView={() => { setSelectedCampaign(campaign); setDonationModalOpen(true) }}
                  onEdit={() => {}}
                  onDelete={() => setDeleteTarget(campaign)}
                  isOwner
                />
              ))}
            </div>
          </div>
        )}

        {/* Explore Campaigns */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-semibold text-neutral-900">Explore Campaigns</h3>
            <div className="flex gap-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={{ ...campaign, progress_percent: (campaign.current_amount / campaign.goal_amount) * 100 }}
                onView={() => { setSelectedCampaign(campaign); setDonationModalOpen(true) }}
              />
            ))}
          </div>
          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12">
              <Heart size={48} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500">No campaigns found. Be the first to start one!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateCampaignModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={refetchCampaigns} />
      <DonationModal open={donationModalOpen} onClose={() => setDonationModalOpen(false)} campaign={selectedCampaign} onSuccess={refetchCampaigns} />
      
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Campaign"
        renderIcon={() => <Trash2 size={24} className="text-red-500" />}
        renderContent={() => (
          <p>Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.</p>
        )}
        renderActions={(onClose) => (
          <>
            <button onClick={onClose} className="arkzen-btn-secondary">Cancel</button>
            <button onClick={() => deleteTarget && deleteCampaign(`/api/campaigns/${deleteTarget.id}`, {})} className="arkzen-btn-danger">Delete</button>
          </>
        )}
      />
    </div>
  )
}
/* @arkzen:page:index:end */

/* @arkzen:page:campaign-slug */
/* @arkzen:page:layout:auth */
const CampaignDetailPage = () => {
  const { toast } = useToast()
  const [donationModalOpen, setDonationModalOpen] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const slug = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : ''

  const { data: campaignData, refetch: refetchCampaign } = useQuery<{ data: Campaign }>(slug ? `/api/campaigns/${slug}` : null)
  const { data: donationsData } = useQuery<Donation[]>(campaign?.id ? `/api/donations/campaign/${campaign.id}` : null)

  useEffect(() => {
    if (campaignData?.data) setCampaign(campaignData.data)
    if (donationsData) setDonations(donationsData)
  }, [campaignData, donationsData])

  if (!campaign) {
    return (
      <div className="arkzen-container py-12 text-center">
        <Heart size={48} className="mx-auto text-neutral-300 mb-3" />
        <p className="text-neutral-500">Loading campaign...</p>
      </div>
    )
  }

  const progress = (campaign.current_amount / campaign.goal_amount) * 100

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="arkzen-container py-8">
        <a href="/only-funds" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-700 mb-6">
          <ChevronLeft size={20} /> Back to all campaigns
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="arkzen-card overflow-hidden">
              <div className="h-64 bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center">
                {campaign.image_url ? (
                  <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                ) : (
                  <Heart size={64} className="text-white/30" />
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-4">{campaign.title}</h1>
                <p className="text-neutral-600 leading-relaxed">{campaign.description}</p>
              </div>
            </div>

            <div className="arkzen-card p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Recent Donations</h3>
              <DonationsList donations={donations} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CampaignStats campaign={campaign} />
            
            <button
              onClick={() => setDonationModalOpen(true)}
              disabled={campaign.status !== 'active' || campaign.current_amount >= campaign.goal_amount}
              className="arkzen-btn-primary w-full py-3 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart size={20} /> Donate Now
            </button>

            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-semibold text-neutral-900 mb-3">Share this campaign</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  readOnly
                  className="arkzen-input flex-1 text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    toast.success('Link copied!')
                  }}
                  className="arkzen-btn-secondary px-4"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DonationModal open={donationModalOpen} onClose={() => setDonationModalOpen(false)} campaign={campaign} onSuccess={() => { refetchCampaign(); window.location.reload() }} />
    </div>
  )
}
/* @arkzen:page:campaign-slug:end */