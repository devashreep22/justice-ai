import express from 'express';
import { supabase } from '../server.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

const canAccessCase = (caseData, user) => {
  if (!caseData || !user) return false;
  if (user.userType === 'admin') return true;
  if (user.userType === 'police') {
    return caseData.assigned_police_id === user.id || caseData.created_by === user.id;
  }
  if (user.userType === 'lawyer') {
    return caseData.assigned_lawyer_id === user.id;
  }
  return false;
};

const buildCaseNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const seed = `${Date.now()}`.slice(-5);
  return `CASE-${year}-${seed}`;
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

// Create new case (Police/Admin)
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

    const { data, error } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
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

    res.json({ cases: data });
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
    const { status } = req.body;

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

    res.json({ documents: data });
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

    res.json({ activities: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
