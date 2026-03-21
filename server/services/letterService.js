import PDFDocument from 'pdfkit';
import pool from '../database/connection.js';
import { cloudinary } from '../middleware/upload.js';

/**
 * Generate OD Letter PDF
 */
export const generateODLetter = async (odRequestId) => {
  // Fetch OD request details
  const [requests] = await pool.query(
    `SELECT od.*, 
            u.name as student_name, u.employee_id as register_number,
            u.email as student_email, u.phone as student_phone,
            u.department, u.year_of_study, u.section,
            s.name as staff_name,
            h.name as hod_name
     FROM od_requests od
     JOIN users u ON od.student_id = u.id
     LEFT JOIN users s ON od.staff_id = s.id
     LEFT JOIN users h ON od.hod_id = h.id
     WHERE od.id = ?`,
    [odRequestId]
  );

  if (requests.length === 0) {
    throw new Error('OD request not found');
  }

  const request = requests[0];

  // Fetch team members
  const [teamMembers] = await pool.query(
    'SELECT * FROM team_members WHERE od_request_id = ?',
    [odRequestId]
  );

  // Create PDF and upload to Cloudinary
  const publicId = `OD_${request.request_id}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 }
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'eventpass/letters', resource_type: 'raw', public_id: publicId, format: 'pdf' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    doc.pipe(uploadStream);

    // Header
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('COLLEGE NAME', { align: 'center' });
    
    doc.fontSize(12)
       .font('Helvetica')
       .text('Department of ' + request.department, { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(10)
       .text('Address Line 1, City - Pincode', { align: 'center' });

    // Horizontal line
    doc.moveDown();
    doc.moveTo(60, doc.y)
       .lineTo(535, doc.y)
       .stroke();
    
    doc.moveDown(2);

    // Title
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('ON-DUTY PERMISSION LETTER', { align: 'center', underline: true });
    
    doc.moveDown(2);

    // Reference and Date
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Ref. No: ${request.request_id}`, { align: 'left' });
    
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
    
    doc.moveDown(2);

    // To section
    doc.font('Helvetica-Bold')
       .text('To Whom It May Concern,');
    
    doc.moveDown();

    // Body
    doc.font('Helvetica')
       .text(`This is to certify that `, { continued: true })
       .font('Helvetica-Bold')
       .text(`${request.student_name}`, { continued: true })
       .font('Helvetica')
       .text(`, bearing Register Number `, { continued: true })
       .font('Helvetica-Bold')
       .text(`${request.register_number}`, { continued: true })
       .font('Helvetica')
       .text(`, a student of ${getYearSuffix(request.year_of_study)} Year, Section ${request.section}, Department of ${request.department}, is granted On-Duty permission to attend the following event:`);

    doc.moveDown(2);

    // Event Details Box
    const boxStart = doc.y;
    doc.rect(60, boxStart, 475, 120).stroke();
    
    doc.moveDown(0.5);
    doc.x = 70;

    doc.font('Helvetica-Bold').text('Event Details:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica');
    
    const detailsStartX = 80;
    const labelWidth = 120;

    const addDetail = (label, value) => {
      doc.font('Helvetica-Bold').text(`${label}:`, detailsStartX, doc.y, { continued: true, width: labelWidth });
      doc.font('Helvetica').text(` ${value || 'N/A'}`, { width: 340 });
    };

    addDetail('Event Name', request.event_name);
    addDetail('Event Type', request.event_type.charAt(0).toUpperCase() + request.event_type.slice(1));
    addDetail('Venue', request.venue);
    addDetail('Location', `${request.location_city || ''}, ${request.location_state || ''}`);
    addDetail('Duration', `${formatDate(request.event_start_date)} to ${formatDate(request.event_end_date)}`);
    addDetail('Organizer', request.organizer_name);

    doc.y = boxStart + 130;
    doc.moveDown();

    // Team Members
    if (teamMembers.length > 1) {
      doc.font('Helvetica-Bold')
         .text('Team Members:');
      doc.moveDown(0.5);
      
      doc.font('Helvetica');
      teamMembers.forEach((member, index) => {
        const leadText = member.is_team_lead ? ' (Team Lead)' : '';
        doc.text(`${index + 1}. ${member.name} - ${member.register_number || 'N/A'}, ${member.department}, Year ${member.year_of_study}${leadText}`);
      });
      
      doc.moveDown();
    }

    // Parent Contact
    doc.font('Helvetica-Bold')
       .text('Parent/Guardian Contact:');
    doc.font('Helvetica')
       .text(`${request.parent_name} - ${request.parent_phone}`);
    
    if (request.emergency_contact) {
      doc.text(`Emergency Contact: ${request.emergency_contact}`);
    }

    doc.moveDown(2);

    // Approval Note
    doc.font('Helvetica')
       .text('The student is permitted to be absent from regular classes during the above-mentioned period for attending this event. Kindly grant the necessary permission.');

    doc.moveDown(3);

    // Signatures
    const sigY = doc.y;
    
    // Staff signature (left)
    doc.font('Helvetica-Bold')
       .text('Class Advisor/Staff', 60, sigY);
    doc.moveDown(2);
    doc.font('Helvetica')
       .text(request.staff_name || '_________________', 60);
    doc.text(`Date: ${request.staff_reviewed_at ? formatDate(request.staff_reviewed_at) : '_________'}`, 60);

    // HOD signature (right)
    doc.font('Helvetica-Bold')
       .text('Head of Department', 380, sigY);
    doc.y = sigY;
    doc.moveDown(2);
    doc.font('Helvetica')
       .text(request.hod_name || '_________________', 380);
    doc.text(`Date: ${request.hod_reviewed_at ? formatDate(request.hod_reviewed_at) : '_________'}`, 380);

    doc.moveDown(4);

    // Footer
    doc.fontSize(8)
       .fillColor('gray')
       .text('This is a computer-generated document.', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.text(`Request ID: ${request.request_id}`, { align: 'center' });

    // Finalize
    doc.end();
  });
};

/**
 * Generate approval/rejection letter
 */
export const generateStatusLetter = async (odRequestId, status, comments) => {
  const [requests] = await pool.query(
    `SELECT od.*, u.name as student_name, u.employee_id as register_number, u.department
     FROM od_requests od
     JOIN users u ON od.student_id = u.id
     WHERE od.id = ?`,
    [odRequestId]
  );

  if (requests.length === 0) {
    throw new Error('OD request not found');
  }

  const request = requests[0];
  const publicId = `${status.toUpperCase()}_${request.request_id}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 }
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'eventpass/letters', resource_type: 'raw', public_id: publicId, format: 'pdf' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    doc.pipe(uploadStream);

    // Header
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('COLLEGE NAME', { align: 'center' });
    
    doc.fontSize(12)
       .font('Helvetica')
       .text('Department of ' + request.department, { align: 'center' });

    doc.moveDown(2);

    // Title
    const titleText = status === 'approved' 
      ? 'OD REQUEST - APPROVED' 
      : 'OD REQUEST - REJECTED';
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(status === 'approved' ? 'green' : 'red')
       .text(titleText, { align: 'center' });

    doc.fillColor('black');
    doc.moveDown(2);

    // Content
    doc.font('Helvetica')
       .fontSize(11)
       .text(`Dear ${request.student_name},`);
    
    doc.moveDown();

    if (status === 'approved') {
      doc.text(`We are pleased to inform you that your OD request (Ref: ${request.request_id}) for attending "${request.event_name}" has been approved.`);
    } else {
      doc.text(`We regret to inform you that your OD request (Ref: ${request.request_id}) for attending "${request.event_name}" has been rejected.`);
    }

    if (comments) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Remarks:');
      doc.font('Helvetica').text(comments);
    }

    doc.moveDown(2);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);

    doc.end();
  });
};

// Helper functions
function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getYearSuffix(year) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = year % 100;
  return year + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

export default {
  generateODLetter,
  generateStatusLetter
};
