'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  calculatePriorityScore, getDepartmentSLA, hashComplaint,
  createBlockchainRecord, getPriorityColor, translateText,
  detectLanguage, getLanguageName
} from '@/lib/utils'
import {
  FileText, Upload, MapPin, Send, CheckCircle, Loader2,
  AlertCircle, X, Info
} from 'lucide-react'
import dynamic from 'next/dynamic'

const MapPickerComponent = dynamic(() => import('@/components/MapPicker'), { ssr: false })

type AvailableDept = {
  department: string
  admin_count: number
}

export default function SubmitGrievancePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form')
  const [processingSteps, setProcessingSteps] = useState<string[]>([])
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  const [departments, setDepartments] = useState<AvailableDept[]>([])
  const [deptsLoading, setDeptsLoading] = useState(true)

  const [formData, setFormData] = useState({
    department: '',
    title: '',
    description: '',
    latitude: '',
    longitude: '',
    locationAddress: ''
  })
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidencePreview, setEvidencePreview] = useState<string>('')

  // Fetch available departments from DB (only depts with registered admins)
  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setDeptsLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_available_departments')
      if (!error && data) {
        setDepartments(data)
      } else {
        // Fallback: query admins table directly
        const { data: admins } = await supabase
          .from('admins')
          .select('department')
        if (admins) {
          const deptMap = new Map<string, number>()
          admins.forEach(a => {
            deptMap.set(a.department, (deptMap.get(a.department) || 0) + 1)
          })
          setDepartments(Array.from(deptMap, ([department, admin_count]) => ({ department, admin_count })))
        }
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    } finally {
      setDeptsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setEvidenceFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => setEvidencePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  // Location is now handled by MapPicker component

  const addProcessingStep = (step: string) => {
    setProcessingSteps(prev => [...prev, step])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.department) { setError('Please select a department'); return }
    if (!formData.title.trim()) { setError('Please enter a complaint title'); return }
    if (!formData.description.trim()) { setError('Please enter a complaint description'); return }
    if (!formData.latitude || !formData.longitude) { setError('Please select complaint location on the map'); return }

    setLoading(true)
    setStep('processing')
    setProcessingSteps([])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Please login again'); setStep('form'); setLoading(false); return }

      // Step 1: Generate complaint ID
      addProcessingStep('Generating Complaint ID...')
      await new Promise(r => setTimeout(r, 500))
      const complaintId = formData.department.substring(0, 3).toUpperCase() +
        new Date().getFullYear().toString().slice(-2) +
        Date.now().toString().slice(-6)

      // Step 2: Translate complaint using MyMemory API (FREE)
      const detectedLang = detectLanguage(formData.description)
      const langName = getLanguageName(detectedLang)
      addProcessingStep(`Detected language: ${langName}`)
      await new Promise(r => setTimeout(r, 300))

      let descriptionEnglish = formData.description
      let originalLanguage = detectedLang
      if (detectedLang !== 'en') {
        addProcessingStep(`Translating from ${langName} to English...`)
        const translation = await translateText(formData.description, detectedLang, 'en')
        descriptionEnglish = translation.translatedText
        originalLanguage = translation.detectedLang
        addProcessingStep('✓ Translation complete')
      } else {
        addProcessingStep('Language: English (no translation needed)')
      }

      // Step 3: Calculate AI priority (use English text for best scoring)
      addProcessingStep('Computing AI priority score...')
      await new Promise(r => setTimeout(r, 400))
      const priority = calculatePriorityScore({
        description: descriptionEnglish,
        department: formData.department
      })
      if (priority.factors.length > 0) {
        addProcessingStep(`Priority factors: ${priority.factors.join(', ')}`)
      }
      addProcessingStep(`AI Score: ${priority.score}/100 → ${priority.label}`)

      // Step 4: Calculate SLA
      addProcessingStep('Setting SLA timer...')
      await new Promise(r => setTimeout(r, 400))
      const slaHours = getDepartmentSLA(formData.department)
      const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString()

      // Step 5: Create integrity record
      addProcessingStep('Generating integrity hash...')
      const complaintHash = await hashComplaint({
        complaintId,
        title: formData.title,
        description: formData.description,
        department: formData.department,
        timestamp: new Date().toISOString()
      })
      const blockchainResult = await createBlockchainRecord({
        complaintId, complaintHash
      })

      // Step 6: Auto-assign to department admin
      addProcessingStep('Assigning to department admin...')
      let assignedAdminId: string | null = null
      try {
        const { data: adminId } = await supabase.rpc('get_department_admin', { dept: formData.department })
        if (adminId) {
          assignedAdminId = adminId
          addProcessingStep('✓ Assigned to department admin')
        } else {
          addProcessingStep('⚠ No admin available — will be manually assigned')
        }
      } catch {
        addProcessingStep('⚠ Auto-assign skipped — will be manually assigned')
      }

      // Step 7: Upload evidence
      let evidenceUrl = null
      if (evidenceFile) {
        addProcessingStep('Uploading evidence...')
        const fileExt = evidenceFile.name.split('.').pop()
        const fileName = `${user.id}/${complaintId}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(fileName, evidenceFile)
        if (uploadError) {
          addProcessingStep(`⚠ Evidence upload failed: ${uploadError.message}. Continuing without evidence.`)
        } else if (uploadData) {
          const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(fileName)
          evidenceUrl = urlData.publicUrl
          addProcessingStep('✅ Evidence uploaded successfully')
        }
      }

      // Step 8: Save to database
      addProcessingStep('Saving complaint to database...')
      const { data: grievance, error: dbError } = await supabase
        .from('grievances')
        .insert({
          complaint_id: complaintId,
          citizen_id: user.id,
          department: formData.department,
          title: formData.title,
          description: formData.description,
          description_english: descriptionEnglish,
          original_language: originalLanguage,
          evidence_url: evidenceUrl,
          evidence_type: evidenceFile?.type?.startsWith('image') ? 'image' : evidenceFile?.type?.startsWith('video') ? 'video' : null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          location_address: formData.locationAddress || null,
          detected_address: formData.locationAddress || null,
          priority_score: priority.score,
          priority_label: priority.label,
          status: assignedAdminId ? 'Assigned' : 'Registered',
          sla_hours: slaHours,
          sla_deadline: slaDeadline,
          complaint_hash: complaintHash,
          blockchain_tx_hash: blockchainResult.txHash,
          blockchain_timestamp: blockchainResult.timestamp,
          is_escalated: priority.label === 'Critical',
          assigned_admin_id: assignedAdminId,
          assigned_at: assignedAdminId ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (dbError) {
        setError('Failed to save complaint: ' + dbError.message)
        setStep('form')
        setLoading(false)
        return
      }

      // Step 9: Create initial timeline entry
      addProcessingStep('Creating complaint timeline...')
      const initialStatus = assignedAdminId ? 'Assigned' : 'Registered'
      await supabase.from('grievance_timeline').insert({
        grievance_id: grievance.id,
        status: initialStatus,
        message: assignedAdminId
          ? `Complaint registered and assigned to ${formData.department} department admin`
          : 'Complaint registered successfully',
        updated_by: user.id,
        updated_by_role: 'citizen'
      })

      addProcessingStep('✅ Complaint submitted successfully!')

      setSubmissionResult({
        complaintId,
        status: 'Registered',
        priorityScore: priority.score,
        priorityLabel: priority.label,
        priorityFactors: priority.factors,
        detectedLanguage: langName,
        slaHours,
        slaDeadline,
        blockchainTxHash: blockchainResult.txHash,
        complaintHash,
        grievanceId: grievance.id
      })

      setStep('success')
    } catch (err) {
      setError('An error occurred. Please try again.')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  // ===================== Processing View =====================
  if (step === 'processing') {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Processing Your Complaint</h2>
            <p className="text-gray-500 mt-1">Please wait while we process your grievance...</p>
          </div>
          <div className="space-y-3">
            {processingSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ===================== Success View =====================
  if (step === 'success' && submissionResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Complaint Submitted Successfully!</h2>
            <p className="text-gray-500 mt-2">Your grievance has been registered and assigned a complaint ID.</p>
          </div>

          {/* Complaint Summary */}
          <div className="space-y-4 bg-gray-50 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Complaint ID</p>
                <p className="text-lg font-bold font-mono text-blue-600">{submissionResult.complaintId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className="inline-block bg-yellow-100 text-yellow-800 border border-yellow-300 text-sm px-3 py-1 rounded-full font-medium">
                  {submissionResult.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Priority Score</p>
                <p className="text-lg font-bold text-gray-900">{submissionResult.priorityScore}/100</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Priority Level</p>
                <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium border ${getPriorityColor(submissionResult.priorityLabel)}`}>
                  {submissionResult.priorityLabel}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Detected Language</p>
                <p className="text-sm font-medium text-gray-900">🌐 {submissionResult.detectedLanguage}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">SLA Deadline</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(submissionResult.slaDeadline).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">SLA Duration</p>
                <p className="text-sm font-medium text-gray-900">{submissionResult.slaHours} hours</p>
              </div>
            </div>

            {/* AI Priority Factors */}
            {submissionResult.priorityFactors && submissionResult.priorityFactors.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">🤖 AI Priority Factors</h3>
                <div className="flex flex-wrap gap-2">
                  {submissionResult.priorityFactors.map((factor: string, i: number) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Integrity Record */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🔗 Integrity Verification</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Complaint Hash</p>
                  <p className="text-xs font-mono text-gray-700 break-all">{submissionResult.complaintHash}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Verification ID</p>
                  <p className="text-xs font-mono text-blue-600 break-all">{submissionResult.blockchainTxHash}</p>
                </div>
              </div>
            </div>

            {submissionResult.priorityLabel === 'Critical' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Critical complaints are auto-escalated to higher officers.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.push(`/dashboard/citizen/track/${submissionResult.grievanceId}`)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all"
            >
              Track This Complaint
            </button>
            <button
              onClick={() => { setStep('form'); setFormData({ department: '', title: '', description: '', latitude: '', longitude: '', locationAddress: '' }); setEvidenceFile(null); setEvidencePreview(''); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-all"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===================== Form View =====================
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Grievance</h1>
        <p className="text-gray-500 mt-1">File a complaint to the concerned department</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department <span className="text-red-500">*</span>
          </label>
          {deptsLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading departments...
            </div>
          ) : departments.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-orange-200 rounded-lg bg-orange-50 text-orange-700 text-sm">
              <Info className="w-4 h-4" /> No department admins registered yet. Please try later.
            </div>
          ) : (
            <>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.department} value={dept.department}>
                    {dept.department} ({dept.admin_count} admin{dept.admin_count > 1 ? 's' : ''})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Only departments with registered admins are shown
              </p>
            </>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complaint Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Brief title of your complaint"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            maxLength={200}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complaint Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your complaint in detail... (You can write in any language including Tamil, Hindi, Malayalam, English)"
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Supports: English, Tamil, Hindi, Malayalam, Tanglish</p>
        </div>

        {/* Evidence Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidence Upload <span className="text-gray-400">(optional)</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            {evidencePreview ? (
              <div className="relative">
                {evidenceFile?.type?.startsWith('image') ? (
                  <img src={evidencePreview} alt="Evidence" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-700">{evidenceFile?.name}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setEvidenceFile(null); setEvidencePreview(''); }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()} className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload image or video</p>
                <p className="text-xs text-gray-400 mt-1">Max file size: 10MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* GIS Location Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Complaint Location <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Click on the map to select location, use GPS auto-detect, or search for an address
          </p>
          <MapPickerComponent
            latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
            longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
            onLocationSelect={(data) => {
              setFormData({
                ...formData,
                latitude: data.latitude.toString(),
                longitude: data.longitude.toString(),
                locationAddress: data.address,
              })
            }}
            height="350px"
          />
          {formData.latitude && formData.longitude && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-emerald-600 font-medium">
                ✅ Location set: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {loading ? 'Submitting...' : 'Submit Grievance'}
        </button>
      </form>
    </div>
  )
}
