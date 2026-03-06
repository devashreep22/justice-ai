import express from 'express';
import { supabase } from '../server.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const calculateCaseStrength = ({ description = '', evidence = '', proofCount = 0 }) => {
  const descriptionScore = clamp(Math.floor(description.trim().length / 12), 0, 55);
  const evidenceScore = evidence.trim().length > 0 ? clamp(Math.floor(evidence.trim().length / 20), 0, 25) : 0;
  const proofScore = clamp(proofCount * 8, 0, 20);
  return clamp(descriptionScore + evidenceScore + proofScore, 5, 95);
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

// Public: track complaint by tracking ID
router.get('/public/track/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;

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
        createdAt: caseData.created_at,
        updatedAt: caseData.updated_at,
      },
      activities: activities || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    } = req.body;

    if (!name || !email || !phone || !location || !caseType || !description) {
      return res.status(400).json({ error: 'Missing required complaint fields' });
    }

    const caseNumber = buildCaseNumber();
    const trackingId = buildTrackingId();
    const caseStrength = calculateCaseStrength({ description, evidence, proofCount: Number(proofCount) || 0 });

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
        evidence_text: evidence || null,
        proof_count: Number(proofCount) || 0,
        case_strength: caseStrength,
        progress_percent: 10,
        progress_notes: 'Complaint submitted successfully. Waiting for police review.',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Complaint filed successfully',
      complaint: {
        id: data.id,
        caseNumber,
        trackingId,
        caseStrength,
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

    res.json({ cases: data || [] });
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

    res.json({ message: 'FIR/progress updated', case: data });
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

    res.json({ case: caseData });
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
