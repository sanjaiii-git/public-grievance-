// Utility functions for the Land Records System

// =====================================================
// AADHAAR & SECURITY
// =====================================================

// Hash Aadhaar number using SHA-256
export async function hashAadhaar(aadhaar: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(aadhaar)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Verify Aadhaar against hash
export async function verifyAadhaar(aadhaar: string, hash: string): Promise<boolean> {
  const calculatedHash = await hashAadhaar(aadhaar)
  return calculatedHash === hash
}

// Format Aadhaar for display (masked)
export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length !== 12) return 'XXXX-XXXX-XXXX'
  return `XXXX-XXXX-${aadhaar.slice(-4)}`
}

// Format phone number
export function formatPhone(phone: string): string {
  if (!phone || phone.length !== 10) return phone
  return `${phone.slice(0, 5)}-${phone.slice(5)}`
}

// =====================================================
// BLOCKCHAIN
// =====================================================

// Generate complaint hash
export async function hashComplaint(data: any): Promise<string> {
  const encoder = new TextEncoder()
  const dataString = JSON.stringify(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Simulate blockchain transaction
export async function createBlockchainRecord(data: any): Promise<{
  txHash: string
  timestamp: string
}> {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const txHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return { txHash, timestamp: new Date().toISOString() }
}

// =====================================================
// SLA TRACKING
// =====================================================

// Calculate SLA status with proper status field
export function calculateSLAStatus(deadline: string): {
  remaining: string
  status: 'on-track' | 'warning' | 'breached'
  isViolated: boolean
  percentage: number
  hoursLeft: number
} {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()

  if (diff <= 0) {
    const overHours = Math.abs(Math.floor(diff / (1000 * 60 * 60)))
    return {
      remaining: `Overdue by ${overHours}h`,
      status: 'breached',
      isViolated: true,
      percentage: 0,
      hoursLeft: -overHours
    }
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  // Warning if less than 25% time remaining (rough estimate based on 72h max)
  const totalMs = 72 * 60 * 60 * 1000
  const pct = Math.min(100, (diff / totalMs) * 100)
  let status: 'on-track' | 'warning' | 'breached' = 'on-track'
  if (hours < 6) status = 'warning'
  if (hours < 2) status = 'warning'

  return {
    remaining: hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`,
    status,
    isViolated: false,
    percentage: pct,
    hoursLeft: hours
  }
}

// Department-based SLA hours
export function getDepartmentSLA(department: string): number {
  const slaMap: { [key: string]: number } = {
    'Electricity': 24,
    'Water': 24,
    'Road': 72,
    'Sanitation': 48,
    'Police': 12,
    'Health': 12,
    'Municipality': 72,
    'Others': 72
  }
  return slaMap[department] || 72
}

// =====================================================
// STYLING HELPERS
// =====================================================

// Get priority color
export function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-300'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'low': return 'bg-green-100 text-green-800 border-green-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'resolved': return 'bg-green-100 text-green-800 border-green-300'
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300'
    case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-300'
    case 'escalated': return 'bg-red-100 text-red-800 border-red-300'
    case 'registered': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

// =====================================================
// FREE TRANSLATION — MyMemory API (no API key needed)
// Supports: Tamil (ta), Hindi (hi), Malayalam (ml),
//           Telugu (te), Kannada (kn), Bengali (bn), etc.
// Limit: ~5000 chars/day (free tier, anonymous)
// =====================================================

// Detect language using Unicode script ranges
export function detectLanguage(text: string): string {
  // Tamil: U+0B80–U+0BFF
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'
  // Hindi/Devanagari: U+0900–U+097F
  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  // Malayalam: U+0D00–U+0D7F
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'
  // Telugu: U+0C00–U+0C7F
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'
  // Kannada: U+0C80–U+0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'
  // Bengali: U+0980–U+09FF
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'
  // Gujarati: U+0A80–U+0AFF
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'
  // Default: English
  return 'en'
}

// Translate text using MyMemory API (FREE, no API key)
export async function translateText(
  text: string,
  sourceLang?: string,
  targetLang: string = 'en'
): Promise<{ translatedText: string; detectedLang: string }> {
  const detected = sourceLang || detectLanguage(text)

  // Already English or empty
  if (detected === 'en' || !text.trim()) {
    return { translatedText: text, detectedLang: 'en' }
  }

  try {
    const langPair = `${detected}|${targetLang}`
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return {
        translatedText: data.responseData.translatedText,
        detectedLang: detected
      }
    }

    // Fallback: return original
    return { translatedText: text, detectedLang: detected }
  } catch (error) {
    console.error('Translation error:', error)
    return { translatedText: text, detectedLang: detected }
  }
}

// Language name mapping for display
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English', ta: 'Tamil', hi: 'Hindi', ml: 'Malayalam',
    te: 'Telugu', kn: 'Kannada', bn: 'Bengali', gu: 'Gujarati',
  }
  return names[code] || code.toUpperCase()
}

// =====================================================
// AI PRIORITY SCORING — Enhanced Rule-Based Engine
// No external API or dataset needed. Uses:
//   1. Keyword urgency analysis (weighted)
//   2. Department criticality factor
//   3. Description length & detail bonus
//   4. Multi-issue detection
//   5. Vulnerability keywords (women, child, elderly)
//   6. Infrastructure risk keywords
// =====================================================

const PRIORITY_KEYWORDS: Record<string, { words: string[]; weight: number }> = {
  life_threat: {
    words: [
      'death', 'dying', 'dead', 'kill', 'murder', 'suicide',
      'life threatening', 'life danger', 'fatal', 'collapse',
      'electrocution', 'drowning', 'snake', 'attack',
    ],
    weight: 30,
  },
  emergency: {
    words: [
      'emergency', 'urgent', 'critical', 'immediate', 'sos',
      'fire', 'flood', 'accident', 'explosion', 'gas leak',
      'short circuit', 'electric shock', 'live wire',
    ],
    weight: 25,
  },
  health_safety: {
    words: [
      'hospital', 'ambulance', 'disease', 'epidemic', 'infection',
      'contaminated', 'sewage overflow', 'drinking water',
      'food poisoning', 'toxic', 'chemical', 'hazardous',
    ],
    weight: 20,
  },
  vulnerability: {
    words: [
      'child', 'children', 'baby', 'infant', 'pregnant', 'woman',
      'elderly', 'old age', 'disabled', 'handicapped', 'senior citizen',
      'school', 'hospital', 'orphanage',
    ],
    weight: 15,
  },
  infrastructure: {
    words: [
      'broken', 'collapsed', 'damaged', 'crack', 'sinkhole',
      'pothole', 'cave in', 'bridge', 'building', 'wall collapse',
      'road block', 'power cut', 'blackout', 'no water',
      'burst pipe', 'main line', 'transformer',
    ],
    weight: 12,
  },
  public_nuisance: {
    words: [
      'garbage', 'stink', 'smell', 'mosquito', 'rats', 'stray dogs',
      'noise', 'pollution', 'illegal', 'encroachment', 'blocked drain',
      'waterlogging', 'overflow', 'clogged',
    ],
    weight: 8,
  },
  service_delay: {
    words: [
      'not working', 'no response', 'pending', 'delayed', 'ignored',
      'weeks', 'months', 'long time', 'repeated complaint',
      'no action', 'follow up',
    ],
    weight: 6,
  },
}

const DEPT_CRITICALITY: Record<string, number> = {
  Police: 15,
  Health: 15,
  Electricity: 12,
  Water: 10,
  Sanitation: 8,
  Road: 8,
  Municipality: 5,
  Others: 3,
}

export function calculatePriorityScore(complaint: {
  description: string
  department: string
}): { score: number; label: string; factors: string[] } {
  let score = 20 // Base score
  const factors: string[] = []
  const desc = complaint.description.toLowerCase()

  // 1. Keyword analysis (find matches per category)
  let maxCategoryHit = 0
  for (const [category, { words, weight }] of Object.entries(PRIORITY_KEYWORDS)) {
    const matches = words.filter(w => desc.includes(w))
    if (matches.length > 0) {
      // First match gets full weight, additional +2 each (diminishing)
      const catScore = weight + Math.min(matches.length - 1, 3) * 2
      score += catScore
      maxCategoryHit = Math.max(maxCategoryHit, catScore)
      const readableCategory = category.replace(/_/g, ' ')
      factors.push(`${readableCategory}: ${matches.slice(0, 3).join(', ')}`)
    }
  }

  // 2. Department criticality
  const deptScore = DEPT_CRITICALITY[complaint.department] || 3
  score += deptScore
  if (deptScore >= 12) factors.push(`High-priority dept: ${complaint.department}`)

  // 3. Description detail bonus (longer = more detail = higher concern)
  const wordCount = desc.split(/\s+/).length
  if (wordCount > 50) { score += 5; factors.push('Detailed description') }
  else if (wordCount > 25) { score += 3 }

  // 4. Multiple exclamation marks or ALL CAPS = urgency
  const capsRatio = (complaint.description.match(/[A-Z]/g)?.length || 0) / Math.max(complaint.description.length, 1)
  if (capsRatio > 0.5 && complaint.description.length > 10) {
    score += 5
    factors.push('Urgency in tone')
  }
  if ((complaint.description.match(/!/g)?.length || 0) >= 3) {
    score += 3
  }

  // 5. Multiple issues mentioned (compound problem)
  const issueIndicators = ['also', 'and also', 'moreover', 'additionally', 'in addition', 'another issue', 'plus']
  const issueCount = issueIndicators.filter(i => desc.includes(i)).length
  if (issueCount >= 2) { score += 5; factors.push('Multiple issues reported') }

  // Cap at 100
  score = Math.min(100, Math.max(0, score))

  // Determine label
  let label = 'Low'
  if (score >= 80) label = 'Critical'
  else if (score >= 60) label = 'High'
  else if (score >= 40) label = 'Medium'

  return { score, label, factors }
}

// =====================================================
// DATE/TIME HELPERS
// =====================================================

// Format date/time
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Format date only
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

// Time ago helper
export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return formatDate(dateString)
}
