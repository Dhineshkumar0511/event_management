import express from 'express';
import { authenticate, isStaffOrHOD } from '../middleware/auth.js';
import pool from '../database/connection.js';

const router = express.Router();

// Sign OD letter (staff or HOD)
router.put('/:id/sign', authenticate, isStaffOrHOD, async (req, res) => {
  try {
    const { id } = req.params;
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Signature data is required.' });
    }

    // Validate the request exists
    const [requests] = await pool.query('SELECT id, status FROM od_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found.' });
    }

    // SECURITY FIX: Use safe column name mapping instead of concatenation (prevent SQL injection)
    const columnMap = {
      'hod': 'hod_signature',
      'staff': 'staff_signature'
    };
    const col = columnMap[req.user.role];
    
    // Validate role-based access
    if (!col) {
      return res.status(403).json({ success: false, message: 'Invalid user role for signing.' });
    }

    await pool.query(`UPDATE od_requests SET ${col} = ? WHERE id = ?`, [signature, id]);

    res.json({ success: true, message: 'Signature saved successfully.' });
  } catch (error) {
    console.error('Sign letter error:', error);
    res.status(500).json({ success: false, message: 'Failed to save signature.' });
  }
});

export default router;
