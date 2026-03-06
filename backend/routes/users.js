import express from 'express';
import { supabase } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const wrapText = (text = '', maxChars = 90) => {
  const words = String(text).replace(/\r/g, '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + ' ' + word).length <= maxChars) current += ` ${word}`;
    else {
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
  const allLines = [title || 'Report', '', ...(lines || [])];
  const wrapped = allLines.flatMap((line) => (line ? wrapText(line, 88) : ['']));
  const printableLines = wrapped.slice(0, 120);
  const contentParts = ['BT', '/F1 10 Tf', '45 790 Td'];
  for (const [index, line] of printableLines.entries()) {
    contentParts.push(`(${escapePdfText(line)}) Tj`);
    if (index < printableLines.length - 1) contentParts.push('0 -12 Td');
  }
  contentParts.push('ET');
  const contentStream = contentParts.join('\n');

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
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

// Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ users: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users by type (admin, lawyer, police)
router.get('/type/:userType', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { userType } = req.params;

    const validUserTypes = ['admin', 'lawyer', 'police'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', userType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ users: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download individual police/lawyer case report PDF (admin only)
router.get('/:id/report-pdf', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id,full_name,email,user_type,department,city')
      .eq('id', id)
      .single();
    if (userError) throw userError;
    if (!userData) return res.status(404).json({ error: 'User not found' });
    if (!['police', 'lawyer'].includes(userData.user_type)) {
      return res.status(400).json({ error: 'Reports are only supported for police and lawyer users' });
    }

    const assigneeColumn = userData.user_type === 'police' ? 'assigned_police_id' : 'assigned_lawyer_id';
    const { data: assignedCases, error: caseError } = await supabase
      .from('cases')
      .select('case_number,tracking_id,title,status,progress_percent,progress_notes,created_at,case_type')
      .eq(assigneeColumn, id)
      .order('created_at', { ascending: false });
    if (caseError) throw caseError;

    const cases = assignedCases || [];
    const pendingCount = cases.filter((c) => c.status === 'pending' || c.status === 'open').length;
    const resolvedCount = cases.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const inProgressCount = cases.filter((c) => !['resolved', 'closed', 'pending', 'open'].includes(String(c.status))).length;
    const averageProgress =
      cases.length > 0
        ? Math.round(cases.reduce((sum, c) => sum + Number(c.progress_percent || 0), 0) / cases.length)
        : 0;

    const lines = [
      `Generated At: ${new Date().toLocaleString()}`,
      `Officer/Lawyer: ${userData.full_name || 'N/A'}`,
      `Email: ${userData.email || 'N/A'}`,
      `Role: ${String(userData.user_type).toUpperCase()}`,
      `Department/City: ${userData.department || userData.city || 'N/A'}`,
      '',
      'Summary',
      `Total Assigned Cases: ${cases.length}`,
      `Pending/Open Cases: ${pendingCount}`,
      `In-Progress Cases: ${inProgressCount}`,
      `Resolved/Closed Cases: ${resolvedCount}`,
      `Average Progress: ${averageProgress}%`,
      '',
      'Case Details',
    ];

    if (cases.length === 0) {
      lines.push('No assigned cases found for this user.');
    } else {
      cases.slice(0, 70).forEach((item, index) => {
        lines.push(
          `${index + 1}. ${item.case_number || 'N/A'} | ${item.title || 'Untitled'}`,
          `   Tracking: ${item.tracking_id || 'N/A'} | Type: ${item.case_type || 'N/A'}`,
          `   Status: ${item.status || 'N/A'} | Progress: ${Number(item.progress_percent || 0)}% | Created: ${item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}`,
          `   Note: ${item.progress_notes || 'No latest notes'}`,
          ''
        );
      });
    }

    const pdfBuffer = buildPdfBuffer({
      title: `JusticeAI ${String(userData.user_type).toUpperCase()} Report`,
      lines,
    });

    const safeName = String(userData.full_name || userData.user_type || 'user').replace(/[^A-Za-z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${safeName}-${id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, address } = req.body;

    // Users can only update their own profile, admins can update anyone
    if (req.user.id !== id && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        phone,
        address,
        updated_at: new Date(),
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ message: 'User updated successfully', user: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user approval status (admin only)
router.put('/:id/approval-status', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { approvalStatus } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        approval_status: approvalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Approval status updated', user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
