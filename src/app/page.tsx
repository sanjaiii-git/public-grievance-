'use client'

import { Home, Lock, Users, Folder } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="w-10 h-10 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Land Records System</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="flex justify-center mb-6">
            <Home className="w-20 h-20 text-blue-600" />
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            🏠 Land Records System
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Secure, transparent, and blockchain-powered land record management system
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105">
                Get Started
              </button>
            </Link>
            <Link href="#features">
              <button className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-8 py-4 rounded-lg shadow-lg border-2 border-gray-300 transition-all duration-200">
                Learn More
              </button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="bg-blue-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Secure & Transparent</h3>
            <p className="text-gray-600 leading-relaxed">
              Blockchain technology ensures immutable and transparent record keeping
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Role-Based Access</h3>
            <p className="text-gray-600 leading-relaxed">
              Different access levels for citizens, officials, and administrators
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="bg-purple-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <Folder className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">IPFS Storage</h3>
            <p className="text-gray-600 leading-relaxed">
              Distributed document storage with cryptographic verification
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-200">
        <p className="text-center text-gray-600">
          © 2026 Land Records System. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
