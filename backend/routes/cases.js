import express from 'express';
import { supabase } from '../server.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

const normalizeTrackingId = (value = '') => String(value).trim().toUpperCase();

const PINCODE_STATION_MAP = {
  '400001': 'Azad Maidan Police Station, Mumbai',
  '416410':'Miraj Police Station, Sangli',
  '400050': 'Bandra Police Station, Mumbai',
  '400053': 'Andheri Police Station, Mumbai',
  '110001': 'Connaught Place Police Station, New Delhi',
  '110092': 'Preet Vihar Police Station, Delhi',
  '560001': 'Cubbon Park Police Station, Bengaluru',
  '560034': 'Koramangala Police Station, Bengaluru',
  '500001': 'Abids Police Station, Hyderabad',
  '600001': 'Flower Bazaar Police Station, Chennai',
  '700001': 'Hare Street Police Station, Kolkata',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const wrapText = (text = '', maxChars = 90) => {
  const words = String(text).replace(/\r/g, '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + ' ' + word).length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
};

const escapePdfText = (value = '') =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const buildPdfBuffer = ({ title, lines }) => {
  const allLines = [title || 'Legal Draft', '', ...(lines || [])];
  const wrapped = allLines.flatMap((line) => (line ? wrapText(line, 90) : ['']));
  const printableLines = wrapped.slice(0, 52);

  const contentParts = ['BT', '/F1 11 Tf', '50 760 Td'];
  for (const [index, line] of printableLines.entries()) {
    contentParts.push(`(${escapePdfText(line)}) Tj`);
    if (index < printableLines.length - 1) contentParts.push('0 -14 Td');
  }
  contentParts.push('ET');
  const contentStream = contentParts.join('\n');

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'
  );
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj\n`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
};

const calculateCaseStrength = ({ description = '', evidence = '', proofCount = 0 }) => {
  const descriptionScore = clamp(Math.floor(description.trim().length / 12), 0, 55);
  const evidenceScore = evidence.trim().length > 0 ? clamp(Math.floor(evidence.trim().length / 20), 0, 25) : 0;
  const proofScore = clamp(proofCount * 8, 0, 20);
  return clamp(descriptionScore + evidenceScore + proofScore, 5, 95);
};

const buildComplaintSummary = ({
  caseType,
  description = '',
  location = '',
  incidentDate = '',
  incidentTime = '',
  accusedName = '',
}) => {
  const shortDescription = description.trim().replace(/\s+/g, ' ').slice(0, 220);
  const parts = [
    `Complaint type: ${caseType || 'General'}.`,
    location ? `Location: ${location}.` : '',
    incidentDate ? `Date: ${incidentDate}.` : '',
    incidentTime ? `Time: ${incidentTime}.` : '',
    accusedName ? `Accused: ${accusedName}.` : '',
    shortDescription ? `Summary: ${shortDescription}${description.length > 220 ? '...' : ''}` : '',
  ].filter(Boolean);
  return parts.join(' ');
};

const generateCaseAnalysis = ({ description = '', evidence = '', proofCount = 0, witnessDetails = '' }) => {
  const detailScore = clamp(Math.floor(description.trim().length / 10), 0, 45);
  const evidenceScore = evidence.trim() ? clamp(Math.floor(evidence.trim().length / 20), 0, 20) : 0;
  const witnessScore = witnessDetails.trim() ? 15 : 0;
  const proofScore = clamp((Number(proofCount) || 0) * 5, 0, 20);
  const completenessScore = clamp(detailScore + evidenceScore + witnessScore + proofScore, 5, 100);

  let riskLevel = 'High';
  if (completenessScore >= 70) riskLevel = 'Low';
  else if (completenessScore >= 40) riskLevel = 'Medium';

  const likelyOutcome =
    completenessScore >= 70
      ? 'Strong filing quality. Good chance of quick FIR and investigation progress.'
      : completenessScore >= 40
      ? 'Moderate filing quality. Add more evidence/witness details for stronger progression.'
      : 'Low filing quality. More concrete details and proof are recommended before escalation.';

  return {
    completenessScore,
    riskLevel,
    likelyOutcome,
    recommendations: [
      'Keep original evidence safe and untouched.',
      'Add timeline with exact dates/time if possible.',
      'Attach witness names/contact details.',
      'Record every police update for follow-up.',
    ],
  };
};

const generateLegalComplaintDraft = ({
  name = '',
  phone = '',
  email = '',
  trackingId = '',
  caseType = '',
  location = '',
  summary = '',
  nearestPoliceStation = '',
  preferredLanguage = 'english',
}) => {
  const date = new Date().toISOString().slice(0, 10);
  const lang = String(preferredLanguage || '').toLowerCase();

  if (lang === 'hindi') {
    return [
      'विषय: विधिक शिकायत प्रारूप',
      '',
      'सेवा में,',
      'स्टेशन हाउस अधिकारी,',
      nearestPoliceStation || 'संबंधित पुलिस थाना,',
      '',
      `दिनांक: ${date}`,
      '',
      `मैं, ${name || '[आपका नाम]'}, विनम्रतापूर्वक यह शिकायत पंजीकरण और जांच हेतु प्रस्तुत करता/करती हूं।`,
      `ट्रैकिंग आईडी: ${trackingId || '[Tracking ID]'}`,
      `मामले का प्रकार: ${caseType || '[Case Type]'}`,
      location ? `घटना स्थल: ${location}` : '',
      '',
      `शिकायत सारांश: ${summary || '[Summary]'}`,
      '',
      'प्रार्थना:',
      '- कृपया विधि अनुसार इस शिकायत/एफआईआर को दर्ज करें।',
      '- सभी प्रासंगिक साक्ष्यों का संरक्षण करते हुए जांच शुरू करें।',
      '- मामले की प्रगति और अगली कानूनी कार्यवाही की जानकारी दें।',
      '',
      `संपर्क: ${phone || '[Phone]'} | ${email || '[Email]'}`,
      '',
      'मेरी जानकारी के अनुसार उपरोक्त तथ्य सत्य हैं।',
      '',
      'कृपया यथाशीघ्र आवश्यक कार्यवाही करें।',
      '',
      'भवदीय,',
      `${name || '[आपका नाम]'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (lang === 'marathi') {
    return [
      'विषय: कायदेशीर तक्रार मसुदा',
      '',
      'प्रति,',
      'स्टेशन हाउस ऑफिसर,',
      nearestPoliceStation || 'संबंधित पोलीस ठाणे,',
      '',
      `दिनांक: ${date}`,
      '',
      `मी, ${name || '[तुमचे नाव]'}, नोंदणी आणि तपासणीसाठी ही कायदेशीर तक्रार सादर करीत आहे.`,
      `ट्रॅकिंग आयडी: ${trackingId || '[Tracking ID]'}`,
      `प्रकरणाचा प्रकार: ${caseType || '[Case Type]'}`,
      location ? `घटनेचे ठिकाण: ${location}` : '',
      '',
      `तक्रारीचा सारांश: ${summary || '[Summary]'}`,
      '',
      'विनंती:',
      '- कृपया कायद्यानुसार ही तक्रार/एफआयआर नोंदवा.',
      '- संबंधित पुरावे जतन करून तपास सुरू करा.',
      '- प्रकरणाची प्रगती आणि पुढील कायदेशीर पावले कळवा.',
      '',
      `संपर्क: ${phone || '[Phone]'} | ${email || '[Email]'}`,
      '',
      'वरील माहिती माझ्या माहितीनुसार खरी आहे.',
      '',
      'कृपया लवकरात लवकर आवश्यक कारवाई करावी.',
      '',
      'आपला नम्र,',
      `${name || '[तुमचे नाव]'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (lang === 'tamil') {
    return [
      'பொருள்: சட்ட புகார் வரைவு',
      '',
      'அனுப்புவது:',
      'ஸ்டேஷன் ஹவுஸ் அதிகாரி,',
      nearestPoliceStation || 'சம்பந்தப்பட்ட காவல் நிலையம்,',
      '',
      `தேதி: ${date}`,
      '',
      `நான், ${name || '[உங்கள் பெயர்]'}, பதிவு மற்றும் விசாரணைக்காக இந்த சட்ட புகாரை சமர்ப்பிக்கிறேன்.`,
      `டிராக்கிங் ஐடி: ${trackingId || '[Tracking ID]'}`,
      `வழக்கின் வகை: ${caseType || '[Case Type]'}`,
      location ? `நிகழ்வு இடம்: ${location}` : '',
      '',
      `புகார் சுருக்கம்: ${summary || '[Summary]'}`,
      '',
      'வேண்டுகோள்:',
      '- சட்டப்படி இந்த புகார்/எஃப்ஐஆர்-ஐ பதிவு செய்யவும்.',
      '- தொடர்புடைய சான்றுகளை பாதுகாத்து விசாரணையை தொடங்கவும்.',
      '- வழக்கின் முன்னேற்றம் மற்றும் அடுத்தடுத்த சட்ட நடவடிக்கைகளை தெரிவிக்கவும்.',
      '',
      `தொடர்பு: ${phone || '[Phone]'} | ${email || '[Email]'}`,
      '',
      'மேலே உள்ள தகவல்கள் எனது அறிவிற்கு உண்மையானவை.',
      '',
      'தயவுசெய்து உடனடி நடவடிக்கை எடுக்கவும்.',
      '',
      'நன்றி,',
      `${name || '[உங்கள் பெயர்]'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (lang === 'telugu') {
    return [
      'విషయం: చట్టపరమైన ఫిర్యాదు ముసాయిదా',
      '',
      'కు,',
      'స్టేషన్ హౌస్ ఆఫీసర్ గారికి,',
      nearestPoliceStation || 'సంబంధిత పోలీస్ స్టేషన్,',
      '',
      `తేదీ: ${date}`,
      '',
      `నేను, ${name || '[మీ పేరు]'}, నమోదు మరియు దర్యాప్తు కోసం ఈ చట్టపరమైన ఫిర్యాదును సమర్పిస్తున్నాను.`,
      `ట్రాకింగ్ ఐడి: ${trackingId || '[Tracking ID]'}`,
      `కేసు రకం: ${caseType || '[Case Type]'}`,
      location ? `సంఘటన స్థలం: ${location}` : '',
      '',
      `ఫిర్యాదు సారాంశం: ${summary || '[Summary]'}`,
      '',
      'వినతి:',
      '- చట్టం ప్రకారం ఈ ఫిర్యాదు/ఎఫ్‌ఐఆర్ నమోదు చేయండి.',
      '- సంబంధిత సాక్ష్యాలను భద్రపరచి దర్యాప్తు ప్రారంభించండి.',
      '- కేసు పురోగతి మరియు తదుపరి చట్టపరమైన చర్యలను తెలియజేయండి.',
      '',
      `సంప్రదింపు: ${phone || '[Phone]'} | ${email || '[Email]'}`,
      '',
      'పైన తెలిపిన వివరాలు నా తెలిసిన మేరకు నిజమైనవి.',
      '',
      'దయచేసి త్వరితగతిన అవసరమైన చర్యలు తీసుకోవాలి.',
      '',
      'భవదీయుడు/భవదీయురాలు,',
      `${name || '[మీ పేరు]'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'Subject: Legal Complaint Draft',
    '',
    'To,',
    'Station House Officer,',
    nearestPoliceStation || 'Concerned Police Station,',
    '',
    `Date: ${date}`,
    '',
    `I, ${name || '[Your Name]'}, respectfully submit this legal complaint for registration and investigation.`,
    `Tracking ID: ${trackingId || '[Tracking ID]'}`,
    `Case Type: ${caseType || '[Case Type]'}`,
    location ? `Incident Location: ${location}` : '',
    '',
    `Complaint Summary: ${summary || '[Summary]'}`,
    '',
    'Prayer:',
    '- Kindly register this complaint/FIR as applicable under law.',
    '- Initiate investigation and preserve all relevant evidence.',
    '- Keep me informed of case progress and next legal steps.',
    '',
    `Contact: ${phone || '[Phone]'} | ${email || '[Email]'}`,
    '',
    'I confirm the above facts are true to the best of my knowledge.',
    '',
    'Kindly acknowledge and take necessary action at the earliest.',
    '',
    'Regards,',
    `${name || '[Your Name]'}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const buildCaseNumber = () => {
  const year = new Date().getFullYear();
  const seed = `${Date.now()}`.slice(-6);
  return `CASE-${year}-${seed}`;
};

const buildTrackingId = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TRK-${year}-${random}`;
};

const buildProtectedId = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `PID-${year}-${random}`;
};

const getNearestPoliceStation = (pincode) => {
  if (!pincode) return 'Nearest police station to be assigned';
  return PINCODE_STATION_MAP[pincode] || 'Nearest police station to be assigned';
};

const getLocalizedComplaintSuccessMessage = (preferredLanguage = 'english') => {
  const lang = String(preferredLanguage || '').toLowerCase();
  if (lang === 'hindi') return 'शिकायत सफलतापूर्वक दर्ज की गई';
  if (lang === 'marathi') return 'तक्रार यशस्वीपणे नोंदवली गेली';
  if (lang === 'tamil') return 'புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது';
  if (lang === 'telugu') return 'ఫిర్యాదు విజయవంతంగా నమోదు చేయబడింది';
  return 'Complaint filed successfully';
};

const sanitizeProtectedCaseForPolice = (caseData) => {
  if (!caseData?.is_protected_case) return caseData;
  return {
    ...caseData,
    complainant_name: 'Protected Identity',
    complainant_email: null,
    complainant_phone: null,
    complaint_form_json: null,
  };
};

const canAccessCase = (caseData, user) => {
  if (!caseData || !user) return false;
  if (user.userType === 'admin') return true;
  if (user.userType === 'police') {
    // Police can view assigned cases and unassigned incoming complaints.
    return !caseData.assigned_police_id || caseData.assigned_police_id === user.id || caseData.created_by === user.id;
  }
  if (user.userType === 'lawyer') {
    return caseData.assigned_lawyer_id === user.id;
  }
  return false;
};

const getCaseById = async (caseId) => {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle();

  return { data, error };
};

const logCaseActivity = async (caseId, userId, activityType, description) => {
  const { error } = await supabase
    .from('case_activities')
    .insert({
      case_id: caseId,
      user_id: userId,
      activity_type: activityType,
      description,
    });

  if (error) {
    console.error('Case activity log error:', error);
  }
};

// Public: nearest police station by pincode
router.get('/public/police-station/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: 'Invalid pincode' });
    }
    const station = getNearestPoliceStation(pincode);
    res.json({ pincode, nearestPoliceStation: station });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public: track complaint by tracking ID
router.get('/public/track/:trackingId', async (req, res) => {
  try {
    const trackingId = normalizeTrackingId(req.params.trackingId);

    const { data: caseData, error } = await supabase
      .from('cases')
      .select('*')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (error) throw error;
    if (!caseData) return res.status(404).json({ error: 'Tracking ID not found' });

    const { data: activities, error: activityError } = await supabase
      .from('case_activities')
      .select('activity_type, description, created_at')
      .eq('case_id', caseData.id)
      .order('created_at', { ascending: false });

    if (activityError) throw activityError;

    res.json({
      tracking: {
        trackingId: caseData.tracking_id,
        caseNumber: caseData.case_number,
        title: caseData.title,
        caseType: caseData.case_type,
        status: caseData.status,
        progressPercent: caseData.progress_percent || 0,
        progressNotes: caseData.progress_notes || null,
        firNumber: caseData.fir_number || null,
        firRegisteredAt: caseData.fir_registered_at || null,
        caseStrength: caseData.case_strength || 0,
        complaintSummary: caseData.complaint_summary || null,
        caseAnalysis: caseData.case_analysis || null,
        escalationDraft: caseData.escalation_draft || null,
        legalDraft: caseData.escalation_draft || null,
        isProtectedCase: !!caseData.is_protected_case,
        protectedId: caseData.protected_reference_id || null,
        pincode: caseData.complainant_pincode || null,
        nearestPoliceStation: caseData.nearest_police_station || null,
        createdAt: caseData.created_at,
        updatedAt: caseData.updated_at,
      },
      activities: activities || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public: download legal draft as PDF by tracking ID
router.get('/public/draft-pdf/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { data: caseData, error } = await supabase
      .from('cases')
      .select('tracking_id, escalation_draft')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (error) throw error;
    if (!caseData) return res.status(404).json({ error: 'Tracking ID not found' });
    if (!caseData.escalation_draft) return res.status(404).json({ error: 'Legal draft not available' });

    const pdfBuffer = buildPdfBuffer({
      title: `Legal Complaint Draft - ${caseData.tracking_id}`,
      lines: String(caseData.escalation_draft).split('\n'),
    });

    const safeTracking = String(caseData.tracking_id || 'draft').replace(/[^A-Za-z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"legal-draft-${safeTracking}.pdf\"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Public: file complaint (creates case in Supabase)
router.post('/public/complaints', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      location,
      caseType,
      description,
      evidence = '',
      proofCount = 0,
      incidentDate = null,
      incidentTime = null,
      accusedName = null,
      witnessDetails = null,
      urgencyLevel = null,
      preferredLanguage = null,
      pincode = null,
      isProtectedCase = false,
    } = req.body;

    if (!name || !email || !phone || !location || !caseType || !description || !pincode) {
      return res.status(400).json({ error: 'Missing required complaint fields' });
    }
    if (!/^\d{6}$/.test(String(pincode))) {
      return res.status(400).json({ error: 'Pincode must be 6 digits' });
    }

    const caseNumber = buildCaseNumber();
    const trackingId = buildTrackingId();
    const protectedReferenceId = isProtectedCase ? buildProtectedId() : null;
    const nearestPoliceStation = getNearestPoliceStation(String(pincode));
    const caseStrength = calculateCaseStrength({ description, evidence, proofCount: Number(proofCount) || 0 });
    const complaintSummary = buildComplaintSummary({
      caseType,
      description,
      location,
      incidentDate,
      incidentTime,
      accusedName,
    });
    const caseAnalysis = generateCaseAnalysis({ description, evidence, proofCount, witnessDetails });
    const legalDraft = generateLegalComplaintDraft({
      name,
      phone,
      email,
      trackingId,
      caseType,
      location,
      summary: complaintSummary,
      nearestPoliceStation,
      preferredLanguage,
    });
    const complaintFormSnapshot = {
      name,
      email,
      phone,
      location,
      caseType,
      description,
      evidence,
      proofCount: Number(proofCount) || 0,
      incidentDate,
      incidentTime,
      accusedName,
      witnessDetails,
      urgencyLevel,
      preferredLanguage,
      pincode,
      isProtectedCase,
      protectedReferenceId,
      nearestPoliceStation,
      submittedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        tracking_id: trackingId,
        title: `${caseType} complaint`,
        description,
        case_type: caseType,
        status: 'open',
        created_by: null,
        assigned_lawyer_id: null,
        assigned_police_id: null,
        complainant_name: name,
        complainant_email: email,
        complainant_phone: phone,
        complainant_location: location,
        complainant_pincode: String(pincode),
        nearest_police_station: nearestPoliceStation,
        evidence_text: evidence || null,
        proof_count: Number(proofCount) || 0,
        case_strength: caseStrength,
        complaint_summary: complaintSummary,
        complaint_form_json: complaintFormSnapshot,
        case_analysis: caseAnalysis,
        escalation_draft: legalDraft,
        incident_date: incidentDate,
        incident_time: incidentTime,
        accused_name: accusedName,
        witness_details: witnessDetails,
        urgency_level: urgencyLevel,
        preferred_language: preferredLanguage,
        is_protected_case: Boolean(isProtectedCase),
        protected_reference_id: protectedReferenceId,
        progress_percent: 10,
        progress_notes: `Complaint submitted successfully. Waiting for police review at ${nearestPoliceStation}.`,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: getLocalizedComplaintSuccessMessage(preferredLanguage),
      complaint: {
        id: data.id,
        caseNumber,
        trackingId,
        caseStrength,
        complaintSummary,
        caseAnalysis,
        escalationDraft: legalDraft,
        legalDraft,
        fullFormSaved: true,
        protectedId: protectedReferenceId,
        nearestPoliceStation,
        status: data.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Police inbox: unassigned complaints + police's assigned cases
router.get('/police/inbox', authenticateToken, requireRoles('admin', 'police'), async (req, res) => {
  try {
    let query = supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.user.userType === 'police') {
      query = query.or(
        `assigned_police_id.eq.${req.user.id},and(assigned_police_id.is.null,status.in.(open,pending))`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const sanitized = (data || []).map((caseItem) =>
      req.user.userType === 'police' ? sanitizeProtectedCaseForPolice(caseItem) : caseItem
    );

    res.json({ cases: sanitized });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIR + progress update (Admin/Police)
router.put('/:id/fir', authenticateToken, requireRoles('admin', 'police'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firNumber, progressPercent, progressNotes, status } = req.body;

    const { data: caseData, error: findError } = await getCaseById(id);
    if (findError) throw findError;
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    if (
      req.user.userType === 'police' &&
      caseData.assigned_police_id &&
      caseData.assigned_police_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'Case assigned to another police officer' });
    }

    const nextProgress = typeof progressPercent === 'number'
      ? clamp(progressPercent, 0, 100)
      : clamp(caseData.progress_percent || 0, 0, 100);

    const nextStatus = status || (nextProgress >= 100 ? 'resolved' : 'pending');

    const payload = {
      assigned_police_id:
        req.user.userType === 'police'
          ? caseData.assigned_police_id || req.user.id
          : caseData.assigned_police_id,
      fir_number: firNumber || caseData.fir_number || null,
      fir_registered_at: firNumber ? new Date().toISOString() : caseData.fir_registered_at,
      progress_percent: nextProgress,
      progress_notes: progressNotes || caseData.progress_notes || null,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('cases')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logCaseActivity(
      id,
      req.user.id,
      'fir_progress_updated',
      `FIR/Progress updated${firNumber ? ` (FIR: ${firNumber})` : ''}; progress ${nextProgress}%`
    );

    const responseCase = req.user.userType === 'police' ? sanitizeProtectedCaseForPolice(data) : data;
    res.json({ message: 'FIR/progress updated', case: responseCase });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new case (Police/Admin authenticated flow)
router.post('/', authenticateToken, requireRoles('admin', 'police'), async (req, res) => {
  try {
    const {
      title,
      description,
      caseType,
      status = 'open',
      assignedLawyerId = null,
      assignedPoliceId = null,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const caseNumber = buildCaseNumber();
    const trackingId = buildTrackingId();

    const { data, error } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        tracking_id: trackingId,
        title,
        description: description || null,
        case_type: caseType || null,
        status,
        created_by: req.user.id,
        assigned_lawyer_id: assignedLawyerId,
        assigned_police_id: assignedPoliceId || (req.user.userType === 'police' ? req.user.id : null),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await logCaseActivity(data.id, req.user.id, 'case_created', `Case ${caseNumber} created`);

    res.status(201).json({
      message: 'Case created successfully',
      case: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cases for current user
router.get('/', authenticateToken, requireRoles('admin', 'police', 'lawyer'), async (req, res) => {
  try {
    const { status, caseType, search } = req.query;
    let query = supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.user.userType === 'police') {
      query = query.or(`assigned_police_id.eq.${req.user.id},created_by.eq.${req.user.id}`);
    } else if (req.user.userType === 'lawyer') {
      query = query.eq('assigned_lawyer_id', req.user.id);
    }

    if (status) query = query.eq('status', status);
    if (caseType) query = query.eq('case_type', caseType);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ cases: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get one case with access control
router.get('/:id', authenticateToken, requireRoles('admin', 'police', 'lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { data: caseData, error } = await getCaseById(id);

    if (error) throw error;
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (!canAccessCase(caseData, req.user)) return res.status(403).json({ error: 'Unauthorized' });

    const responseCase = req.user.userType === 'police' ? sanitizeProtectedCaseForPolice(caseData) : caseData;
    res.json({ case: responseCase });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign case members (Admin only)
router.put('/:id/assign', authenticateToken, requireRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedLawyerId = null, assignedPoliceId = null } = req.body;

    const { data: existingCase, error: findError } = await getCaseById(id);
    if (findError) throw findError;
    if (!existingCase) return res.status(404).json({ error: 'Case not found' });

    const { data, error } = await supabase
      .from('cases')
      .update({
        assigned_lawyer_id: assignedLawyerId,
        assigned_police_id: assignedPoliceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logCaseActivity(id, req.user.id, 'case_assigned', 'Case assignment updated');

    res.json({ message: 'Case assignment updated', case: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update case status (Admin/Assigned Police/Assigned Lawyer)
router.put('/:id/status', authenticateToken, requireRoles('admin', 'police', 'lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progressPercent, progressNotes } = req.body;

    const allowedStatuses = ['open', 'closed', 'pending', 'resolved'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: caseData, error: findError } = await getCaseById(id);
    if (findError) throw findError;
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (!canAccessCase(caseData, req.user)) return res.status(403).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('cases')
      .update({
        status,
        progress_percent: typeof progressPercent === 'number' ? clamp(progressPercent, 0, 100) : caseData.progress_percent,
        progress_notes: progressNotes || caseData.progress_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logCaseActivity(id, req.user.id, 'status_updated', `Case status changed to ${status}`);

    res.json({ message: 'Case status updated', case: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add case document metadata (Admin/Assigned Police/Assigned Lawyer)
router.post('/:id/documents', authenticateToken, requireRoles('admin', 'police', 'lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, fileUrl, documentType } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const { data: caseData, error: findError } = await getCaseById(id);
    if (findError) throw findError;
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (!canAccessCase(caseData, req.user)) return res.status(403).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('case_documents')
      .insert({
        case_id: id,
        file_name: fileName,
        file_url: fileUrl || null,
        document_type: documentType || 'general',
        uploaded_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await logCaseActivity(id, req.user.id, 'document_uploaded', `Document uploaded: ${fileName}`);

    res.status(201).json({ message: 'Document added', document: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get case documents
router.get('/:id/documents', authenticateToken, requireRoles('admin', 'police', 'lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { data: caseData, error: findError } = await getCaseById(id);
    if (findError) throw findError;
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (!canAccessCase(caseData, req.user)) return res.status(403).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('case_documents')
      .select('*')
      .eq('case_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ documents: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get case activities
router.get('/:id/activities', authenticateToken, requireRoles('admin', 'police', 'lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { data: caseData, error: findError } = await getCaseById(id);
    if (findError) throw findError;
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    if (!canAccessCase(caseData, req.user)) return res.status(403).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('case_activities')
      .select('*')
      .eq('case_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ activities: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
