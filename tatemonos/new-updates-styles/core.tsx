/* @arkzen:meta
name: new-updates-styles
version: 2.0.0
description: Showcase tatemono demonstrating component separation, CSS/Style DSL, multiple pages, and custom components
auth: false
favicon: https://cdn-icons-png.flaticon.com/512/1995/1995467.png
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
    className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50"
  auth:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Zap, Code, Palette, Layers, Menu, X } from 'lucide-react'

// ─── CUSTOM COMPONENTS ───────────────────────────────

const Navbar = ({ currentPath }: { currentPath: string }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const links = [
    { name: 'Home', path: '/new-updates-styles' },
    { name: 'About', path: '/new-updates-styles/about' },
    { name: 'Features', path: '/new-updates-styles/features' },
  ]

  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600" />
          <span className="font-bold text-lg">Arkzen v2.0</span>
        </div>
        
        {/* Desktop menu */}
        <div className="hidden md:flex gap-1">
          {links.map(link => (
            <Link
              key={link.path}
              href={link.path}
              className={`navbar-link ${currentPath === link.path ? 'navbar-link-active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-neutral-100"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="navbar-mobile md:hidden">
          {links.map(link => (
            <Link
              key={link.path}
              href={link.path}
              onClick={() => setIsOpen(false)}
              className={`navbar-mobile-link ${currentPath === link.path ? 'navbar-mobile-link-active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: 'blue' | 'purple' | 'green' | 'orange'
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color }) => {
  const bgColors = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }
  
  return (
    <div className={`rounded-xl border-2 p-6 ${bgColors[color]}`}>
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm opacity-80">{description}</p>
    </div>
  )
}

interface HeroSectionProps {
  title: string
  subtitle: string
  ctaText: string
  onCta?: () => void
}

const HeroSection: React.FC<HeroSectionProps> = ({ title, subtitle, ctaText, onCta }) => {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-xl text-neutral-600">{subtitle}</p>
      <button 
        onClick={onCta}
        className="arkzen-btn mx-auto"
      >
        {ctaText}
      </button>
    </div>
  )
}

// ─── UTILITIES & TYPES ───────────────────────────────

type Feature = {
  id: number
  icon: 'zap' | 'code' | 'palette' | 'layers'
  title: string
  description: string
  color: 'blue' | 'purple' | 'green' | 'orange'
}

const FEATURES: Feature[] = [
  {
    id: 1,
    icon: 'zap',
    title: 'Component Separation',
    description: 'Individual component files with shared utilities backend',
    color: 'blue',
  },
  {
    id: 2,
    icon: 'code',
    title: 'CSS DSL Support',
    description: 'Global CSS variables and per-component CSS Modules',
    color: 'purple',
  },
  {
    id: 3,
    icon: 'palette',
    title: 'Multiple Pages',
    description: 'Support for home, about, features, and custom routes',
    color: 'green',
  },
  {
    id: 4,
    icon: 'layers',
    title: 'Asset Management',
    description: 'Built-in favicon, image, and static file support',
    color: 'orange',
  },
]

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    zap:    <Zap size={32} />,
    code:   <Code size={32} />,
    palette: <Palette size={32} />,
    layers:  <Layers size={32} />,
  }
  return icons[iconName] || null
}

/* @arkzen:components:shared:end */

/* @arkzen:style */
:root {
  --color-primary: #2563eb;
  --color-secondary: #7c3aed;
  --color-accent: #059669;
  --spacing-unit: 0.25rem;
  --radius-default: 0.75rem;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Navbar styles */
.navbar {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.navbar-link {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-block;
}

.navbar-link:hover {
  color: #111827;
  background: #f3f4f6;
}

.navbar-link-active {
  color: var(--color-primary);
  background: #dbeafe;
}

.navbar-mobile {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.navbar-mobile-link {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  transition: all 0.2s;
  display: block;
}

.navbar-mobile-link:hover {
  color: #111827;
  background: #f3f4f6;
}

.navbar-mobile-link-active {
  color: var(--color-primary);
  background: #dbeafe;
}

.arkzen-btn {
  padding: calc(var(--spacing-unit) * 3) calc(var(--spacing-unit) * 6);
  border-radius: var(--radius-default);
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.arkzen-btn:hover {
  background: var(--color-secondary);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.arkzen-btn:active {
  transform: translateY(0);
}

.arkzen-input {
  padding: calc(var(--spacing-unit) * 2.5) calc(var(--spacing-unit) * 3);
  border: 2px solid #e5e7eb;
  border-radius: var(--radius-default);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.arkzen-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
/* @arkzen:style:end */

/* @arkzen:style:FeatureCard */
.feature-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.feature-card:hover::before {
  left: 100%;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
/* @arkzen:style:FeatureCard:end */

/* @arkzen:style:HeroSection */
.hero-gradient {
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.hero-cta {
  position: relative;
  overflow: hidden;
}

.hero-cta::after {
  content: '';
  position: absolute;
  top: 0;
  right: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.3);
  transition: right 0.6s;
}

.hero-cta:hover::after {
  right: 100%;
}
/* @arkzen:style:HeroSection:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const [activeFeature, setActiveFeature] = useState<number | null>(null)

  return (
    <div className="min-h-screen">
      <Navbar currentPath="/new-updates-styles" />
      <div className="container mx-auto px-4 space-y-12 py-8">
        <HeroSection
          title="Arkzen v2.0 Features"
          subtitle="Component separation, CSS DSL, multiple pages, and more"
          ctaText="Explore Features"
          onCta={() => setActiveFeature(1)}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {FEATURES.map(feature => (
            <div
              key={feature.id}
              onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)}
              className="cursor-pointer transition-all"
            >
              <FeatureCard
                icon={getIconComponent(feature.icon)}
                title={feature.title}
                description={feature.description}
                color={feature.color}
              />
              {activeFeature === feature.id && (
                <div className="mt-2 rounded-lg bg-neutral-100 p-4 text-sm text-neutral-700">
                  Click another feature to learn more about it
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
          <h2 className="mb-4 text-3xl font-bold">What's New in v2.0?</h2>
          <ul className="space-y-2">
            <li>✓ Individual component files with shared utilities backend</li>
            <li>✓ Global CSS variables (@arkzen:style)</li>
            <li>✓ Per-component CSS Modules (@arkzen:style:ComponentName)</li>
            <li>✓ Support for multiple pages (index, about, features, etc.)</li>
            <li>✓ Automatic favicon and asset management</li>
            <li>✓ Zero hardcoding - fully generative</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:index:end */

/* @arkzen:page:about */
/* @arkzen:page:layout:guest */
const AboutPage = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const sections = [
    {
      title: 'Architecture',
      content: 'Pages are completely individual with their own page.tsx files. Components are separated into individual re-export files that import from a shared _components.tsx backend for utilities and types.',
    },
    {
      title: 'Styling',
      content: 'The CSS DSL supports both global CSS variables (for design tokens) and per-component CSS Modules. All styles are generated from @arkzen:style blocks in your tatemono file.',
    },
    {
      title: 'Generation',
      content: 'Everything is generated from a single core.tsx tatemono file. No hardcoding. Update your tatemono and rebuild with `node start.js` to regenerate all pages and components.',
    },
  ]

  return (
    <div className="min-h-screen">
      <Navbar currentPath="/new-updates-styles/about" />
      <div className="container mx-auto px-4 space-y-8 py-8">
        <h1 className="text-4xl font-bold">About This Showcase</h1>
        <p className="text-xl text-neutral-600">
          This tatemono demonstrates all the new features added to Arkzen v2.0
        </p>

        <div className="space-y-4">
          {sections.map(section => (
            <div
              key={section.title}
              className="rounded-lg border-2 border-neutral-200 p-6"
            >
              <button
                onClick={() => setExpandedSection(
                  expandedSection === section.title ? null : section.title
                )}
                className="flex w-full items-center justify-between text-lg font-bold hover:text-blue-600"
              >
                {section.title}
                <span>{expandedSection === section.title ? '−' : '+'}</span>
              </button>
              {expandedSection === section.title && (
                <p className="mt-4 text-neutral-700">{section.content}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:about:end */

/* @arkzen:page:features */
/* @arkzen:page:layout:guest */
const FeaturesPage = () => {
  const [selectedColor, setSelectedColor] = useState<'blue' | 'purple' | 'green' | 'orange'>('blue')

  return (
    <div className="min-h-screen">
      <Navbar currentPath="/new-updates-styles/features" />
      <div className="container mx-auto px-4 space-y-8 py-8">
        <h1 className="text-4xl font-bold">All Features</h1>
        
        <div className="flex gap-4 flex-wrap">
          {(['blue', 'purple', 'green', 'orange'] as const).map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedColor === color
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300'
              }`}
            >
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid gap-6">
          {FEATURES.filter(f => f.color === selectedColor).map(feature => (
            <FeatureCard
              key={feature.id}
              icon={getIconComponent(feature.icon)}
              title={feature.title}
              description={feature.description}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:features:end */
