import express from 'express';
import { supabase } from '../server.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

const normalizeTrackingId = (value = '') => String(value).trim().toUpperCase();

const buildLawyerRequestTrackingId = () => {
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `LRT-${year}-${randomPart}`;
};

const generateUniqueLawyerTrackingId = async () => {
  for (let i = 0; i < 8; i += 1) {
    const candidate = buildLawyerRequestTrackingId();
    const { data, error } = await supabase
      .from('lawyer_requests')
      .select('id')
      .eq('request_tracking_id', candidate)
      .maybeSingle();

    if (!error && !data) return candidate;
  }

  throw new Error('Unable to generate unique tracking ID. Please retry.');
};

const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

const mapPublicLawyer = (u) => ({
  id: u.id,
  fullName: u.full_name || 'Lawyer',
  specialization: u.specialization || 'General',
  experienceYears: u.experience_years || 0,
  hourlyRate: u.hourly_rate || 0,
  city: u.city || '',
  state: u.state || '',
  barCouncil: u.bar_council || '',
  bio: u.bio || '',
  approvalStatus: u.approval_status || 'pending',
});

router.get('/public/lawyers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, specialization, experience_years, hourly_rate, city, state, bar_council, bio, approval_status, user_type')
      .eq('user_type', 'lawyer')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const lawyers = (data || []).map(mapPublicLawyer);
    const bySpecialization = lawyers.reduce((acc, l) => {
      const key = l.specialization || 'General';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      count: lawyers.length,
      lawyers,
      specializationSummary: bySpecialization,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/public/requests', async (req, res) => {
  try {
    const {
      lawyerId,
      name,
      email,
      phone,
      city,
      caseNumber,
      caseTrackingId,
      message,
    } = req.body;

    if (!lawyerId || !name || !phone || !message) {
      return res.status(400).json({ error: 'lawyerId, name, phone and message are required' });
    }

    const { data: lawyer, error: lawyerError } = await supabase
      .from('users')
      .select('id, user_type, approval_status')
      .eq('id', lawyerId)
      .single();

    if (lawyerError || !lawyer || lawyer.user_type !== 'lawyer' || lawyer.approval_status !== 'approved') {
      return res.status(400).json({ error: 'Selected lawyer is not available' });
    }

    let linkedCaseId = null;
    let linkedCaseTrackingId = null;
    if (caseTrackingId) {
      const { data: linkedCase, error: caseError } = await supabase
        .from('cases')
        .select('id, tracking_id')
        .eq('tracking_id', caseTrackingId)
        .maybeSingle();

      if (!caseError && linkedCase) {
        linkedCaseId = linkedCase.id;
        linkedCaseTrackingId = linkedCase.tracking_id;
      }
    }

    const requestTrackingId = await generateUniqueLawyerTrackingId();

    const { data, error } = await supabase
      .from('lawyer_requests')
      .insert({
        request_tracking_id: requestTrackingId,
        linked_case_id: linkedCaseId,
        linked_case_tracking_id: linkedCaseTrackingId,
        lawyer_id: lawyerId,
        requester_name: name,
        requester_email: email || null,
        requester_phone: phone,
        requester_city: city || null,
        requester_case_number: caseNumber || null,
        requester_message: message,
        status: 'pending',
        progress_percent: 0,
        progress_notes: 'Request submitted. Waiting for lawyer response.',
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Lawyer contact request submitted',
      request: {
        id: data.id,
        requestTrackingId: data.request_tracking_id,
        status: data.status,
        progressPercent: data.progress_percent,
        progressNotes: data.progress_notes,
        statusUrl: `/lawyer-help?tracking=${encodeURIComponent(data.request_tracking_id)}`,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/public/track/:trackingId', async (req, res) => {
  try {
    const trackingId = normalizeTrackingId(req.params.trackingId);
    const { data, error } = await supabase
      .from('lawyer_requests')
      .select(`
        id,
        request_tracking_id,
        linked_case_tracking_id,
        requester_name,
        requester_phone,
        status,
        progress_percent,
        progress_notes,
        lawyer_response_note,
        created_at,
        updated_at,
        users:lawyer_id(full_name, specialization, city, state, hourly_rate)
      `)
      .eq('request_tracking_id', trackingId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Tracking ID not found' });
    }

    res.json({
      tracking: {
        requestTrackingId: data.request_tracking_id,
        linkedCaseTrackingId: data.linked_case_tracking_id,
        requesterName: data.requester_name,
        requesterPhone: data.requester_phone,
        status: data.status,
        progressPercent: data.progress_percent || 0,
        progressNotes: data.progress_notes || '',
        lawyerResponseNote: data.lawyer_response_note || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lawyer: data.users || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/requests/me', authenticateToken, requireRoles('lawyer'), async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('lawyer_requests')
      .select('*')
      .eq('lawyer_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ requests: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/requests/:id/respond', authenticateToken, requireRoles('lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note = '' } = req.body;

    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'action must be accepted or rejected' });
    }

    const { data: existing, error: findError } = await supabase
      .from('lawyer_requests')
      .select('*')
      .eq('id', id)
      .eq('lawyer_id', req.user.id)
      .single();

    if (findError || !existing) return res.status(404).json({ error: 'Request not found' });

    const nextStatus = action === 'accepted' ? 'accepted' : 'rejected';
    const nextProgress = action === 'accepted' ? 15 : 0;
    const nextNotes =
      action === 'accepted'
        ? 'Lawyer accepted request. Initial consultation in progress.'
        : 'Lawyer rejected request.';

    const { data, error } = await supabase
      .from('lawyer_requests')
      .update({
        status: nextStatus,
        progress_percent: nextProgress,
        progress_notes: nextNotes,
        lawyer_response_note: note || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('lawyer_id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;

    if (action === 'accepted' && existing.linked_case_id) {
      await supabase
        .from('cases')
        .update({
          assigned_lawyer_id: req.user.id,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.linked_case_id);
    }

    res.json({ message: `Request ${nextStatus}`, request: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/requests/:id/progress', authenticateToken, requireRoles('lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { progressPercent, progressNotes, status } = req.body;

    const allowedStatuses = ['accepted', 'in_progress', 'completed', 'rejected'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: existing, error: findError } = await supabase
      .from('lawyer_requests')
      .select('*')
      .eq('id', id)
      .eq('lawyer_id', req.user.id)
      .single();
    if (findError || !existing) return res.status(404).json({ error: 'Request not found' });

    const nextProgress =
      typeof progressPercent === 'number'
        ? clamp(progressPercent, 0, 100)
        : existing.progress_percent || 0;

    const nextStatus = status || (nextProgress >= 100 ? 'completed' : existing.status || 'accepted');

    const { data, error } = await supabase
      .from('lawyer_requests')
      .update({
        progress_percent: nextProgress,
        progress_notes: progressNotes || existing.progress_notes || null,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('lawyer_id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;

    if (existing.linked_case_id) {
      await supabase
        .from('cases')
        .update({
          progress_percent: nextProgress,
          progress_notes: progressNotes || null,
          status: nextProgress >= 100 ? 'resolved' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.linked_case_id);
    }

    res.json({ message: 'Progress updated', request: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
