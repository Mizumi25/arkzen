/* @arkzen:meta
name: portfolio-test
version: 1.0.0
description: Frontend-only portfolio showcase
auth: false
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:components:shared */

'use client'

import React from 'react'
import { Code2, Mail, Github, Linkedin, ExternalLink, Star } from 'lucide-react'

const PROJECTS = [
  { id: 1, title: 'E-commerce', description: 'Full-stack e-commerce', image: '🛒', url: 'https://example.com', tags: ['Next.js', 'Laravel'] },
  { id: 2, title: 'Tasks', description: 'Real-time collaboration', image: '✓', url: 'https://example.com', tags: ['React', 'WebSocket'] },
  { id: 3, title: 'Analytics', description: 'Data dashboard', image: '📊', url: 'https://example.com', tags: ['Chart.js', 'Laravel'] }
]

const SKILLS = [
  { name: 'React', category: 'Frontend', proficiency: 95 },
  { name: 'Next.js', category: 'Frontend', proficiency: 92 },
  { name: 'Laravel', category: 'Backend', proficiency: 90 },
  { name: 'PostgreSQL', category: 'Database', proficiency: 85 }
]

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const PortfolioPage = () => {
  const [submitted, setSubmitted] = React.useState(false)
  const categories = Array.from(new Set(SKILLS.map(s => s.category)))

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2">
          <Code2 size={24} className="text-neutral-900" />
          <span className="font-semibold text-neutral-900">Portfolio</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-20">
        <section className="text-center">
          <h1 className="text-5xl font-semibold text-neutral-900 mb-4">Full-Stack Developer</h1>
          <p className="text-lg text-neutral-600">Crafting digital experiences</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 flex items-center gap-2"><Star size={20} />Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROJECTS.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition">
                <div className="h-32 bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center text-5xl">{p.image}</div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-neutral-600 mb-4">{p.description}</p>
                  <div className="flex gap-2 mb-4">
                    {p.tags.map((t, i) => (<span key={i} className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600 rounded">{t}</span>))}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-neutral-900 font-medium">View <ExternalLink size={14} /></a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-12">Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {categories.map(cat => (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-neutral-900 mb-6">{cat}</h3>
                <div className="space-y-4">
                  {SKILLS.filter(s => s.category === cat).map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-neutral-700">{s.name}</span>
                        <span className="text-xs text-neutral-500">{s.proficiency}%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full"><div className="h-full bg-neutral-900" style={{ width: `${s.proficiency}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Mail size={20} className="text-neutral-900" />
            <h2 className="text-2xl font-semibold text-neutral-900">Contact</h2>
          </div>
          {submitted && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm">Thanks!</div>}
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000) }} className="space-y-4">
            <input type="text" placeholder="Name" required className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg" />
            <input type="email" placeholder="Email" required className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg" />
            <textarea placeholder="Message" rows={4} required className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg resize-none" />
            <button type="submit" className="w-full bg-neutral-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-neutral-800">Send</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default PortfolioPage

/* @arkzen:page:index:end */
