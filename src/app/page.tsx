'use client'

import { useState } from 'react'
import {
  Shield, MapPin, Users, BarChart3, Clock, FileText, ChevronRight, ChevronDown,
  Zap, Globe, Lock, Eye, AlertTriangle, CheckCircle, UserCheck, Settings,
  Layers, ArrowRight, Star, X, Activity, Search, MessageSquare, TrendingUp,
  ShieldCheck, Fingerprint, Camera, Award
} from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const [showLearnMore, setShowLearnMore] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Public Grievance Portal</h1>
                <p className="text-[10px] text-blue-600 font-medium -mt-0.5">AI + Blockchain Enabled</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <button className="text-gray-600 hover:text-gray-900 font-medium text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">
                  Sign In
                </button>
              </Link>
              <Link href="/signup">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/*  1. HERO SECTION                                                 */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />

        <div className="relative container mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full mb-8">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-200">AI + Blockchain Powered Governance</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              AI &amp; Blockchain Enabled
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Public Grievance Management
              </span>
            </h2>

            <p className="text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              A transparent, intelligent platform for citizen complaint management — powered by
              AI-based prioritisation, automatic SLA escalation, multilingual complaint handling,
              blockchain-secured records, and smart city GIS analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <button className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl shadow-blue-500/30 transition-all hover:shadow-blue-400/40 hover:scale-[1.02] flex items-center justify-center gap-2 text-base">
                  <FileText className="w-5 h-5" />
                  Get Started
                </button>
              </Link>
              <button
                onClick={() => { setShowLearnMore(true); setTimeout(() => document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 text-base"
              >
                Learn More
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-20 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '7+', label: 'Languages Supported' },
                { value: '8+', label: 'Departments Covered' },
                { value: '4', label: 'Priority Levels (AI)' },
                { value: '100%', label: 'Blockchain Integrity' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
                  <p className="text-2xl lg:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  2. FEATURE CARDS (3 Cards)                                      */}
      {/* ================================================================ */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Star className="w-4 h-4" />
              Platform Highlights
            </div>
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Intelligent Governance,
              <span className="text-blue-600"> Transparent &amp; Accountable</span>
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Every complaint is tracked, prioritised by AI, and secured on a tamper-proof ledger
              so citizens and government departments work together with trust and efficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Card 1 — Smart & Transparent Governance */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 group">
              <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Lock className="w-7 h-7 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Smart &amp; Transparent Governance</h4>
              <p className="text-gray-600 leading-relaxed text-sm">
                Every complaint is recorded on a blockchain-backed ledger, creating a tamper-proof,
                publicly verifiable record. This ensures complete accountability, prevents
                unauthorised modifications, and builds lasting citizen trust in the grievance
                redressal process.
              </p>
            </div>

            {/* Card 2 — AI-Based Complaint Management */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-amber-200 hover:shadow-xl transition-all duration-300 group">
              <div className="bg-amber-100 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-7 h-7 text-amber-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">AI-Based Complaint Management</h4>
              <p className="text-gray-600 leading-relaxed text-sm">
                Complaints filed in any regional language are automatically translated to English.
                The AI engine analyses urgency and assigns a priority score — Low, Medium, High, or
                Critical — so department admins always handle the most urgent issues first.
              </p>
            </div>

            {/* Card 3 — SLA & Smart City Monitoring */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300 group">
              <div className="bg-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-7 h-7 text-emerald-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">SLA &amp; Smart City Monitoring</h4>
              <p className="text-gray-600 leading-relaxed text-sm">
                Each department has a time-bound Service Level Agreement. When deadlines are
                missed, complaints are automatically escalated. GIS-powered heatmaps and hotspot
                detection help authorities identify problem areas and plan smarter city improvements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  3. HOW THE SYSTEM WORKS (7-step workflow)                       */}
      {/* ================================================================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Activity className="w-4 h-4" />
              End-to-End Workflow
            </div>
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How the System Works</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From the moment a citizen files a complaint to the final resolution and analytics —
              every step is automated, tracked, and transparent.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6">
              {[
                {
                  step: '1',
                  title: 'Citizen Submits Complaint',
                  desc: 'The citizen files a grievance by selecting the department, describing the issue, attaching photo evidence, and pinpointing the location on an interactive map.',
                  icon: FileText,
                  color: 'blue',
                },
                {
                  step: '2',
                  title: 'Automatic Language Translation',
                  desc: 'If the complaint is written in a regional language (Tamil, Hindi, Telugu, etc.), the system automatically detects the script and translates it to English for processing.',
                  icon: Globe,
                  color: 'purple',
                },
                {
                  step: '3',
                  title: 'AI Assigns Priority Score',
                  desc: 'The AI engine analyses the complaint for urgency keywords, department criticality, and detail level — then assigns a priority: Low, Medium, High, or Critical.',
                  icon: Zap,
                  color: 'amber',
                },
                {
                  step: '4',
                  title: 'SLA Timer Starts Automatically',
                  desc: 'Based on the department, a Service Level Agreement timer begins. If the deadline passes without resolution, the complaint is automatically escalated.',
                  icon: Clock,
                  color: 'red',
                },
                {
                  step: '5',
                  title: 'Secured with Blockchain Proof',
                  desc: 'The complaint data is hashed using SHA-256 and recorded with a unique integrity verification ID, creating a tamper-proof record that cannot be altered.',
                  icon: Shield,
                  color: 'indigo',
                },
                {
                  step: '6',
                  title: 'Admin Resolves Complaint',
                  desc: 'The department admin receives the complaint, reviews evidence and location, takes action, updates the status, and communicates the resolution to the citizen.',
                  icon: CheckCircle,
                  color: 'emerald',
                },
                {
                  step: '7',
                  title: 'Super Admin Monitors Analytics',
                  desc: 'The super admin oversees all departments, views performance dashboards, detects complaint hotspots on GIS maps, and ensures timely governance across the city.',
                  icon: TrendingUp,
                  color: 'cyan',
                },
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={item.step} className="flex gap-5 items-start group">
                    {/* Step number + connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-xl bg-${item.color}-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-6 h-6 text-${item.color}-600`} />
                      </div>
                      {idx < 6 && <div className="w-0.5 h-full min-h-[24px] bg-gray-200 mt-2" />}
                    </div>
                    {/* Content */}
                    <div className="pb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">STEP {item.step}</span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  4. USER ROLES SECTION                                           */}
      {/* ================================================================ */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Role-Based Access
            </div>
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Three Distinct User Roles</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Each user type has a dedicated dashboard tailored to their responsibilities —
              ensuring the right people see the right information at the right time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Citizen */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-bold text-white">Citizen</h4>
                <p className="text-blue-100 text-sm mt-1">Public User</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    'Submit grievances with evidence & location',
                    'Track complaint status in real time',
                    'View SLA countdown timer',
                    'Provide feedback on resolutions',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Admin */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-bold text-white">Department Admin</h4>
                <p className="text-emerald-100 text-sm mt-1">Government Officer</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    'Handle department-specific complaints',
                    'View AI priority-sorted complaint list',
                    'Update status and upload resolution proof',
                    'Communicate with citizens via replies',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Super Admin */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-bold text-white">Super Admin</h4>
                <p className="text-purple-100 text-sm mt-1">Senior Authority</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    'Monitor all departments and officers',
                    'View cross-department analytics dashboards',
                    'Identify complaint hotspots using GIS maps',
                    'Oversee SLA compliance and escalations',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  6. TRUST & SECURITY SECTION                                     */}
      {/* ================================================================ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <ShieldCheck className="w-4 h-4" />
              Trust &amp; Security
            </div>
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Built on a Foundation of
              <span className="text-emerald-600"> Security &amp; Privacy</span>
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From authentication to data storage, every layer of the platform is designed to
              protect citizen information and ensure complaint integrity.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                title: 'Secure Authentication',
                desc: 'Multi-role login with encrypted credentials and session-based access control.',
              },
              {
                icon: Users,
                title: 'Role-Based Access',
                desc: 'Citizens, admins, and super admins each see only the data relevant to their role.',
              },
              {
                icon: Fingerprint,
                title: 'Privacy Protection',
                desc: 'Sensitive information like Aadhaar numbers is SHA-256 hashed before storage.',
              },
              {
                icon: Camera,
                title: 'Evidence Verification',
                desc: 'Photo and document evidence is securely stored with access-controlled policies.',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="text-center p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all group">
                  <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  5. LEARN MORE SECTION (toggled by button)                       */}
      {/* ================================================================ */}
      {showLearnMore && (
        <section id="learn-more" className="py-20 bg-gradient-to-b from-slate-50 to-white border-t border-gray-200">
          <div className="container mx-auto px-6 max-w-5xl">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-3xl font-bold text-gray-900">Detailed System Overview</h3>
                <p className="text-gray-500 mt-1">Everything you need to know about the platform</p>
              </div>
              <button onClick={() => setShowLearnMore(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-16">
              {/* A) About the System */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">About the System</h4>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-gray-700 leading-relaxed">
                    The <strong>AI + Blockchain Enabled Public Grievance Management System</strong> is
                    designed to bridge the gap between citizens and government departments. Traditional
                    grievance processes often suffer from delays, lack of transparency, and mismanagement.
                    This platform addresses these challenges by providing an intelligent, automated, and
                    fully transparent complaint lifecycle — from the moment a citizen files a grievance to
                    its final resolution and beyond.
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-3">
                    The system empowers citizens to voice their concerns, ensures government accountability
                    through time-bound SLAs, leverages artificial intelligence for smart prioritisation,
                    and uses blockchain-backed integrity verification to prevent any tampering of records.
                  </p>
                </div>
              </div>

              {/* B) Key Technologies (Conceptual) */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Layers className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Key Technologies (Conceptual)</h4>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      title: 'AI Prioritisation',
                      desc: 'An intelligent engine scans each complaint for urgency indicators — life-threatening situations, public health risks, infrastructure failures — and automatically assigns a priority level so the most critical issues are addressed first.',
                    },
                    {
                      title: 'Multilingual Translation',
                      desc: 'Citizens can file complaints in their native language. The system detects the script (Tamil, Hindi, Telugu, and more) and translates the content to English, ensuring language is never a barrier to justice.',
                    },
                    {
                      title: 'SLA Monitoring',
                      desc: 'Every department has a defined resolution timeframe. The system continuously tracks deadlines and automatically escalates complaints that exceed their SLA, ensuring no grievance is left unattended.',
                    },
                    {
                      title: 'GIS Analytics',
                      desc: 'Complaints are geotagged on interactive maps. Authorities can visualise complaint density, detect recurring problem zones, and make data-driven decisions for urban planning and resource allocation.',
                    },
                    {
                      title: 'Blockchain Integrity',
                      desc: 'Each complaint is cryptographically hashed at the time of submission. This creates a unique digital fingerprint that can be verified later — proving the record has not been altered since filing.',
                    },
                  ].map((tech) => (
                    <div key={tech.title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <h5 className="font-bold text-gray-900 mb-2">{tech.title}</h5>
                      <p className="text-sm text-gray-600 leading-relaxed">{tech.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* C) Key Benefits */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Key Benefits</h4>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <UserCheck className="w-5 h-5" /> For Citizens
                    </h5>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li>• File complaints easily with photos and location</li>
                      <li>• Track status in real time with SLA countdown</li>
                      <li>• Receive updates when action is taken</li>
                      <li>• Trust that records cannot be tampered with</li>
                      <li>• Provide feedback to improve public services</li>
                    </ul>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                    <h5 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                      <Settings className="w-5 h-5" /> For Government Departments
                    </h5>
                    <ul className="space-y-2 text-sm text-emerald-800">
                      <li>• Receive complaints pre-sorted by AI priority</li>
                      <li>• View translated complaints in English</li>
                      <li>• Clear SLA deadlines prevent backlogs</li>
                      <li>• Evidence and location readily available</li>
                      <li>• Streamlined workflow reduces manual effort</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                    <h5 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" /> For Smart City Administration
                    </h5>
                    <ul className="space-y-2 text-sm text-purple-800">
                      <li>• Cross-department performance analytics</li>
                      <li>• GIS heatmaps reveal problem hotspots</li>
                      <li>• Data-driven urban planning decisions</li>
                      <li>• Escalation reports ensure accountability</li>
                      <li>• Transparent governance builds public trust</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* D) Complaint Lifecycle */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Complaint Lifecycle</h4>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
                    {[
                      { label: 'Citizen Files Complaint', color: 'bg-blue-100 text-blue-800' },
                      { label: 'AI Processes & Scores', color: 'bg-amber-100 text-amber-800' },
                      { label: 'Admin Handles Case', color: 'bg-emerald-100 text-emerald-800' },
                      { label: 'SLA Monitoring Active', color: 'bg-red-100 text-red-800' },
                      { label: 'Blockchain Verification', color: 'bg-indigo-100 text-indigo-800' },
                      { label: 'Analytics & Insights', color: 'bg-purple-100 text-purple-800' },
                    ].map((step, idx) => (
                      <div key={step.label} className="flex items-center gap-3">
                        <span className={`${step.color} px-4 py-2 rounded-full`}>{step.label}</span>
                        {idx < 5 && <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />}
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm text-center mt-6 leading-relaxed max-w-3xl mx-auto">
                    The lifecycle begins when a citizen submits a complaint. The AI engine translates,
                    analyses, and scores it. The complaint is then routed to the appropriate department
                    admin with a running SLA timer. Throughout the process, the complaint data is secured
                    with blockchain-backed integrity hashing. Once resolved, the data feeds into
                    analytics dashboards that help authorities identify trends and improve services.
                  </p>
                </div>
              </div>

              {/* E) Transparency & Trust */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Transparency &amp; Trust</h4>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
                  <p className="text-gray-700 leading-relaxed">
                    One of the biggest challenges in public grievance management is ensuring that
                    complaint records are not altered after submission — either by citizens or officials.
                    This system solves that problem using <strong>cryptographic integrity verification</strong>.
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-3">
                    At the time of submission, every complaint&apos;s core data is passed through a SHA-256
                    hashing algorithm, producing a unique digital fingerprint. This fingerprint is stored
                    alongside the complaint. At any point in the future, the system can recompute the hash
                    and compare it to the original — instantly detecting if even a single character has been
                    changed. This blockchain-inspired approach ensures <strong>complete immutability and
                    public accountability</strong>, giving citizens confidence that their voice is
                    permanently recorded.
                  </p>
                </div>
              </div>

              {/* F) Smart City Vision */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-cyan-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Smart City Vision</h4>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-emerald-50 rounded-xl border border-cyan-200 p-6">
                  <p className="text-gray-700 leading-relaxed">
                    Smart governance requires smart data. Every grievance in this system is geotagged with
                    precise latitude and longitude coordinates, plotted on interactive maps, and
                    aggregated into visual heatmaps.
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-3">
                    City authorities can instantly see which neighbourhoods have the highest complaint
                    density, which departments are under strain, and where infrastructure problems are
                    recurring. This geospatial intelligence enables <strong>proactive governance</strong> —
                    instead of just responding to individual complaints, administrators can identify
                    systemic issues, allocate resources strategically, and plan long-term improvements
                    that benefit entire communities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/*  CTA SECTION                                                     */}
      {/* ================================================================ */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative container mx-auto px-6 text-center">
          <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Make Your Voice Heard?
          </h3>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Register as a citizen and submit your first grievance. Track its progress,
            get timely resolutions, and help build a better city.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <button className="bg-white hover:bg-gray-50 text-blue-700 font-bold px-8 py-4 rounded-xl shadow-2xl transition-all hover:scale-[1.02] text-base">
                Create Free Account
              </button>
            </Link>
            <Link href="/login">
              <button className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl border border-white/30 transition-all text-base">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  7. FOOTER                                                       */}
      {/* ================================================================ */}
      <footer className="bg-gray-900 pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* About */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">Grievance Portal</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                An AI and blockchain-enabled platform for transparent, accountable, and
                efficient public grievance redressal — empowering citizens and strengthening
                smart city governance.
              </p>
            </div>

            {/* Features */}
            <div>
              <h5 className="text-white font-semibold mb-4">Features</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="hover:text-white transition-colors cursor-default">AI Priority Scoring</li>
                <li className="hover:text-white transition-colors cursor-default">Multilingual Translation</li>
                <li className="hover:text-white transition-colors cursor-default">Smart SLA Engine</li>
                <li className="hover:text-white transition-colors cursor-default">GIS Heatmaps</li>
                <li className="hover:text-white transition-colors cursor-default">Blockchain Integrity</li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h5 className="text-white font-semibold mb-4">Quick Links</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/login" className="hover:text-white transition-colors">Citizen Login</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Citizen Registration</Link></li>
                <li><Link href="/signup/admin" className="hover:text-white transition-colors">Admin Registration</Link></li>
                <li><Link href="/signup/superadmin" className="hover:text-white transition-colors">Super Admin Access</Link></li>
              </ul>
            </div>

            {/* Contact / Privacy */}
            <div>
              <h5 className="text-white font-semibold mb-4">Contact &amp; Support</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="cursor-default">For technical support, please contact your city administration office.</li>
              </ul>
              <h5 className="text-white font-semibold mt-6 mb-3">Privacy &amp; Transparency</h5>
              <p className="text-sm text-gray-400 leading-relaxed">
                All citizen data is protected with encryption, role-based security, and
                Aadhaar hashing. Complaint records are integrity-verified and immutable.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} AI + Blockchain Enabled Public Grievance Management System. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs">
              Academic Project — Smart City Governance Initiative
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
