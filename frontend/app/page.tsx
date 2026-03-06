'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Scale, Menu, X, ArrowRight, FileText, Users, Award, 
  Phone, MessageSquare, AlertCircle, Shield, Briefcase,
  Heart, AlertTriangle, Lock, BarChart3, Zap, Eye, CheckCircle,
  Upload, Trash2, Brain, Copy, Languages
} from 'lucide-react'
import Link from 'next/link'
import SOSAlertPanel from '@/components/SOSAlertPanel'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const COMPLAINT_MIN_FEE = 100
const CHATBOT_API_BASE_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || `${API_BASE_URL}/v1/chatbot`

type ChartSummary = {
  solved: number
  unsolved: number
  registered: number
}

// Animated Pie Chart Component
interface PieChartProps {
  solved: number
  unsolved: number
  registered: number
  label: string
  uiLabels?: {
    cases: string
    solved: string
    unsolved: string
    registered: string
  }
}

const AnimatedPieChart = ({ solved, unsolved, registered, label, uiLabels }: PieChartProps) => {
  const [animatedSolved, setAnimatedSolved] = useState(0)
  const [animatedUnsolved, setAnimatedUnsolved] = useState(0)
  const [animatedRegistered, setAnimatedRegistered] = useState(0)

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimatedSolved(solved), 100)
    const timer2 = setTimeout(() => setAnimatedUnsolved(unsolved), 200)
    const timer3 = setTimeout(() => setAnimatedRegistered(registered), 300)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [solved, unsolved, registered])

  const total = solved + unsolved + registered
  const solvedPercent = total > 0 ? (solved / total) * 100 : 0
  const unsolvedPercent = total > 0 ? (unsolved / total) * 100 : 0
  const registeredPercent = total > 0 ? (registered / total) * 100 : 0

  const getCirclePath = (percentage: number, offset: number) => {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (circumference * percentage) / 100
    return { circumference, strokeDashoffset }
  }

  const solvedPath = getCirclePath(solvedPercent, 0)
  const unsolvedPath = getCirclePath(unsolvedPercent, solvedPercent)
  const registeredPath = getCirclePath(registeredPercent, solvedPercent + unsolvedPercent)

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition">
      <div className="relative w-32 h-32 mb-4">
        <svg className="transform -rotate-90 w-32 h-32" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          
          {/* Solved (Green/Blue) */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1e40af"
            strokeWidth="8"
            strokeDasharray={solvedPath.circumference}
            strokeDashoffset={solvedPath.circumference}
            style={{
              animation: 'dash 2s ease-in-out forwards',
              '--dash-offset': `${solvedPath.strokeDashoffset}px`,
            } as React.CSSProperties & { '--dash-offset': string }}
            strokeLinecap="round"
          />

          {/* Unsolved (Gray) */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="8"
            strokeDasharray={unsolvedPath.circumference}
            strokeDashoffset={unsolvedPath.circumference}
            style={{
              animation: 'dash 2s ease-in-out 0.2s forwards',
              '--dash-offset': `${unsolvedPath.strokeDashoffset}px`,
              transformOrigin: '50px 50px',
              transform: `rotate(${solvedPercent * 3.6}deg)`,
            } as React.CSSProperties & { '--dash-offset': string }}
            strokeLinecap="round"
          />

          {/* Registered (Light Blue) */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="8"
            strokeDasharray={registeredPath.circumference}
            strokeDashoffset={registeredPath.circumference}
            style={{
              animation: 'dash 2s ease-in-out 0.4s forwards',
              '--dash-offset': `${registeredPath.strokeDashoffset}px`,
              transformOrigin: '50px 50px',
              transform: `rotate(${(solvedPercent + unsolvedPercent) * 3.6}deg)`,
            } as React.CSSProperties & { '--dash-offset': string }}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-xs text-gray-500">{uiLabels?.cases || 'Cases'}</div>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-3">{label}</h3>
      
      <div className="space-y-2 w-full">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span className="text-sm text-gray-700">{uiLabels?.solved || 'Solved'}: {animatedSolved}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-sm text-gray-700">{uiLabels?.unsolved || 'Unsolved'}: {animatedUnsolved}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span className="text-sm text-gray-700">{uiLabels?.registered || 'Registered'}: {animatedRegistered}</span>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  type UILanguage =
    | 'english'
    | 'hindi'
    | 'marathi'
    | 'tamil'
    | 'telugu'
    | 'bengali'
    | 'gujarati'
    | 'kannada'
    | 'malayalam'
    | 'punjabi'
    | 'urdu'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [expandedLegalIndex, setExpandedLegalIndex] = useState<number | null>(null)
  const [uiLanguage, setUiLanguage] = useState<UILanguage>('english')
  const [caseSummaryStats, setCaseSummaryStats] = useState<{
    harassment: ChartSummary
    cyber: ChartSummary
    overall: ChartSummary
  }>({
    harassment: { solved: 0, unsolved: 0, registered: 0 },
    cyber: { solved: 0, unsolved: 0, registered: 0 },
    overall: { solved: 0, unsolved: 0, registered: 0 },
  })
  const [isFileComplaintOpen, setIsFileComplaintOpen] = useState(false)
  const [isAIAnalysisOpen, setIsAIAnalysisOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    evidence: '',
    location: '',
    incidentDate: '',
    incidentTime: '',
    accusedName: '',
    witnessDetails: '',
    urgencyLevel: 'medium',
    preferredLanguage: 'english',
    pincode: '',
    isProtectedCase: false,
  })
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [proofAnalysisMessage, setProofAnalysisMessage] = useState('')
  const [proofAnalysisSeverity, setProofAnalysisSeverity] = useState<'success' | 'warning' | 'error' | ''>('')
  const [isAnalyzingProof, setIsAnalyzingProof] = useState(false)
  const [rejectedProofCount, setRejectedProofCount] = useState(0)
  const [aiAnalysisInput, setAiAnalysisInput] = useState('')
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chatbotMode, setChatbotMode] = useState<'legal' | 'chat'>('legal')
  const [chatbotMessages, setChatbotMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false)
  const [submittedTrackingId, setSubmittedTrackingId] = useState('')
  const [submittedCaseStrength, setSubmittedCaseStrength] = useState<number | null>(null)
  const [submittedSummary, setSubmittedSummary] = useState('')
  const [submittedCaseAnalysis, setSubmittedCaseAnalysis] = useState<any>(null)
  const [submittedEscalationDraft, setSubmittedEscalationDraft] = useState('')
  const [submittedProtectedId, setSubmittedProtectedId] = useState('')
  const [submittedNearestPoliceStation, setSubmittedNearestPoliceStation] = useState('')
  const [nearestPoliceStation, setNearestPoliceStation] = useState('')
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('')
  const [trackingIdInput, setTrackingIdInput] = useState('')
  const [trackingResult, setTrackingResult] = useState<any>(null)
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)
  const [trackingLastRefreshedAt, setTrackingLastRefreshedAt] = useState<string>('')
  const [secureMessages, setSecureMessages] = useState<Array<{ id: string; senderLabel: string; message: string; createdAt: string }>>([])
  const [secureMessageInput, setSecureMessageInput] = useState('')
  const [isSecureMessageLoading, setIsSecureMessageLoading] = useState(false)
  const [isSecureSendLoading, setIsSecureSendLoading] = useState(false)
  const [secureChatSetupMessage, setSecureChatSetupMessage] = useState('')
  const [complaintPaymentIntent, setComplaintPaymentIntent] = useState<{
    reference: string
    amount: number
    upiId: string
    upiLink: string
    qrCodeUrl: string
  } | null>(null)
  const [complaintPaymentUtr, setComplaintPaymentUtr] = useState('')
  const [isCreatingFeeIntent, setIsCreatingFeeIntent] = useState(false)
  const [isConfirmingFeePayment, setIsConfirmingFeePayment] = useState(false)
  const [isComplaintFeePaid, setIsComplaintFeePaid] = useState(false)
  const [adCampaigns, setAdCampaigns] = useState<
    Array<{ id: string; sponsor: string; title: string; description: string; ctaLabel: string; ctaUrl: string; imageUrl?: string }>
  >([])
  const [advertiseForm, setAdvertiseForm] = useState({
    name: '',
    email: '',
    organization: '',
    budget: '',
    message: '',
  })
  const [isAdSubmitting, setIsAdSubmitting] = useState(false)
  const [adSubmitMessage, setAdSubmitMessage] = useState('')
  const secureChatBoxRef = useRef<HTMLDivElement | null>(null)
  const secureMessageInputRef = useRef<HTMLInputElement | null>(null)

  const i18n = {
    english: {
      analyzingProof: 'Analyzing uploaded image proof...',
      uploadProper: 'Upload proper document/proof image.',
      uploadProperBeforeSubmit: 'Upload proper document/proof image before submitting complaint',
      uploadValidOnly: 'Upload valid image proof only. Remove invalid images and try again.',
      invalidProofBlock: 'Upload valid image proof only. Complaint cannot be submitted with invalid images.',
      aiProofValidAdded: (count: number) => `AI proof check: ${count} valid proof image(s) added.`,
      aiProofPartial: (count: number, reason: string) =>
        `AI proof check: ${count} valid evidence image(s) added. Upload proper document/proof image. ${reason}`,
      aiProofFailed: (reason: string) => `Upload proper document/proof image. ${reason}`,
      reasonNotImage: (name: string) => `${name}: file is not an image`,
      reasonTooSmall: (name: string) => `${name}: image size is too small`,
      reasonLowRes: (name: string) => `${name}: resolution is too low`,
      reasonBlurry: (name: string) => `${name}: image appears unclear or blurry`,
      reasonAnalyzeFailed: (name: string) => `${name}: unable to analyze image`,
      reasonAiFailed: 'AI proof check failed for selected files.',
      selectCategory: 'Please select a category',
      complaintFiledTracking: (id: string) => `Complaint filed. Your tracking ID is: ${id}`,
      complaintSubmitFailed: 'Complaint submission failed',
    },
    hindi: {
      analyzingProof: 'अपलोड की गई इमेज का विश्लेषण किया जा रहा है...',
      uploadProper: 'कृपया सही दस्तावेज/प्रूफ इमेज अपलोड करें।',
      uploadProperBeforeSubmit: 'शिकायत सबमिट करने से पहले सही दस्तावेज/प्रूफ इमेज अपलोड करें',
      uploadValidOnly: 'केवल मान्य प्रूफ इमेज अपलोड करें। अमान्य इमेज हटाकर फिर प्रयास करें।',
      invalidProofBlock: 'अमान्य इमेज होने पर शिकायत सबमिट नहीं होगी।',
      aiProofValidAdded: (count: number) => `AI जांच: ${count} मान्य प्रूफ इमेज जोड़ी गईं।`,
      aiProofPartial: (count: number, reason: string) =>
        `AI जांच: ${count} मान्य इमेज जोड़ी गईं। कृपया सही प्रूफ इमेज अपलोड करें। ${reason}`,
      aiProofFailed: (reason: string) => `कृपया सही दस्तावेज/प्रूफ इमेज अपलोड करें। ${reason}`,
      reasonNotImage: (name: string) => `${name}: यह इमेज फाइल नहीं है`,
      reasonTooSmall: (name: string) => `${name}: इमेज साइज बहुत छोटा है`,
      reasonLowRes: (name: string) => `${name}: इमेज रेज़ोल्यूशन बहुत कम है`,
      reasonBlurry: (name: string) => `${name}: इमेज धुंधली/अस्पष्ट है`,
      reasonAnalyzeFailed: (name: string) => `${name}: इमेज का विश्लेषण नहीं हो सका`,
      reasonAiFailed: 'चयनित फाइलों पर AI जांच असफल रही।',
      selectCategory: 'कृपया श्रेणी चुनें',
      complaintFiledTracking: (id: string) => `शिकायत दर्ज हो गई। आपका ट्रैकिंग आईडी: ${id}`,
      complaintSubmitFailed: 'शिकायत सबमिट नहीं हो सकी',
    },
    marathi: {
      analyzingProof: 'अपलोड केलेल्या प्रतिमेचे विश्लेषण सुरू आहे...',
      uploadProper: 'कृपया योग्य दस्तऐवज/पुरावा प्रतिमा अपलोड करा.',
      uploadProperBeforeSubmit: 'तक्रार सबमिट करण्यापूर्वी योग्य दस्तऐवज/पुरावा प्रतिमा अपलोड करा',
      uploadValidOnly: 'फक्त वैध पुरावा प्रतिमा अपलोड करा. अवैध प्रतिमा काढून पुन्हा प्रयत्न करा.',
      invalidProofBlock: 'अवैध प्रतिमा असल्यास तक्रार सबमिट होणार नाही.',
      aiProofValidAdded: (count: number) => `AI तपासणी: ${count} वैध पुरावा प्रतिमा जोडल्या.`,
      aiProofPartial: (count: number, reason: string) =>
        `AI तपासणी: ${count} वैध प्रतिमा जोडल्या. कृपया योग्य पुरावा प्रतिमा अपलोड करा. ${reason}`,
      aiProofFailed: (reason: string) => `कृपया योग्य दस्तऐवज/पुरावा प्रतिमा अपलोड करा. ${reason}`,
      reasonNotImage: (name: string) => `${name}: ही प्रतिमा फाइल नाही`,
      reasonTooSmall: (name: string) => `${name}: प्रतिमेचा आकार खूप लहान आहे`,
      reasonLowRes: (name: string) => `${name}: प्रतिमेचे रिझोल्यूशन कमी आहे`,
      reasonBlurry: (name: string) => `${name}: प्रतिमा अस्पष्ट आहे`,
      reasonAnalyzeFailed: (name: string) => `${name}: प्रतिमेचे विश्लेषण करता आले नाही`,
      reasonAiFailed: 'निवडलेल्या फाइल्सवर AI तपासणी अयशस्वी झाली.',
      selectCategory: 'कृपया प्रकार निवडा',
      complaintFiledTracking: (id: string) => `तक्रार नोंदवली गेली. तुमचा ट्रॅकिंग आयडी: ${id}`,
      complaintSubmitFailed: 'तक्रार सबमिट करण्यात अयशस्वी',
    },
    tamil: {
      analyzingProof: 'பதிவேற்றப்பட்ட பட சான்று பகுப்பாய்வு செய்யப்படுகிறது...',
      uploadProper: 'சரியான ஆவணம்/சான்று படத்தை பதிவேற்றவும்.',
      uploadProperBeforeSubmit: 'புகார் சமர்ப்பிக்கும் முன் சரியான ஆவணம்/சான்று படத்தை பதிவேற்றவும்',
      uploadValidOnly: 'சரியான சான்று படங்களை மட்டும் பதிவேற்றவும். தவறான படங்களை நீக்கி மீண்டும் முயற்சிக்கவும்.',
      invalidProofBlock: 'தவறான படங்கள் இருந்தால் புகார் சமர்ப்பிக்க முடியாது.',
      aiProofValidAdded: (count: number) => `AI சரிபார்ப்பு: ${count} சரியான சான்று படம் சேர்க்கப்பட்டது.`,
      aiProofPartial: (count: number, reason: string) =>
        `AI சரிபார்ப்பு: ${count} சரியான படம் சேர்க்கப்பட்டது. சரியான சான்று படத்தை பதிவேற்றவும். ${reason}`,
      aiProofFailed: (reason: string) => `சரியான ஆவணம்/சான்று படத்தை பதிவேற்றவும். ${reason}`,
      reasonNotImage: (name: string) => `${name}: இது படம் அல்ல`,
      reasonTooSmall: (name: string) => `${name}: படத்தின் அளவு மிகவும் சிறியது`,
      reasonLowRes: (name: string) => `${name}: படத் தீர்மை குறைவாக உள்ளது`,
      reasonBlurry: (name: string) => `${name}: படம் தெளிவாக இல்லை`,
      reasonAnalyzeFailed: (name: string) => `${name}: படத்தை பகுப்பாய்வு செய்ய முடியவில்லை`,
      reasonAiFailed: 'தேர்ந்தெடுத்த கோப்புகளுக்கு AI சரிபார்ப்பு தோல்வியடைந்தது.',
      selectCategory: 'தயவுசெய்து வகையை தேர்வு செய்யவும்',
      complaintFiledTracking: (id: string) => `புகார் பதிவு செய்யப்பட்டது. உங்கள் டிராக்கிங் ஐடி: ${id}`,
      complaintSubmitFailed: 'புகார் சமர்ப்பிப்பு தோல்வி',
    },
    telugu: {
      analyzingProof: 'అప్లోడ్ చేసిన చిత్రం ఆధారాన్ని విశ్లేషిస్తోంది...',
      uploadProper: 'దయచేసి సరైన డాక్యుమెంట్/ప్రూఫ్ ఇమేజ్ అప్లోడ్ చేయండి.',
      uploadProperBeforeSubmit: 'ఫిర్యాదు సమర్పించే ముందు సరైన డాక్యుమెంట్/ప్రూఫ్ ఇమేజ్ అప్లోడ్ చేయండి',
      uploadValidOnly: 'చెల్లుబాటు అయ్యే ప్రూఫ్ ఇమేజ్ మాత్రమే అప్లోడ్ చేయండి. తప్పు చిత్రాలను తొలగించి మళ్లీ ప్రయత్నించండి.',
      invalidProofBlock: 'తప్పు చిత్రాలు ఉంటే ఫిర్యాదు సమర్పించబడదు.',
      aiProofValidAdded: (count: number) => `AI తనిఖీ: ${count} చెల్లుబాటు అయ్యే ప్రూఫ్ చిత్రం జోడించబడింది.`,
      aiProofPartial: (count: number, reason: string) =>
        `AI తనిఖీ: ${count} చెల్లుబాటు అయ్యే చిత్రం జోడించబడింది. సరైన ప్రూఫ్ ఇమేజ్ అప్లోడ్ చేయండి. ${reason}`,
      aiProofFailed: (reason: string) => `సరైన డాక్యుమెంట్/ప్రూఫ్ ఇమేజ్ అప్లోడ్ చేయండి. ${reason}`,
      reasonNotImage: (name: string) => `${name}: ఇది చిత్రం ఫైల్ కాదు`,
      reasonTooSmall: (name: string) => `${name}: చిత్రం పరిమాణం చాలా చిన్నది`,
      reasonLowRes: (name: string) => `${name}: చిత్రం రిజల్యూషన్ తక్కువగా ఉంది`,
      reasonBlurry: (name: string) => `${name}: చిత్రం స్పష్టంగా లేదు`,
      reasonAnalyzeFailed: (name: string) => `${name}: చిత్రాన్ని విశ్లేషించలేకపోయాం`,
      reasonAiFailed: 'ఎంచుకున్న ఫైళ్లపై AI తనిఖీ విఫలమైంది.',
      selectCategory: 'దయచేసి వర్గాన్ని ఎంచుకోండి',
      complaintFiledTracking: (id: string) => `ఫిర్యాదు నమోదు అయ్యింది. మీ ట్రాకింగ్ ఐడి: ${id}`,
      complaintSubmitFailed: 'ఫిర్యాదు సమర్పణ విఫలమైంది',
    },
  } as const

  const langKey = (formData.preferredLanguage || 'english') as keyof typeof i18n
  const t = i18n[langKey] || i18n.english

  const siteI18n: Partial<Record<UILanguage, Record<string, string>>> = {
    english: {
      home: 'Home',
      fileCase: 'File Case',
      aiAnalysis: 'AI Analysis',
      trackCase: 'Track Case',
      login: 'Login',
      heroTitle: 'AI-Powered Legal Complaint Assistant',
      heroSubtitle: 'File complaints and analyze legal cases instantly with our intelligent platform.',
      fileComplaint: 'File Complaint',
      aiCaseAnalysis: 'AI Case Analysis',
      harassmentCases: 'Harassment Cases',
      cyberCases: 'Cyber Crime Cases',
      overallStats: 'Overall Statistics',
      cases: 'Cases',
      solved: 'Solved',
      unsolved: 'Unsolved',
      registered: 'Registered',
      trackComplaint: 'Track Your Complaint',
      trackSubtitle: 'Enter your tracking ID to view FIR and case progress.',
      trackPlaceholder: 'Example: TRK-2026-ABC123',
      checking: 'Checking...',
      track: 'Track',
      legalAwareness: 'Legal Awareness',
      legalAwareSub: 'Educate yourself on your rights and legal processes',
      govtHelplines: 'Government Helplines',
      govtSub: 'Emergency support and assistance services available 24/7',
      emergencyGuidelines: 'Emergency Guidelines',
      footerTagline: 'Empowering justice through AI and technology.',
      rights: '© 2026 JusticeAI. All rights reserved.',
      language: 'Language',
    },
    hindi: {
      home: 'होम',
      fileCase: 'केस दर्ज करें',
      aiAnalysis: 'एआई विश्लेषण',
      trackCase: 'केस ट्रैक करें',
      login: 'लॉगिन',
      heroTitle: 'एआई-संचालित कानूनी शिकायत सहायक',
      heroSubtitle: 'हमारे प्लेटफ़ॉर्म से तुरंत शिकायत दर्ज करें और कानूनी मामलों का विश्लेषण करें।',
      fileComplaint: 'शिकायत दर्ज करें',
      aiCaseAnalysis: 'एआई केस विश्लेषण',
      harassmentCases: 'उत्पीड़न मामले',
      cyberCases: 'साइबर अपराध मामले',
      overallStats: 'कुल सांख्यिकी',
      cases: 'मामले',
      solved: 'सुलझे',
      unsolved: 'असुलझे',
      registered: 'दर्ज',
      trackComplaint: 'अपनी शिकायत ट्रैक करें',
      trackSubtitle: 'FIR और केस प्रगति देखने के लिए ट्रैकिंग आईडी दर्ज करें।',
      trackPlaceholder: 'उदाहरण: TRK-2026-ABC123',
      checking: 'जांच हो रही है...',
      track: 'ट्रैक करें',
      legalAwareness: 'कानूनी जागरूकता',
      legalAwareSub: 'अपने अधिकारों और कानूनी प्रक्रियाओं के बारे में जानें',
      govtHelplines: 'सरकारी हेल्पलाइन',
      govtSub: '24/7 आपातकालीन सहायता सेवाएं',
      emergencyGuidelines: 'आपातकालीन दिशानिर्देश',
      footerTagline: 'एआई और तकनीक से न्याय को सशक्त बनाना।',
      rights: '© 2024 JusticeAI. सर्वाधिकार सुरक्षित।',
      language: 'भाषा',
    },
    marathi: {
      home: 'मुख्यपृष्ठ',
      fileCase: 'केस नोंदवा',
      aiAnalysis: 'एआय विश्लेषण',
      trackCase: 'केस ट्रॅक करा',
      login: 'लॉगिन',
      heroTitle: 'एआय-आधारित कायदेशीर तक्रार सहाय्यक',
      heroSubtitle: 'आमच्या प्लॅटफॉर्मवर तक्रार नोंदवा आणि केसचे तत्काळ विश्लेषण करा.',
      fileComplaint: 'तक्रार नोंदवा',
      aiCaseAnalysis: 'एआय केस विश्लेषण',
      harassmentCases: 'छळ प्रकरणे',
      cyberCases: 'सायबर गुन्हे प्रकरणे',
      overallStats: 'एकूण आकडेवारी',
      cases: 'प्रकरणे',
      solved: 'निकाली',
      unsolved: 'प्रलंबित',
      registered: 'नोंदवलेली',
      trackComplaint: 'तुमची तक्रार ट्रॅक करा',
      trackSubtitle: 'FIR आणि केस प्रगती पाहण्यासाठी ट्रॅकिंग आयडी टाका.',
      trackPlaceholder: 'उदाहरण: TRK-2026-ABC123',
      checking: 'तपासणी सुरू आहे...',
      track: 'ट्रॅक करा',
      legalAwareness: 'कायदेशीर जागरूकता',
      legalAwareSub: 'तुमचे हक्क आणि कायदेशीर प्रक्रिया जाणून घ्या',
      govtHelplines: 'शासकीय हेल्पलाईन',
      govtSub: '24/7 आपत्कालीन सहाय्य सेवा',
      emergencyGuidelines: 'आपत्कालीन मार्गदर्शक सूचना',
      footerTagline: 'एआय आणि तंत्रज्ञानातून न्याय सक्षम करणे.',
      rights: '© 2024 JusticeAI. सर्व हक्क राखीव.',
      language: 'भाषा',
    },
    tamil: {
      home: 'முகப்பு',
      fileCase: 'வழக்கு பதிவு',
      aiAnalysis: 'ஏஐ பகுப்பாய்வு',
      trackCase: 'வழக்கு கண்காணிப்பு',
      login: 'உள்நுழை',
      heroTitle: 'ஏஐ சட்ட புகார் உதவியாளர்',
      heroSubtitle: 'எங்கள் தளத்தில் உடனே புகார் பதிவு செய்து சட்ட வழக்குகளை பகுப்பாய்வு செய்யுங்கள்.',
      fileComplaint: 'புகார் பதிவு',
      aiCaseAnalysis: 'ஏஐ வழக்கு பகுப்பாய்வு',
      harassmentCases: 'துன்புறுத்தல் வழக்குகள்',
      cyberCases: 'சைபர் குற்ற வழக்குகள்',
      overallStats: 'மொத்த புள்ளிவிவரம்',
      cases: 'வழக்குகள்',
      solved: 'தீர்ந்தவை',
      unsolved: 'தீராதவை',
      registered: 'பதியப்பட்டவை',
      trackComplaint: 'உங்கள் புகாரை கண்காணிக்கவும்',
      trackSubtitle: 'FIR மற்றும் வழக்கு முன்னேற்றத்தை பார்க்க ட்ராக்கிங் ஐடி உள்ளிடவும்.',
      trackPlaceholder: 'உதாரணம்: TRK-2026-ABC123',
      checking: 'சரிபார்க்கப்படுகிறது...',
      track: 'கண்காணிக்க',
      legalAwareness: 'சட்ட விழிப்புணர்வு',
      legalAwareSub: 'உங்கள் உரிமைகள் மற்றும் சட்ட நடைமுறைகளை அறிக',
      govtHelplines: 'அரசு உதவி எண்கள்',
      govtSub: '24/7 அவசர உதவி சேவைகள்',
      emergencyGuidelines: 'அவசர வழிகாட்டி',
      footerTagline: 'ஏஐ மற்றும் தொழில்நுட்பத்தின் மூலம் நீதியை வலுப்படுத்துதல்.',
      rights: '© 2024 JusticeAI. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
      language: 'மொழி',
    },
    telugu: {
      home: 'హోమ్',
      fileCase: 'కేసు నమోదు',
      aiAnalysis: 'AI విశ్లేషణ',
      trackCase: 'కేసు ట్రాక్',
      login: 'లాగిన్',
      heroTitle: 'AI ఆధారిత చట్టపరమైన ఫిర్యాదు సహాయకుడు',
      heroSubtitle: 'మా ప్లాట్‌ఫారమ్‌లో వెంటనే ఫిర్యాదు నమోదు చేసి చట్టపరమైన కేసులను విశ్లేషించండి.',
      fileComplaint: 'ఫిర్యాదు నమోదు',
      aiCaseAnalysis: 'AI కేసు విశ్లేషణ',
      harassmentCases: 'హరాస్‌మెంట్ కేసులు',
      cyberCases: 'సైబర్ క్రైమ్ కేసులు',
      overallStats: 'మొత్తం గణాంకాలు',
      cases: 'కేసులు',
      solved: 'పరిష్కరించినవి',
      unsolved: 'పరిష్కారం కానివి',
      registered: 'నమోదైనవి',
      trackComplaint: 'మీ ఫిర్యాదును ట్రాక్ చేయండి',
      trackSubtitle: 'FIR మరియు కేసు పురోగతిని చూడటానికి ట్రాకింగ్ ఐడిని నమోదు చేయండి.',
      trackPlaceholder: 'ఉదాహరణ: TRK-2026-ABC123',
      checking: 'పరిశీలిస్తోంది...',
      track: 'ట్రాక్',
      legalAwareness: 'చట్ట అవగాహన',
      legalAwareSub: 'మీ హక్కులు మరియు చట్టపరమైన ప్రక్రియలను తెలుసుకోండి',
      govtHelplines: 'ప్రభుత్వ హెల్ప్‌లైన్‌లు',
      govtSub: '24/7 అత్యవసర సహాయ సేవలు',
      emergencyGuidelines: 'అత్యవసర మార్గదర్శకాలు',
      footerTagline: 'AI మరియు సాంకేతికతతో న్యాయాన్ని బలోపేతం చేయడం.',
      rights: '© 2024 JusticeAI. అన్ని హక్కులు సంరక్షించబడ్డాయి.',
      language: 'భాష',
    },
  }

  const extraLanguageTemplate = {
    home: 'Home',
    fileCase: 'File Case',
    aiAnalysis: 'AI Analysis',
    trackCase: 'Track Case',
    login: 'Login',
    heroTitle: 'AI-Powered Legal Complaint Assistant',
    heroSubtitle: 'File complaints and analyze legal cases instantly with our intelligent platform.',
    fileComplaint: 'File Complaint',
    aiCaseAnalysis: 'AI Case Analysis',
    harassmentCases: 'Harassment Cases',
    cyberCases: 'Cyber Crime Cases',
    overallStats: 'Overall Statistics',
    cases: 'Cases',
    solved: 'Solved',
    unsolved: 'Unsolved',
    registered: 'Registered',
    trackComplaint: 'Track Your Complaint',
    trackSubtitle: 'Enter your tracking ID to view FIR and case progress.',
    trackPlaceholder: 'Example: TRK-2026-ABC123',
    checking: 'Checking...',
    track: 'Track',
    legalAwareness: 'Legal Awareness',
    legalAwareSub: 'Educate yourself on your rights and legal processes',
    govtHelplines: 'Government Helplines',
    govtSub: 'Emergency support and assistance services available 24/7',
    emergencyGuidelines: 'Emergency Guidelines',
    footerTagline: 'Empowering justice through AI and technology.',
    rights: '© 2026 JusticeAI. All rights reserved.',
    language: 'Language',
  }

  const mergedSiteI18n = {
    ...siteI18n,
    bengali: { ...extraLanguageTemplate, home: 'হোম', fileCase: 'কেস দাখিল', aiAnalysis: 'এআই বিশ্লেষণ', trackCase: 'কেস ট্র্যাক', login: 'লগইন', language: 'ভাষা' },
    gujarati: { ...extraLanguageTemplate, home: 'હોમ', fileCase: 'કેસ નોંધો', aiAnalysis: 'AI વિશ્લેષણ', trackCase: 'કેસ ટ્રેક', login: 'લૉગિન', language: 'ભાષા' },
    kannada: { ...extraLanguageTemplate, home: 'ಮುಖ್ಯಪುಟ', fileCase: 'ಕೇಸ್ ದಾಖಲಿಸಿ', aiAnalysis: 'AI ವಿಶ್ಲೇಷಣೆ', trackCase: 'ಕೇಸ್ ಟ್ರ್ಯಾಕ್', login: 'ಲಾಗಿನ್', language: 'ಭಾಷೆ' },
    malayalam: { ...extraLanguageTemplate, home: 'ഹോം', fileCase: 'കേസ് രജിസ്റ്റർ', aiAnalysis: 'AI വിശകലനം', trackCase: 'കേസ് ട്രാക്ക്', login: 'ലോഗിൻ', language: 'ഭാഷ' },
    punjabi: { ...extraLanguageTemplate, home: 'ਹੋਮ', fileCase: 'ਕੇਸ ਦਰਜ ਕਰੋ', aiAnalysis: 'AI ਵਿਸ਼ਲੇਸ਼ਣ', trackCase: 'ਕੇਸ ਟ੍ਰੈਕ', login: 'ਲਾਗਇਨ', language: 'ਭਾਸ਼ਾ' },
    urdu: { ...extraLanguageTemplate, home: 'ہوم', fileCase: 'کیس درج کریں', aiAnalysis: 'AI تجزیہ', trackCase: 'کیس ٹریک', login: 'لاگ اِن', language: 'زبان' },
  } as const

  const s = mergedSiteI18n[uiLanguage] || mergedSiteI18n.english!

  useEffect(() => {
    const stored = localStorage.getItem('justiceai_ui_language') as UILanguage | null
    if (stored && mergedSiteI18n[stored]) {
      setUiLanguage(stored)
      setFormData((prev) => ({ ...prev, preferredLanguage: stored }))
    }
  }, [])

  const changeAppLanguage = (lang: UILanguage) => {
    setUiLanguage(lang)
    setFormData((prev) => ({ ...prev, preferredLanguage: lang }))
    localStorage.setItem('justiceai_ui_language', lang)
    window.dispatchEvent(new CustomEvent('justiceai-language-change', { detail: lang }))
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('openComplaint') === '1') {
      setIsFileComplaintOpen(true)
      params.delete('openComplaint')
      const nextQuery = params.toString()
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`
      window.history.replaceState({}, '', nextUrl)
    }

    if (window.location.hash === '#track-case-section') {
      setTimeout(() => {
        document.getElementById('track-case-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [])

  const caseCategories = [
    { id: 'harassment', label: 'Harassment', icon: AlertTriangle },
    { id: 'cybercrime', label: 'Cyber Crime', icon: Lock },
    { id: 'theft', label: 'Theft', icon: Shield },
    { id: 'domestic', label: 'Domestic Violence', icon: Heart },
    { id: 'corruption', label: 'Corruption', icon: BarChart3 },
    { id: 'fraud', label: 'Fraud', icon: AlertCircle },
    { id: 'assault', label: 'Assault', icon: Zap },
    { id: 'property', label: 'Property Dispute', icon: FileText },
    { id: 'labor', label: 'Labor Rights', icon: Users },
    { id: 'sexual', label: 'Sexual Harassment', icon: Eye },
    { id: 'child', label: 'Child Abuse', icon: AlertTriangle },
    { id: 'environmental', label: 'Environmental', icon: Zap },
  ]

  const legalAwareness = [
    {
      title: 'Know Your Rights',
      description: 'Understand the fundamental rights granted to every citizen under the constitution.',
      details: [
        'Right to equality and equal protection under law.',
        'Right to legal remedy when rights are violated.',
        'Right to privacy, dignity, and fair treatment.',
      ],
    },
    {
      title: 'Legal Procedures',
      description: 'Learn about the step-by-step legal procedures for filing cases and lawsuits.',
      details: [
        'Document incident details, date, time, and witnesses.',
        'File FIR/complaint at the correct authority or portal.',
        'Track your case number and keep copies of submissions.',
      ],
    },
    {
      title: 'Court System',
      description: 'Understand how the judicial system works and different types of courts.',
      details: [
        'District courts handle most trial matters first.',
        'High Courts hear appeals and constitutional issues.',
        'Supreme Court is the final appellate authority.',
      ],
    },
    {
      title: 'Evidence Collection',
      description: 'Guidelines on properly collecting and preserving evidence for legal cases.',
      details: [
        'Keep original files with timestamps and metadata intact.',
        'Take clear photos/videos and save backup copies.',
        'Avoid editing evidence; note chain of custody.',
      ],
    },
    {
      title: 'Legal Terminology',
      description: 'Common legal terms and their meanings explained in simple language.',
      details: [
        'FIR: First Information Report registered by police.',
        'Bail: Temporary release under legal conditions.',
        'Affidavit: Signed statement made under oath.',
      ],
    },
    {
      title: 'Your Responsibilities',
      description: 'Know your duties and responsibilities as a responsible citizen.',
      details: [
        'Report crimes promptly with accurate information.',
        'Cooperate with investigation and court summons.',
        'Avoid sharing false or unverified legal claims.',
      ],
    },
  ]

  const helplines = [
    {
      title: 'Police Emergency',
      number: '100',
      description: 'Emergency police assistance',
      icon: Shield,
      actions: [
        { label: 'Call Now', icon: Phone, href: 'tel:100' },
        { label: 'WhatsApp', icon: MessageSquare, href: 'https://wa.me/91100?text=Emergency%20assistance%20required' }
      ]
    },
    {
      title: 'Women\'s Helpline',
      number: '1091',
      description: 'Support for women in distress',
      icon: Heart,
      actions: [
        { label: 'Call Now', icon: Phone, href: 'tel:1091' },
        { label: 'WhatsApp', icon: MessageSquare, href: 'https://wa.me/911091?text=Need%20urgent%20help' }
      ]
    },
    {
      title: 'Child Helpline',
      number: '1098',
      description: 'Protection for children in need',
      icon: AlertTriangle,
      actions: [
        { label: 'Call Now', icon: Phone, href: 'tel:1098' },
        { label: 'Chat', icon: MessageSquare, href: 'https://www.childlineindia.org/' }
      ]
    },
    {
      title: 'Cyber Crime Helpline',
      number: '1930',
      description: 'Report cyber crimes and frauds',
      icon: Lock,
      actions: [
        { label: 'Call Now', icon: Phone, href: 'tel:1930' },
        { label: 'Report Online', icon: MessageSquare, href: 'https://cybercrime.gov.in/' }
      ]
    },
    {
      title: 'Senior Citizen Helpline',
      number: '1090',
      description: 'Assistance for senior citizens',
      icon: Users,
      actions: [
        { label: 'Call Now', icon: Phone, href: 'tel:1090' },
        { label: 'WhatsApp', icon: MessageSquare, href: 'https://wa.me/911090?text=Need%20support%20for%20senior%20citizen' }
      ]
    },
    {
      title: 'Legal Aid Authority',
      number: '1050',
      description: 'Free legal aid and assistance',
      icon: Briefcase,
      actions: [
        { label: 'Call Now', icon: Phone, href: 'tel:1050' },
        { label: 'Request Aid', icon: MessageSquare, href: 'https://nalsa.gov.in/' }
      ]
    },
  ]

  const caseTypeMapping: { [key: string]: string } = {
    'harassment': 'Harassment',
    'cybercrime': 'Cyber Crime',
    'theft': 'Theft',
    'domestic': 'Domestic Violence',
    'corruption': 'Corruption',
    'fraud': 'Fraud/Cheating',
    'assault': 'Assault/Battery',
    'property': 'Property Dispute',
    'labor': 'Labor Rights Violation',
    'sexual': 'Sexual Harassment',
    'child': 'Child Abuse',
    'environmental': 'Environmental Violation'
  }

  const threatKeywords = [
    'threat',
    'threatening',
    'danger',
    'unsafe',
    'help me',
    'kidnap',
    'stalk',
    'attack',
    'abuse',
    'violence',
    'blackmail',
    'someone is following me',
  ]

  const isThreatDetected = threatKeywords.some((keyword) =>
    aiAnalysisInput.toLowerCase().includes(keyword)
  )

  const jumpToSOSPanel = () => {
    setIsAIAnalysisOpen(false)
    setTimeout(() => {
      document.getElementById('sos-alert-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const handleAIAnalysis = async () => {
    if (!aiAnalysisInput.trim()) {
      alert('Please describe your case')
      return
    }

    setIsAnalyzing(true)
    try {
      if (chatbotMode === 'legal') {
        const response = await fetch(`${CHATBOT_API_BASE_URL}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complaint: aiAnalysisInput }),
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to process complaint')
        }
        setAiAnalysisResult({
          mode: 'legal',
          category: data.category,
          section: data.response?.section,
          advice: data.response?.advice,
          escalation: data.response?.escalation,
          helpline: data.response?.helpline,
          disclaimer: data.disclaimer,
        })
      } else {
        const nextMessages = [...chatbotMessages, { role: 'user' as const, content: aiAnalysisInput }]
        const response = await fetch(`${CHATBOT_API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextMessages }),
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Chat request failed')
        }
        const updated = [...nextMessages, { role: 'assistant' as const, content: data.reply }]
        setChatbotMessages(updated)
      }
      setAiAnalysisInput('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Chatbot request failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const readImageFromFile = (file: File): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Unable to read image'))
        img.src = String(reader.result)
      }
      reader.onerror = () => reject(new Error('Unable to load file'))
      reader.readAsDataURL(file)
    })

  const analyzeProofImage = async (file: File): Promise<{ valid: boolean; reason?: string }> => {
    if (!file.type.startsWith('image/')) {
      return { valid: false, reason: t.reasonNotImage(file.name) }
    }

    if (file.size < 8 * 1024) {
      return { valid: false, reason: t.reasonTooSmall(file.name) }
    }

    const img = await readImageFromFile(file)
    if (img.width < 180 || img.height < 180) {
      return { valid: false, reason: t.reasonLowRes(file.name) }
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.min(320, img.width)
    canvas.height = Math.min(320, img.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { valid: false, reason: t.reasonAnalyzeFailed(file.name) }
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let sum = 0
    let sumSq = 0
    let count = 0

    for (let i = 0; i < data.length; i += 16) {
      const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      sum += luma
      sumSq += luma * luma
      count += 1
    }

    const mean = sum / Math.max(count, 1)
    const variance = sumSq / Math.max(count, 1) - mean * mean

    if (variance < 90) {
      return { valid: false, reason: t.reasonBlurry(file.name) }
    }

    return { valid: true }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setIsAnalyzingProof(true)
    const selectedFiles = Array.from(files)
    const validFiles: File[] = []
    const invalidReasons: string[] = []

    for (const file of selectedFiles) {
      try {
        const result = await analyzeProofImage(file)
        if (result.valid) {
          validFiles.push(file)
        } else if (result.reason) {
          invalidReasons.push(result.reason)
        }
      } catch {
        invalidReasons.push(t.reasonAnalyzeFailed(file.name))
      }
    }

    if (validFiles.length > 0) {
      setUploadedImages((prev) => [...prev, ...validFiles])
      setRejectedProofCount(invalidReasons.length)
      setProofAnalysisSeverity(invalidReasons.length > 0 ? 'warning' : 'success')
      setProofAnalysisMessage(
        invalidReasons.length > 0
          ? t.aiProofPartial(validFiles.length, invalidReasons[0])
          : t.aiProofValidAdded(validFiles.length)
      )
    } else {
      setRejectedProofCount(invalidReasons.length || 1)
      setProofAnalysisSeverity('error')
      setProofAnalysisMessage(
        t.aiProofFailed(invalidReasons[0] || t.reasonAiFailed)
      )
    }

    setIsAnalyzingProof(false)
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  const saveComplaintDraft = () => {
    const draft = {
      selectedCategory,
      formData,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem('justiceai_complaint_draft', JSON.stringify(draft))
    alert('Draft saved locally')
  }

  const loadComplaintDraft = () => {
    const raw = localStorage.getItem('justiceai_complaint_draft')
    if (!raw) {
      alert('No saved draft found')
      return
    }
    try {
      const parsed = JSON.parse(raw)
      setSelectedCategory(parsed.selectedCategory || null)
      setFormData((prev) => ({ ...prev, ...(parsed.formData || {}) }))
      alert('Draft loaded')
    } catch {
      alert('Draft is invalid')
    }
  }

  const copyEscalationDraft = async (draft: string) => {
    try {
      await navigator.clipboard.writeText(draft)
      alert('Escalation draft copied')
    } catch {
      alert('Unable to copy escalation draft')
    }
  }

  const downloadLegalDraftPdf = async (trackingId: string) => {
    try {
      if (!trackingId) {
        alert('Tracking ID is required to download PDF')
        return
      }
      const response = await fetch(`${API_BASE_URL}/cases/public/draft-pdf/${trackingId}`)
      if (!response.ok) {
        let message = 'Unable to download legal draft PDF'
        try {
          const data = await response.json()
          message = data.error || message
        } catch {}
        throw new Error(message)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `legal-draft-${trackingId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF download failed')
    }
  }

  const fetchNearestPoliceStation = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) {
      setNearestPoliceStation('')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/cases/public/police-station/${pincode}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to fetch nearest police station')
      setNearestPoliceStation(data.nearestPoliceStation || '')
    } catch {
      setNearestPoliceStation('Nearest police station to be assigned')
    }
  }

  const createComplaintFeeIntent = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please enter name, email, and phone before payment')
      return
    }
    setIsCreatingFeeIntent(true)
    try {
      const response = await fetch(`${API_BASE_URL}/monetization/public/complaint-fee-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          amount: COMPLAINT_MIN_FEE,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create payment intent')

      setComplaintPaymentIntent({
        reference: data.reference,
        amount: data.amount,
        upiId: data.upiId,
        upiLink: data.upiLink,
        qrCodeUrl: data.qrCodeUrl,
      })
      setIsComplaintFeePaid(false)
      setComplaintPaymentUtr('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to create payment intent')
    } finally {
      setIsCreatingFeeIntent(false)
    }
  }

  const confirmComplaintFeePayment = async () => {
    if (!complaintPaymentIntent?.reference) {
      alert('Create payment intent first')
      return
    }
    if (!complaintPaymentUtr.trim()) {
      alert('Enter UTR/transaction ID after payment')
      return
    }

    setIsConfirmingFeePayment(true)
    try {
      const response = await fetch(`${API_BASE_URL}/monetization/public/complaint-fee-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: complaintPaymentIntent.reference,
          utr: complaintPaymentUtr.trim(),
          paidAmount: complaintPaymentIntent.amount,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Payment confirmation failed')
      setIsComplaintFeePaid(true)
      alert(`Payment verified for reference ${data.reference}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment confirmation failed')
    } finally {
      setIsConfirmingFeePayment(false)
    }
  }

  const fetchAdCampaigns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/monetization/public/ad-campaigns`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load advertisements')
      setAdCampaigns(data.campaigns || [])
    } catch (err) {
      console.error(err)
      setAdCampaigns([])
    }
  }

  const handleAdvertiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdSubmitting(true)
    setAdSubmitMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/monetization/public/advertise-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advertiseForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to submit advertisement inquiry')
      setAdSubmitMessage(data.message || 'Advertisement inquiry submitted')
      setAdvertiseForm({
        name: '',
        email: '',
        organization: '',
        budget: '',
        message: '',
      })
    } catch (err) {
      setAdSubmitMessage(err instanceof Error ? err.message : 'Unable to submit advertisement inquiry')
    } finally {
      setIsAdSubmitting(false)
    }
  }

  const fetchCaseSummaryStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/cases/public/stats/summary`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load case stats')
      setCaseSummaryStats({
        harassment: data.summary?.harassment || { solved: 0, unsolved: 0, registered: 0 },
        cyber: data.summary?.cyber || { solved: 0, unsolved: 0, registered: 0 },
        overall: data.summary?.overall || { solved: 0, unsolved: 0, registered: 0 },
      })
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAdCampaigns()
    fetchCaseSummaryStats()
  }, [])

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (uploadedImages.length === 0) {
      alert(t.uploadProperBeforeSubmit)
      return
    }

    if (rejectedProofCount > 0) {
      alert(t.uploadValidOnly)
      return
    }

    if (!selectedCategory) {
      alert(t.selectCategory)
      return
    }
    if (!complaintPaymentIntent?.reference || !isComplaintFeePaid) {
      alert('Please complete the minimum Rs 100 complaint fee payment before filing')
      return
    }

    setIsSubmittingComplaint(true)
    try {
      const response = await fetch(`${API_BASE_URL}/cases/public/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          caseType: caseTypeMapping[selectedCategory] || selectedCategory,
          description: formData.description,
          evidence: formData.evidence,
          proofCount: uploadedImages.length,
          incidentDate: formData.incidentDate,
          incidentTime: formData.incidentTime,
          accusedName: formData.accusedName,
          witnessDetails: formData.witnessDetails,
          urgencyLevel: formData.urgencyLevel,
          preferredLanguage: formData.preferredLanguage,
          pincode: formData.pincode,
          isProtectedCase: formData.isProtectedCase,
          paymentReference: complaintPaymentIntent.reference,
          paymentUtr: complaintPaymentUtr.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to file complaint')
      }

      setSubmittedTrackingId(data.complaint?.trackingId || '')
      setSubmittedCaseStrength(data.complaint?.caseStrength ?? null)
      setSubmittedSummary(data.complaint?.complaintSummary || '')
      setSubmittedCaseAnalysis(data.complaint?.caseAnalysis || null)
      setSubmittedEscalationDraft(data.complaint?.legalDraft || data.complaint?.escalationDraft || '')
      setSubmittedProtectedId(data.complaint?.protectedId || '')
      setSubmittedNearestPoliceStation(data.complaint?.nearestPoliceStation || '')
      setSubmitSuccessMessage(data.message || 'Complaint filed successfully')
      setFormData({
        name: '',
        email: '',
        phone: '',
        description: '',
        evidence: '',
        location: '',
        incidentDate: '',
        incidentTime: '',
        accusedName: '',
        witnessDetails: '',
        urgencyLevel: 'medium',
        preferredLanguage: 'english',
        pincode: '',
        isProtectedCase: false,
      })
      setUploadedImages([])
      setRejectedProofCount(0)
      setProofAnalysisMessage('')
      setProofAnalysisSeverity('')
      setSelectedCategory(null)
      setNearestPoliceStation('')
      setComplaintPaymentIntent(null)
      setComplaintPaymentUtr('')
      setIsComplaintFeePaid(false)
      fetchCaseSummaryStats()
      setIsFileComplaintOpen(false)
      alert(t.complaintFiledTracking(data.complaint?.trackingId || 'N/A'))
    } catch (err) {
      alert(err instanceof Error ? err.message : t.complaintSubmitFailed)
    } finally {
      setIsSubmittingComplaint(false)
    }
  }

  const fetchTrackingData = async (trackingId: string, showLoader = false) => {
    if (!trackingId) return
    const normalizedTrackingId = trackingId.trim().toUpperCase()
    if (showLoader) setIsTrackingLoading(true)
    try {
      let response = await fetch(`${API_BASE_URL}/cases/public/track/${normalizedTrackingId}`)
      let data = await response.json()
      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/lawyer-help/public/track/${normalizedTrackingId}`)
        data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Tracking ID not found')
        }
      }
      setTrackingResult(data)
      setTrackingLastRefreshedAt(new Date().toISOString())
      await fetchSecureMessages(data?.tracking?.trackingId || trackingId)
      return data
    } finally {
      if (showLoader) setIsTrackingLoading(false)
    }
  }

  const handleTrackCase = async () => {
    const trimmedTrackingId = trackingIdInput.trim()
    if (!trimmedTrackingId) {
      alert('Enter tracking ID')
      return
    }

    setTrackingResult(null)
    try {
      await fetchTrackingData(trimmedTrackingId, true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to track case')
    }
  }

  const fetchSecureMessages = async (trackingId: string) => {
    if (!trackingId) return
    setIsSecureMessageLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/cases/public/track/${trackingId}/messages`)
      const data = await response.json()
      if (!response.ok) {
        const errorText = String(data.error || 'Unable to load secure messages')
        if (
          errorText.toLowerCase().includes('case_messages') &&
          errorText.toLowerCase().includes('schema cache')
        ) {
          setSecureChatSetupMessage(
            "Secure chat is not enabled in database yet. Please run SQL migration for 'public.case_messages'."
          )
          setSecureMessages([])
          return
        }
        throw new Error(errorText)
      }
      setSecureChatSetupMessage('')
      setSecureMessages(data.messages || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsSecureMessageLoading(false)
    }
  }

  const sendSecureMessage = async () => {
    const trackingId = trackingResult?.tracking?.trackingId
    if (!trackingId) {
      alert('Track your complaint first')
      return
    }
    if (!secureMessageInput.trim()) {
      alert('Enter message')
      return
    }
    setIsSecureSendLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/cases/public/track/${trackingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: secureMessageInput.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        const errorText = String(data.error || 'Failed to send message')
        if (
          errorText.toLowerCase().includes('case_messages') &&
          errorText.toLowerCase().includes('schema cache')
        ) {
          setSecureChatSetupMessage(
            "Secure chat is not enabled in database yet. Please run SQL migration for 'public.case_messages'."
          )
          alert("Secure chat requires DB setup. Run migration for table 'public.case_messages'.")
          return
        }
        throw new Error(errorText)
      }
      setSecureChatSetupMessage('')
      setSecureMessageInput('')
      await fetchSecureMessages(trackingId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSecureSendLoading(false)
    }
  }

  const openPoliceChat = () => {
    secureChatBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      secureMessageInputRef.current?.focus()
    }, 250)
  }

  useEffect(() => {
    const trackingId = trackingResult?.tracking?.trackingId
    if (!trackingId) return

    const interval = setInterval(() => {
      fetchTrackingData(trackingId)
    }, 5000)

    return () => clearInterval(interval)
  }, [trackingResult?.tracking?.trackingId])

  const openFooterWindow = (title: string, htmlBody: string) => {
    const popup = window.open('', '_blank', 'width=560,height=520,resizable=yes,scrollbars=yes')
    if (!popup) {
      alert('Please allow popups in browser settings')
      return
    }
    popup.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 16px; color: #1f2937; line-height: 1.5; }
          h1 { margin: 0 0 12px 0; color: #1d4ed8; font-size: 20px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${htmlBody}
      </body>
      </html>
    `)
    popup.document.close()
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Scale className="w-8 h-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">JusticeAI</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 transition font-medium">{s.home}</Link>
              <button 
                onClick={() => setIsFileComplaintOpen(true)}
                className="text-gray-700 hover:text-blue-600 transition font-medium">{s.fileCase}</button>
              <Link
                href="/ai-case-analysis"
                className="text-gray-700 hover:text-blue-600 transition font-medium"
              >
                {s.aiAnalysis}
              </Link>
              <Link href="/lawyer-help" className="text-gray-700 hover:text-blue-600 transition font-medium">
                Lawyer Help
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById('track-case-section')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-gray-700 hover:text-blue-600 transition font-medium"
              >
                {s.trackCase}
              </button>
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-blue-700" />
                <select
                  value={uiLanguage}
                  onChange={(e) => changeAppLanguage(e.target.value as UILanguage)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1"
                  aria-label={s.language}
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="marathi">Marathi</option>
                  <option value="tamil">Tamil</option>
                  <option value="telugu">Telugu</option>
                  <option value="bengali">Bengali</option>
                  <option value="gujarati">Gujarati</option>
                  <option value="kannada">Kannada</option>
                  <option value="malayalam">Malayalam</option>
                  <option value="punjabi">Punjabi</option>
                  <option value="urdu">Urdu</option>
                </select>
              </div>
              <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
                {s.login}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden pb-4 space-y-2 border-t border-gray-200">
              <Link href="/" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition">{s.home}</Link>
              <button 
                onClick={() => {
                  setIsFileComplaintOpen(true)
                  setIsMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition">{s.fileCase}</button>
              <Link
                href="/ai-case-analysis"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
              >
                {s.aiAnalysis}
              </Link>
              <Link
                href="/lawyer-help"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
              >
                Lawyer Help
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById('track-case-section')
                  el?.scrollIntoView({ behavior: 'smooth' })
                  setIsMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
              >
                {s.trackCase}
              </button>
              <div className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-blue-700" />
                  <select
                    value={uiLanguage}
                    onChange={(e) => changeAppLanguage(e.target.value as UILanguage)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 w-full"
                    aria-label={s.language}
                  >
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="marathi">Marathi</option>
                    <option value="tamil">Tamil</option>
                    <option value="telugu">Telugu</option>
                    <option value="bengali">Bengali</option>
                    <option value="gujarati">Gujarati</option>
                    <option value="kannada">Kannada</option>
                    <option value="malayalam">Malayalam</option>
                    <option value="punjabi">Punjabi</option>
                    <option value="urdu">Urdu</option>
                  </select>
                </div>
              </div>
              <Link href="/login" className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium">{s.login}</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold">
              {s.heroTitle}
            </h1>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              {s.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setIsFileComplaintOpen(true)}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition inline-flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                {s.fileComplaint}
              </button>
              <Link
                href="/ai-case-analysis"
                className="bg-blue-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-400 transition inline-flex items-center justify-center gap-2"
              >
                <Brain className="w-5 h-5" />
                {s.aiCaseAnalysis}
              </Link>
            </div>
          </div>

          {/* Animated Charts */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <AnimatedPieChart
              solved={caseSummaryStats.harassment.solved}
              unsolved={caseSummaryStats.harassment.unsolved}
              registered={caseSummaryStats.harassment.registered}
              label={s.harassmentCases}
              uiLabels={{ cases: s.cases, solved: s.solved, unsolved: s.unsolved, registered: s.registered }}
            />
            <AnimatedPieChart
              solved={caseSummaryStats.cyber.solved}
              unsolved={caseSummaryStats.cyber.unsolved}
              registered={caseSummaryStats.cyber.registered}
              label={s.cyberCases}
              uiLabels={{ cases: s.cases, solved: s.solved, unsolved: s.unsolved, registered: s.registered }}
            />
            <AnimatedPieChart
              solved={caseSummaryStats.overall.solved}
              unsolved={caseSummaryStats.overall.unsolved}
              registered={caseSummaryStats.overall.registered}
              label={s.overallStats}
              uiLabels={{ cases: s.cases, solved: s.solved, unsolved: s.unsolved, registered: s.registered }}
            />
          </div>

          <div id="track-case-section" className="mt-12 bg-white text-gray-900 rounded-lg p-6 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-3">{s.trackComplaint}</h3>
            <p className="text-sm text-gray-600 mb-4">{s.trackSubtitle}</p>
            {submitSuccessMessage && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
                {submitSuccessMessage}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={trackingIdInput}
                onChange={(e) => setTrackingIdInput(e.target.value)}
                placeholder={s.trackPlaceholder}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleTrackCase}
                disabled={isTrackingLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
              >
                {isTrackingLoading ? s.checking : s.track}
              </button>
            </div>

            {submittedTrackingId && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="font-semibold text-green-800">Last submitted complaint</p>
                <p className="text-sm text-green-700">Tracking ID: {submittedTrackingId}</p>
                {submittedCaseStrength !== null && (
                  <p className="text-sm text-green-700">Estimated case strength: {submittedCaseStrength}%</p>
                )}
                {submittedProtectedId && (
                  <p className="text-sm text-green-700">Protected ID: {submittedProtectedId}</p>
                )}
                {submittedNearestPoliceStation && (
                  <p className="text-sm text-green-700">Nearest Police Station: {submittedNearestPoliceStation}</p>
                )}
                <div className="pt-2">
                  <button
                    onClick={openPoliceChat}
                    className="px-3 py-1.5 rounded bg-blue-700 text-white text-xs font-semibold"
                  >
                    Chat with Police
                  </button>
                </div>
                {submittedSummary && (
                  <p className="text-sm text-green-700 mt-1"><span className="font-medium">Abstract:</span> {submittedSummary}</p>
                )}
                {submittedCaseAnalysis && (
                  <div className="mt-2 text-sm text-green-700">
                    <p><span className="font-medium">Analysis:</span> {submittedCaseAnalysis.likelyOutcome}</p>
                    <p>Completeness Score: {submittedCaseAnalysis.completenessScore}% | Risk: {submittedCaseAnalysis.riskLevel}</p>
                  </div>
                )}
                {submittedEscalationDraft && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        onClick={() => copyEscalationDraft(submittedEscalationDraft)}
                        className="px-3 py-1.5 rounded bg-green-700 text-white text-xs font-semibold"
                      >
                        Copy Escalation Draft
                      </button>
                      <button
                        onClick={() => downloadLegalDraftPdf(submittedTrackingId)}
                        className="px-3 py-1.5 rounded bg-purple-700 text-white text-xs font-semibold"
                      >
                        Download Legal Draft PDF
                      </button>
                      <a
                        href={`mailto:?subject=Case Escalation Request&body=${encodeURIComponent(submittedEscalationDraft)}`}
                        className="px-3 py-1.5 rounded bg-blue-700 text-white text-xs font-semibold"
                      >
                        Send Draft by Email
                      </a>
                    </div>
                    <textarea
                      readOnly
                      value={submittedEscalationDraft}
                      rows={8}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg bg-white text-xs text-gray-700"
                    />
                  </div>
                )}
              </div>
            )}

            {trackingResult?.tracking?.caseNumber && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                {trackingLastRefreshedAt && (
                  <p className="text-xs text-blue-700">
                    Last refreshed: {new Date(trackingLastRefreshedAt).toLocaleString()}
                  </p>
                )}
                <p><span className="font-semibold">Case:</span> {trackingResult.tracking.caseNumber}</p>
                <p><span className="font-semibold">Status:</span> {trackingResult.tracking.status}</p>
                <p><span className="font-semibold">Progress:</span> {trackingResult.tracking.progressPercent}%</p>
                <p><span className="font-semibold">FIR:</span> {trackingResult.tracking.firNumber || 'Not filed yet'}</p>
                <p><span className="font-semibold">Winning chance estimate:</span> {trackingResult.tracking.caseStrength}%</p>
                <p><span className="font-semibold">Latest note:</span> {trackingResult.tracking.progressNotes || 'No notes yet'}</p>
                {trackingResult.tracking.protectedId && (
                  <p><span className="font-semibold">Protected ID:</span> {trackingResult.tracking.protectedId}</p>
                )}
                {trackingResult.tracking.nearestPoliceStation && (
                  <p><span className="font-semibold">Nearest Station:</span> {trackingResult.tracking.nearestPoliceStation}</p>
                )}
                <div className="pt-1">
                  <button
                    onClick={openPoliceChat}
                    className="px-3 py-1.5 rounded bg-blue-700 text-white text-xs font-semibold"
                  >
                    Chat with Police
                  </button>
                </div>
                {trackingResult.tracking.complaintSummary && (
                  <p><span className="font-semibold">Abstract:</span> {trackingResult.tracking.complaintSummary}</p>
                )}
                {trackingResult.tracking.caseAnalysis?.likelyOutcome && (
                  <p><span className="font-semibold">Analysis:</span> {trackingResult.tracking.caseAnalysis.likelyOutcome}</p>
                )}
                {(trackingResult.tracking.legalDraft || trackingResult.tracking.escalationDraft) && (
                  <div className="pt-2">
                    <button
                      onClick={() => copyEscalationDraft(trackingResult.tracking.legalDraft || trackingResult.tracking.escalationDraft)}
                      className="px-3 py-1.5 rounded bg-blue-700 text-white text-xs font-semibold"
                    >
                      Copy Escalation Draft
                    </button>
                    <button
                      onClick={() => downloadLegalDraftPdf(trackingResult.tracking.trackingId)}
                      className="ml-2 px-3 py-1.5 rounded bg-purple-700 text-white text-xs font-semibold"
                    >
                      Download Legal Draft PDF
                    </button>
                  </div>
                )}

                {trackingResult.tracking.communicationEnabled && (
                  <div ref={secureChatBoxRef} className="mt-4 p-3 rounded-lg bg-white border border-blue-200">
                    <p className="font-semibold text-blue-900">Secure Communication with Police</p>
                    <p className="text-xs text-gray-600 mb-2">
                      Your identity is protected. Messages are shared using Protected ID only.
                    </p>
                    {trackingResult.tracking.protectedId && (
                      <p className="text-xs text-blue-700 mb-2">
                        Protected ID: {trackingResult.tracking.protectedId}
                      </p>
                    )}
                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-2">
                      {secureChatSetupMessage && (
                        <p className="text-xs text-amber-700">{secureChatSetupMessage}</p>
                      )}
                      {isSecureMessageLoading ? (
                        <p className="text-xs text-gray-500">Loading messages...</p>
                      ) : secureMessages.length === 0 ? (
                        <p className="text-xs text-gray-500">No messages yet. Send your first secure update.</p>
                      ) : (
                        secureMessages.map((msg) => (
                          <div key={msg.id} className="text-xs">
                            <p className="font-semibold text-gray-700">{msg.senderLabel}</p>
                            <p className="text-gray-700">{msg.message}</p>
                            <p className="text-gray-400">{new Date(msg.createdAt).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        ref={secureMessageInputRef}
                        type="text"
                        value={secureMessageInput}
                        onChange={(e) => setSecureMessageInput(e.target.value)}
                        placeholder="Type secure message for assigned police officer..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={sendSecureMessage}
                        disabled={isSecureSendLoading}
                        className="px-3 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:bg-gray-400"
                      >
                        {isSecureSendLoading ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 rounded-lg bg-white border border-blue-200">
                  <p className="font-semibold text-blue-900">Police Activity Timeline</p>
                  <div className="max-h-52 overflow-y-auto mt-2 space-y-2">
                    {(trackingResult.activities || []).length === 0 ? (
                      <p className="text-xs text-gray-500">No activity updates yet.</p>
                    ) : (
                      (trackingResult.activities || []).map((item: any, idx: number) => (
                        <div key={`${item.created_at}-${idx}`} className="text-xs border-b border-gray-100 pb-2">
                          <p className="font-semibold text-gray-800">
                            {(item.activity_type || 'update').replace(/_/g, ' ')}
                          </p>
                          <p className="text-gray-700">{item.description || 'No details'}</p>
                          <p className="text-gray-400">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {trackingResult?.tracking?.requestTrackingId && !trackingResult?.tracking?.caseNumber && (
              <div className="mt-4 p-4 rounded-lg bg-indigo-50 border border-indigo-200 space-y-2">
                <p><span className="font-semibold">Lawyer Request Tracking ID:</span> {trackingResult.tracking.requestTrackingId}</p>
                <p><span className="font-semibold">Status:</span> {trackingResult.tracking.status}</p>
                <p><span className="font-semibold">Progress:</span> {trackingResult.tracking.progressPercent}%</p>
                <p><span className="font-semibold">Latest Note:</span> {trackingResult.tracking.progressNotes || 'No updates yet'}</p>
                {trackingResult.tracking.lawyerResponseNote && (
                  <p><span className="font-semibold">Lawyer Note:</span> {trackingResult.tracking.lawyerResponseNote}</p>
                )}
                {trackingResult.tracking.lawyer?.full_name && (
                  <p><span className="font-semibold">Lawyer:</span> {trackingResult.tracking.lawyer.full_name}</p>
                )}
                {trackingResult.tracking.linkedCaseTrackingId && (
                  <p><span className="font-semibold">Linked Case Tracking:</span> {trackingResult.tracking.linkedCaseTrackingId}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full-Screen File Complaint Page */}
      {isFileComplaintOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-blue-600 text-white p-6 flex justify-between items-center shadow-lg">
              <h1 className="text-3xl font-bold">File a Complaint</h1>
              <button 
                onClick={() => {
                  setIsFileComplaintOpen(false)
                  setSelectedCategory(null)
                  setUploadedImages([])
                  setComplaintPaymentIntent(null)
                  setComplaintPaymentUtr('')
                  setIsComplaintFeePaid(false)
                }}
                className="p-2 hover:bg-blue-500 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-8">
              {!selectedCategory ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">Select Case Category</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {caseCategories.map((cat) => {
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition transform hover:scale-105 flex flex-col items-center gap-3"
                        >
                          <Icon className="w-8 h-8" />
                          <span className="font-semibold text-center text-sm">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <button 
                    onClick={() => {
                      setSelectedCategory(null)
                      setUploadedImages([])
                      setRejectedProofCount(0)
                      setProofAnalysisMessage('')
                      setProofAnalysisSeverity('')
                      setComplaintPaymentIntent(null)
                      setComplaintPaymentUtr('')
                      setIsComplaintFeePaid(false)
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium mb-8 flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Back to Categories
                  </button>

                  <form onSubmit={handleSubmitComplaint} className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      {caseCategories.find(c => c.id === selectedCategory)?.label} - Case Details
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Incident Date</label>
                        <input
                          type="date"
                          value={formData.incidentDate}
                          onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Incident Time</label>
                        <input
                          type="time"
                          value={formData.incidentTime}
                          onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Accused Name (if known)</label>
                        <input
                          type="text"
                          value={formData.accusedName}
                          onChange={(e) => setFormData({ ...formData, accusedName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                          placeholder="Name / identifier"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
                        <select
                          value={formData.urgencyLevel}
                          onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
                        <select
                          value={formData.preferredLanguage}
                          onChange={(e) => changeAppLanguage(e.target.value as UILanguage)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        >
                          <option value="english">English</option>
                          <option value="hindi">Hindi</option>
                          <option value="marathi">Marathi</option>
                          <option value="tamil">Tamil</option>
                          <option value="telugu">Telugu</option>
                          <option value="bengali">Bengali</option>
                          <option value="gujarati">Gujarati</option>
                          <option value="kannada">Kannada</option>
                          <option value="malayalam">Malayalam</option>
                          <option value="punjabi">Punjabi</option>
                          <option value="urdu">Urdu</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Witness Details</label>
                        <input
                          type="text"
                          value={formData.witnessDetails}
                          onChange={(e) => setFormData({ ...formData, witnessDetails: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                          placeholder="Witness names/contacts"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                        <input
                          type="text"
                          value={formData.pincode}
                          onChange={(e) => {
                            const nextValue = e.target.value.replace(/\D/g, '').slice(0, 6)
                            setFormData({ ...formData, pincode: nextValue })
                            if (nextValue.length === 6) {
                              fetchNearestPoliceStation(nextValue)
                            } else {
                              setNearestPoliceStation('')
                            }
                          }}
                          placeholder="6-digit pincode"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nearest Police Station</label>
                        <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 min-h-[48px] flex items-center">
                          {nearestPoliceStation || 'Enter pincode to auto-detect nearest station'}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-amber-900">Protected Case Filing</p>
                          <p className="text-xs text-amber-800">
                            Enable this to hide complainant identity from police view. You will receive a Protected ID.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isProtectedCase: !formData.isProtectedCase })}
                          className={`px-4 py-2 rounded-lg text-xs font-bold ${formData.isProtectedCase ? 'bg-amber-700 text-white' : 'bg-white text-amber-800 border border-amber-300'}`}
                        >
                          {formData.isProtectedCase ? 'Protected ID ON' : 'Enable Protected ID'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Incident Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        placeholder="Describe the incident in detail with dates, times, and people involved..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Information</label>
                      <textarea
                        value={formData.evidence}
                        onChange={(e) => setFormData({...formData, evidence: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        placeholder="Any additional details or witnesses..."
                      />
                    </div>

                    {/* Evidence Photo Upload */}
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
                      <div className="flex flex-col items-center gap-3 mb-4">
                        <Upload className="w-8 h-8 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Upload Evidence Photos</h3>
                        <p className="text-sm text-gray-600">Minimum 1 photo required, select as many as needed</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      {isAnalyzingProof && (
                        <p className="mt-3 text-sm text-blue-700">{t.analyzingProof}</p>
                      )}
                      {proofAnalysisMessage && (
                        <p
                          className={`mt-3 text-sm ${
                            proofAnalysisSeverity === 'error'
                              ? 'text-red-700'
                              : proofAnalysisSeverity === 'warning'
                              ? 'text-amber-700'
                              : 'text-green-700'
                          }`}
                        >
                          {proofAnalysisMessage}
                        </p>
                      )}
                      {rejectedProofCount > 0 && (
                        <p className="mt-2 text-sm text-red-700">
                          {t.invalidProofBlock}
                        </p>
                      )}
                    </div>

                    {/* Uploaded Images Display */}
                    {uploadedImages.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Uploaded Photos ({uploadedImages.length})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {uploadedImages.map((file, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Evidence ${idx + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-green-200 bg-green-50 p-5">
                      <h3 className="text-lg font-bold text-green-900">Mandatory Complaint Fee</h3>
                      <p className="text-sm text-green-800 mt-1">
                        A minimum filing fee of Rs {COMPLAINT_MIN_FEE} is required before complaint submission.
                      </p>
                      {!complaintPaymentIntent ? (
                        <button
                          type="button"
                          onClick={createComplaintFeeIntent}
                          disabled={isCreatingFeeIntent}
                          className="mt-4 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                          {isCreatingFeeIntent ? 'Creating Payment...' : `Generate UPI Payment (Rs ${COMPLAINT_MIN_FEE})`}
                        </button>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm text-gray-800">
                            <span className="font-semibold">Reference:</span> {complaintPaymentIntent.reference}
                          </p>
                          <p className="text-sm text-gray-800">
                            <span className="font-semibold">UPI ID:</span> {complaintPaymentIntent.upiId}
                          </p>
                          <div className="flex flex-wrap items-start gap-4">
                            <img
                              src={complaintPaymentIntent.qrCodeUrl}
                              alt="UPI QR"
                              className="w-36 h-36 border border-gray-300 rounded-lg bg-white"
                            />
                            <div className="space-y-2">
                              <a
                                href={complaintPaymentIntent.upiLink}
                                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold"
                              >
                                Open UPI App
                              </a>
                              <input
                                type="text"
                                value={complaintPaymentUtr}
                                onChange={(e) => setComplaintPaymentUtr(e.target.value)}
                                placeholder="Enter UTR / Transaction ID"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={confirmComplaintFeePayment}
                                disabled={isConfirmingFeePayment}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold"
                              >
                                {isConfirmingFeePayment ? 'Verifying...' : 'I Have Paid - Verify'}
                              </button>
                              {isComplaintFeePaid && (
                                <p className="text-sm font-semibold text-green-700">Payment verified. You can file complaint now.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-6 sticky bottom-0 bg-white">
                      <button
                        type="button"
                        onClick={saveComplaintDraft}
                        className="bg-gray-100 text-gray-800 px-4 py-4 rounded-lg font-bold hover:bg-gray-200 transition"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={loadComplaintDraft}
                        className="bg-gray-100 text-gray-800 px-4 py-4 rounded-lg font-bold hover:bg-gray-200 transition"
                      >
                        Load Draft
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingComplaint}
                        className="flex-1 bg-blue-600 disabled:bg-gray-400 text-white px-6 py-4 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        {isSubmittingComplaint ? 'Submitting...' : 'File Complaint'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsFileComplaintOpen(false)
                          setSelectedCategory(null)
                          setUploadedImages([])
                          setRejectedProofCount(0)
                          setProofAnalysisMessage('')
                          setProofAnalysisSeverity('')
                          setComplaintPaymentIntent(null)
                          setComplaintPaymentUtr('')
                          setIsComplaintFeePaid(false)
                        }}
                        className="flex-1 bg-gray-200 text-gray-900 px-6 py-4 rounded-lg font-bold hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Case Analysis Modal */}
      {isAIAnalysisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-8 h-8 text-blue-600" />
                AI Case Analysis
              </h2>
              <button 
                onClick={() => {
                  setIsAIAnalysisOpen(false)
                  setAiAnalysisInput('')
                  setAiAnalysisResult(null)
                  setChatbotMessages([])
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {!aiAnalysisResult ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChatbotMode('legal')
                        setAiAnalysisResult(null)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${chatbotMode === 'legal' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      Legal Guidance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChatbotMode('chat')
                        setAiAnalysisResult(null)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${chatbotMode === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      General Chat
                    </button>
                  </div>
                  <p className="text-gray-600">
                    {chatbotMode === 'legal'
                      ? 'Describe your legal issue to get category, legal sections, advice, escalation path, and helpline.'
                      : 'Ask legal questions and continue conversation with Justice AI chatbot.'}
                  </p>
                  {chatbotMode === 'chat' && chatbotMessages.length > 0 && (
                    <div className="max-h-56 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      {chatbotMessages.map((msg, idx) => (
                        <p key={idx} className="text-sm">
                          <span className="font-semibold">{msg.role === 'user' ? 'You' : 'Bot'}:</span> {msg.content}
                        </p>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={aiAnalysisInput}
                    onChange={(e) => setAiAnalysisInput(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder={chatbotMode === 'legal'
                      ? 'Example: I was scammed online through a fake e-commerce website...'
                      : 'Type your question for Justice AI chatbot...'}
                  />
                  {isThreatDetected && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="font-semibold text-red-700">
                        This message may indicate immediate danger. Activate SOS alert now.
                      </p>
                      <button
                        type="button"
                        onClick={jumpToSOSPanel}
                        className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                      >
                        Activate SOS
                      </button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleAIAnalysis}
                      disabled={isAnalyzing}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                    >
                      <Brain className="w-5 h-5" />
                      {isAnalyzing ? 'Processing...' : chatbotMode === 'legal' ? 'Get Legal Guidance' : 'Send'}
                    </button>
                    <button
                      onClick={() => {
                        setIsAIAnalysisOpen(false)
                        setAiAnalysisInput('')
                        setAiAnalysisResult(null)
                        setChatbotMessages([])
                      }}
                      className="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {aiAnalysisResult.mode === 'legal' ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-2xl font-bold text-blue-900 mb-2">Category:</h3>
                        <p className="text-4xl font-bold text-blue-600">{aiAnalysisResult.category}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-900">Applicable Legal Section</h4>
                        <p className="text-gray-700 leading-relaxed">{aiAnalysisResult.section}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-900">Legal Advice</h4>
                        <p className="text-gray-700 leading-relaxed">{aiAnalysisResult.advice}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-900">Escalation Path</h4>
                        <p className="text-gray-700 leading-relaxed">{aiAnalysisResult.escalation}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-900">Emergency Helpline</h4>
                        <p className="text-gray-700 leading-relaxed">{aiAnalysisResult.helpline}</p>
                      </div>
                      {aiAnalysisResult.disclaimer && (
                        <p className="text-xs text-gray-500">{aiAnalysisResult.disclaimer}</p>
                      )}
                    </>
                  ) : (
                    <div className="max-h-72 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      {chatbotMessages.map((msg, idx) => (
                        <p key={idx} className="text-sm">
                          <span className="font-semibold">{msg.role === 'user' ? 'You' : 'Bot'}:</span> {msg.content}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setAiAnalysisResult(null)
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                    >
                      <Brain className="w-5 h-5" />
                      Ask Another
                    </button>
                    <button
                      onClick={() => {
                        setIsAIAnalysisOpen(false)
                        setAiAnalysisInput('')
                        setAiAnalysisResult(null)
                        setChatbotMessages([])
                      }}
                      className="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legal Awareness Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{s.legalAwareness}</h2>
            <p className="text-xl text-gray-600">{s.legalAwareSub}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {legalAwareness.map((item, idx) => (
              <div 
                key={idx}
                className="bg-gray-50 rounded-lg border border-gray-200 p-6 hover:shadow-lg transition transform hover:scale-105"
              >
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <button
                  type="button"
                  onClick={() => setExpandedLegalIndex(expandedLegalIndex === idx ? null : idx)}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 transition"
                >
                  {expandedLegalIndex === idx ? 'Show Less' : 'Learn More'}
                  <ArrowRight className={`w-4 h-4 transition ${expandedLegalIndex === idx ? 'rotate-90' : ''}`} />
                </button>
                {expandedLegalIndex === idx && (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Detailed Instructions</h4>
                    <ul className="space-y-1 text-sm text-blue-900">
                      {item.details.map((detail: string, detailIdx: number) => (
                        <li key={detailIdx}>- {detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Government Helplines Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{s.govtHelplines}</h2>
            <p className="text-xl text-gray-600">{s.govtSub}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {helplines.map((helpline, idx) => {
              const Icon = helpline.icon
              return (
                <div 
                  key={idx}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-600 rounded-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{helpline.title}</h3>
                      <p className="text-sm text-gray-600">{helpline.description}</p>
                    </div>
                  </div>

                  <div className="text-center py-4 border-t border-b border-gray-200 my-4">
                    <div className="text-4xl font-bold text-blue-600">{helpline.number}</div>
                  </div>

                  <div className="space-y-2">
                    {helpline.actions.map((action, actionIdx) => {
                      const ActionIcon = action.icon
                      return (
                        <a
                          key={actionIdx}
                          href={action.href}
                          target={action.href.startsWith('http') ? '_blank' : undefined}
                          rel={action.href.startsWith('http') ? 'noreferrer' : undefined}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 text-sm"
                        >
                          <ActionIcon className="w-4 h-4" />
                          {action.label}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <SOSAlertPanel />

          <div className="mt-16 bg-white rounded-lg border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{s.emergencyGuidelines}</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">When to Call:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• Life-threatening situations</li>
                  <li>• Active crimes in progress</li>
                  <li>• Child or elder abuse</li>
                  <li>• Cyber fraud activities</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Information to Provide:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• Your current location</li>
                  <li>• Type of emergency</li>
                  <li>• Number of people involved</li>
                  <li>• Your contact information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Advertisement Sponsors</h2>
            <p className="text-xl text-gray-600">Partner with JusticeAI through sponsored campaigns.</p>
          </div>

          <div className="mb-10">
            <form onSubmit={handleAdvertiseSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-3">
              <h3 className="text-2xl font-bold text-gray-900">Advertise With JusticeAI</h3>
              <p className="text-sm text-gray-600">Submit your inquiry for homepage campaign placement.</p>
              <input
                type="text"
                value={advertiseForm.name}
                onChange={(e) => setAdvertiseForm({ ...advertiseForm, name: e.target.value })}
                placeholder="Your Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="email"
                value={advertiseForm.email}
                onChange={(e) => setAdvertiseForm({ ...advertiseForm, email: e.target.value })}
                placeholder="Email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="text"
                value={advertiseForm.organization}
                onChange={(e) => setAdvertiseForm({ ...advertiseForm, organization: e.target.value })}
                placeholder="Organization"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="text"
                value={advertiseForm.budget}
                onChange={(e) => setAdvertiseForm({ ...advertiseForm, budget: e.target.value })}
                placeholder="Budget (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                value={advertiseForm.message}
                onChange={(e) => setAdvertiseForm({ ...advertiseForm, message: e.target.value })}
                rows={3}
                placeholder="Campaign goal / target audience"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <button
                type="submit"
                disabled={isAdSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold"
              >
                {isAdSubmitting ? 'Submitting...' : 'Submit Advertisement Inquiry'}
              </button>
              {adSubmitMessage && <p className="text-sm text-gray-700">{adSubmitMessage}</p>}
            </form>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Featured Sponsored Partners</h3>
            {adCampaigns.length === 0 ? (
              <p className="text-gray-600">No active sponsored campaigns right now.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adCampaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-blue-700 mb-2">Sponsored by {campaign.sponsor}</p>
                    <h4 className="text-lg font-bold text-gray-900">{campaign.title}</h4>
                    <p className="text-sm text-gray-600 mt-2 mb-4">{campaign.description}</p>
                    <a
                      href={campaign.ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                    >
                      {campaign.ctaLabel || 'Learn More'}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-8 h-8 text-white" />
                <span className="font-bold text-xl">JusticeAI</span>
              </div>
              <p className="text-blue-100">{s.footerTagline}</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-blue-100">
                <li><button type="button" onClick={() => openFooterWindow('About Us', '<p>JusticeAI provides legal guidance, complaint filing, case tracking, and protected identity workflows for safer citizen reporting.</p>')} className="hover:text-white transition text-left">About Us</button></li>
                <li><button type="button" onClick={() => openFooterWindow('Services', '<ul><li>Complaint filing</li><li>Case tracking</li><li>Secure victim-police communication</li><li>AI legal drafts</li></ul>')} className="hover:text-white transition text-left">Services</button></li>
                <li><button type="button" onClick={() => openFooterWindow('Blog', '<p>Product and legal-awareness updates will be published here.</p>')} className="hover:text-white transition text-left">Blog</button></li>
                <li><button type="button" onClick={() => openFooterWindow('Contact', '<p>Email: support@justiceai.com</p><p>Phone: 1-800-JUSTICE</p><p>Emergency: 100</p>')} className="hover:text-white transition text-left">Contact</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-blue-100">
                <li><a href="/ai-case-analysis" className="hover:text-white transition">Legal Guide</a></li>
                <li><button type="button" onClick={() => openFooterWindow('FAQ', '<p><strong>How to track complaint?</strong> Use your tracking ID in Track Case.</p><p><strong>Can I hide identity?</strong> Yes, through protected ID based flow.</p>')} className="hover:text-white transition text-left">FAQ</button></li>
                <li><button type="button" onClick={() => openFooterWindow('Support', '<p>For help, email support@justiceai.com.</p>')} className="hover:text-white transition text-left">Support</button></li>
                <li><button type="button" onClick={() => openFooterWindow('Privacy', '<p>JusticeAI handles case data for legal workflow and supports protected communication for victim privacy.</p>')} className="hover:text-white transition text-left">Privacy</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-blue-100">Email: <a className="hover:text-white" href="mailto:support@justiceai.com">support@justiceai.com</a></p>
              <p className="text-blue-100">Phone: <a className="hover:text-white" href="tel:+18005878423">1-800-JUSTICE</a></p>
              <p className="text-blue-100">Emergency: <a className="hover:text-white" href="tel:100">100</a></p>
            </div>
          </div>

          <div className="border-t border-blue-800 pt-8">
            <p className="text-center text-blue-100">{s.rights}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
