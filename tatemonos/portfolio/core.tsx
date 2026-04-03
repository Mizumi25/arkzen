/* @arkzen:meta
name: portfolio
version: 2.0.0
description: Static GSAP scroll storytelling portfolio with deep glow Apple aesthetic
auth: false
dependencies: []
*/

/* @arkzen:components:main */
'use client'

import React, { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, ExternalLink, Github, Mail, Linkedin } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

// ─── Types ──────────────────────────────────────────────────

interface Project {
  id: number
  title: string
  description: string
  tags: string[]
  year: string
  link?: string
}

interface Skill {
  name: string
  level: number
}

// ─── Data ───────────────────────────────────────────────────

const projects: Project[] = [
  {
    id: 1,
    title: 'Arkzen Engine',
    description: 'A full stack scaffolding engine. One tatemono file generates an entire feature — database, API, frontend, animations. Built on Next.js and Laravel.',
    tags: ['Next.js', 'Laravel', 'TypeScript', 'GSAP'],
    year: '2026',
  },
  {
    id: 2,
    title: 'Art Transcendence',
    description: 'A web development studio delivering premium digital experiences to businesses across Mindanao. Fast delivery. Clean code. Real results.',
    tags: ['Branding', 'Web Dev', 'Freelance'],
    year: '2026',
  },
  {
    id: 3,
    title: 'Enterprise Management System',
    description: 'Full stack business management platform with inventory, billing, HR, and reporting modules. Built for MSME clients in CDO.',
    tags: ['Laravel', 'React', 'SQLite'],
    year: '2025',
  },
]

const skills: Skill[] = [
  { name: 'Next.js / React', level: 92 },
  { name: 'Laravel / PHP', level: 88 },
  { name: 'TypeScript', level: 85 },
  { name: 'GSAP / Animation', level: 90 },
  { name: 'Tailwind CSS', level: 95 },
  { name: 'UI/UX Design', level: 80 },
]

// ─── Glow Orb ───────────────────────────────────────────────

const GlowOrb = ({ x, y, size, color }: { x: string; y: string; size: number; color: string }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: x, top: y,
      width: size, height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      transform: 'translate(-50%, -50%)',
      filter: 'blur(40px)',
      opacity: 0.15,
    }}
  />
)

// ─── Project Card ────────────────────────────────────────────

const ProjectCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="group relative p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:bg-white/10 transition-all duration-500 cursor-pointer"
  >
    {/* Deep glow on hover */}
    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(120,80,255,0.15) 0%, transparent 70%)' }}
    />

    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs text-white/30 font-mono">{project.year}</span>
        <ExternalLink size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
      </div>

      <h3 className="text-xl font-semibold text-white mb-3 leading-tight">
        {project.title}
      </h3>

      <p className="text-sm text-white/50 leading-relaxed mb-6">
        {project.description}
      </p>

      <div className="flex flex-wrap gap-2">
        {project.tags.map(tag => (
          <span key={tag} className="px-3 py-1 text-xs rounded-full border border-white/10 text-white/40">
            {tag}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
)

// ─── Skill Bar ───────────────────────────────────────────────

const SkillBar = ({ skill, index }: { skill: Skill; index: number }) => {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!barRef.current) return
    gsap.fromTo(barRef.current,
      { width: '0%' },
      {
        width: `${skill.level}%`,
        duration: 1.2,
        ease: 'power3.out',
        delay: index * 0.1,
        scrollTrigger: {
          trigger: barRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    )
  }, [skill.level, index])

  return (
    <div className="skill-bar-item">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-white/70">{skill.name}</span>
        <span className="text-sm text-white/30 font-mono">{skill.level}%</span>
      </div>
      <div className="h-px bg-white/10 overflow-hidden">
        <div
          ref={barRef}
          className="h-full"
          style={{ background: 'linear-gradient(90deg, rgba(120,80,255,0.8), rgba(80,200,255,0.8))' }}
        />
      </div>
    </div>
  )
}


/* @arkzen:components:main:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const PortfolioPage = () => {
  const pageRef         = useRef<HTMLDivElement>(null)
  const heroRef         = useRef<HTMLDivElement>(null)
  const nameRef         = useRef<HTMLHeadingElement>(null)
  const subtitleRef     = useRef<HTMLParagraphElement>(null)
  const scrollIndicator = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Mouse glow effect
  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  useEffect(() => {
    if (!pageRef.current) return

    const ctx = gsap.context(() => {

      // Hero entrance timeline
      const tl = gsap.timeline({ delay: 0.3 })

      tl.fromTo(nameRef.current,
        { opacity: 0, y: 60, filter: 'blur(20px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power4.out' }
      )
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6'
      )
      .fromTo('.hero-cta',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }, '-=0.4'
      )
      .fromTo(scrollIndicator.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 }, '-=0.2'
      )

      // Scroll indicator bounce
      gsap.to(scrollIndicator.current, {
        y: 8,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      })

      // Section reveals
      gsap.utils.toArray('.section-title').forEach((el) => {
        gsap.fromTo(el as Element,
          { opacity: 0, x: -40 },
          {
            opacity: 1, x: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el as Element,
              start: 'top 80%',
              toggleActions: 'play none none none',
            }
          }
        )
      })

      // About section text reveal
      gsap.fromTo('.about-text',
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.about-text',
            start: 'top 80%',
          }
        }
      )

    }, pageRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={pageRef} className="relative min-h-screen bg-[#050508] text-white overflow-x-hidden">

      {/* Dynamic mouse glow */}
      <div
        className="fixed pointer-events-none z-0 transition-all duration-100"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          width: 600,
          height: 600,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(120,80,255,0.08) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Static background orbs */}
      <GlowOrb x="20%" y="20%" size={600} color="rgba(120,80,255,0.2)" />
      <GlowOrb x="80%" y="60%" size={500} color="rgba(80,200,255,0.15)" />
      <GlowOrb x="50%" y="90%" size={400} color="rgba(255,80,180,0.1)" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-widest text-white/60 uppercase">
          Mizumi
        </div>
        <div className="flex items-center gap-8">
          {['Work', 'About', 'Skills', 'Contact'].map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-white/40 hover:text-white transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <div className="max-w-4xl mx-auto">

          <p className="hero-cta text-xs tracking-[0.4em] text-white/30 uppercase mb-8">
            Full Stack Developer · Designer · Builder
          </p>

          <h1 ref={nameRef} className="text-6xl md:text-8xl font-bold tracking-tight leading-none mb-6">
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.4) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Crafting Digital
            </span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, rgba(120,80,255,1) 0%, rgba(80,200,255,1) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Experiences
            </span>
          </h1>

          <p ref={subtitleRef} className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed mb-12">
            I build fast, beautiful, and scalable web applications.
            From MSME systems to premium portfolios — every pixel intentional.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a href="#work" className="hero-cta px-8 py-3.5 rounded-2xl text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors">
              View Work
            </a>
            <a href="#contact" className="hero-cta px-8 py-3.5 rounded-2xl text-sm font-medium border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-all">
              Get in Touch
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div ref={scrollIndicator} className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs text-white/20 tracking-widest uppercase">Scroll</span>
          <ArrowDown size={14} className="text-white/20" />
        </div>
      </section>

      {/* Work */}
      <section id="work" className="relative px-8 py-32 max-w-6xl mx-auto">
        <h2 className="section-title text-xs tracking-[0.4em] text-white/30 uppercase mb-16">
          Selected Work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative px-8 py-32 max-w-4xl mx-auto">
        <h2 className="section-title text-xs tracking-[0.4em] text-white/30 uppercase mb-16">
          About
        </h2>
        <div className="about-text space-y-6">
          <p className="text-3xl font-light text-white/80 leading-relaxed">
            I'm a developer from Kinoguitan, Misamis Oriental — building things that matter.
          </p>
          <p className="text-base text-white/40 leading-relaxed max-w-2xl">
            Currently finishing my OJT at a web dev startup in Cagayan de Oro. Building Arkzen — my own full stack scaffolding engine that generates complete applications from a single file. Founder of Art Transcendence.
          </p>
          <p className="text-base text-white/40 leading-relaxed max-w-2xl">
            I believe great software is indistinguishable from art. Every system I build is designed to be fast, maintainable, and beautiful.
          </p>
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className="relative px-8 py-32 max-w-4xl mx-auto">
        <h2 className="section-title text-xs tracking-[0.4em] text-white/30 uppercase mb-16">
          Skills
        </h2>
        <div className="space-y-8">
          {skills.map((skill, i) => (
            <SkillBar key={skill.name} skill={skill} index={i} />
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative px-8 py-32 text-center max-w-2xl mx-auto">
        <h2 className="section-title text-xs tracking-[0.4em] text-white/30 uppercase mb-8">
          Contact
        </h2>
        <h3 className="text-4xl font-bold text-white mb-6">
          Let's build something
          <span style={{
            background: 'linear-gradient(135deg, rgba(120,80,255,1), rgba(80,200,255,1))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}> together.</span>
        </h3>
        <p className="text-white/40 mb-12">
          Available for freelance projects and full-time opportunities.
        </p>
        <div className="flex items-center justify-center gap-6">
          <a href="mailto:hello@arttranscendence.com"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/20 text-white/60 hover:border-white/40 hover:text-white transition-all text-sm">
            <Mail size={14} />
            Email
          </a>
          <a href="https://github.com/Mizumi25"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/20 text-white/60 hover:border-white/40 hover:text-white transition-all text-sm">
            <Github size={14} />
            GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-white/20">© 2026 Art Transcendence</span>
        <span className="text-xs text-white/20">Built with Arkzen</span>
      </footer>

    </div>
  )
}

/* @arkzen:page:index:end */

/* @arkzen:animation */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import React from 'react'

gsap.registerPlugin(ScrollTrigger)

const portfolioAnimations = (pageRef: React.RefObject<HTMLDivElement>) => {
  const ctx = gsap.context(() => {

    // Parallax on background orbs
    gsap.to('.portfolio-orb-1', {
      y: -200,
      ease: 'none',
      scrollTrigger: {
        trigger: pageRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
      }
    })

    gsap.to('.portfolio-orb-2', {
      y: -120,
      ease: 'none',
      scrollTrigger: {
        trigger: pageRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 2,
      }
    })

  }, pageRef)

  return () => ctx.revert()
}

export const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.8 } },
  exit:    { opacity: 0, transition: { duration: 0.4 } },
}


/* @arkzen:animation:end */
