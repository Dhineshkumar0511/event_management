/**
 * Notification Service — WhatsApp (UltraMsg → whatsapp-web.js fallback) + SMS (Fast2SMS)
 *
 * Env vars required (add to .env):
 *   NOTIFY_CHANNEL=whatsapp        # 'whatsapp' | 'sms' | 'both' | 'none'
 *   ULTRAMSG_INSTANCE_ID=xxxx      # from app.ultramsg.com  (primary, optional)
 *   ULTRAMSG_TOKEN=xxxx            # if blank → falls back to whatsapp-web.js automatically
 *   FAST2SMS_API_KEY=xxxx          # from fast2sms.com
 *   NOTIFY_GROUP_ID=120363xxxxxxxx@g.us   # WhatsApp group chat ID for daily summary
 */

import pkg from 'whatsapp-web.js';
import QRCode from 'qrcode';

const { Client, LocalAuth } = pkg;

const CHANNEL = process.env.NOTIFY_CHANNEL || 'none';
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE_ID || '';
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || '';
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY || '';
const GROUP_ID = process.env.NOTIFY_GROUP_ID || '';

// ─── whatsapp-web.js client (lazy-init, only if UltraMsg is not configured) ──

let waClient = null;
let waReady = false;
let waInitialising = false;
let waQRDataURL = null;   // base64 PNG for web UI
let waQRString = null;    // raw QR string

/** Returns current WhatsApp connection status for the admin dashboard */
export function getWAStatus() {
  if (CHANNEL === 'none' || CHANNEL === 'sms') return { status: 'disabled' };
  if (ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN) return { status: 'ultramsg' };
  if (waReady) return { status: 'ready' };
  if (waQRDataURL) return { status: 'qr', qr: waQRDataURL };
  if (waInitialising) return { status: 'connecting' };
  return { status: 'not_started' };
}

export function initWAClient() {
  if (waClient || waInitialising) return;
  waInitialising = true;
  console.log('[Notify] UltraMsg not configured — initialising whatsapp-web.js fallback...');

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
  });

  waClient.on('qr', async (qr) => {
    waQRString = qr;
    try {
      waQRDataURL = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      console.log('[Notify] QR code ready — open HOD dashboard to scan');
    } catch (e) {
      console.warn('[Notify] QR image gen failed:', e.message);
    }
  });

  waClient.on('ready', () => {
    waReady = true;
    waQRDataURL = null;
    waQRString = null;
    console.log('[Notify] whatsapp-web.js ready — notifications enabled ✅');
  });

  waClient.on('disconnected', () => {
    waReady = false;
    waQRDataURL = null;
    waQRString = null;
    waClient = null;
    waInitialising = false;
    console.warn('[Notify] WhatsApp disconnected. Will reinitialise on next message.');
  });

  waClient.initialize().catch((err) => {
    console.warn('[Notify] whatsapp-web.js init error:', err.message);
    waClient = null;
    waInitialising = false;
  });
}

// Only spin up the WA client when WhatsApp channel is enabled but UltraMsg is not configured
if ((CHANNEL === 'whatsapp' || CHANNEL === 'both') && !ULTRAMSG_TOKEN) {
  initWAClient();
}

// ─── Low-level senders ────────────────────────────────────────────────────────

/**
 * Try UltraMsg first; if credentials missing or API fails → fallback to whatsapp-web.js
 */
async function sendWhatsApp(to, body) {
  // Primary: UltraMsg
  if (ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: ULTRAMSG_TOKEN, to, body }),
      });
      const data = await res.json();
      if (data.sent === 'true' || data.sent === true) return; // success
      console.warn('[Notify] UltraMsg rejected, falling back to whatsapp-web.js:', data);
    } catch (err) {
      console.warn('[Notify] UltraMsg error, falling back to whatsapp-web.js:', err.message);
    }
  }

  // Fallback: whatsapp-web.js
  if (!waClient) initWAClient();
  if (!waReady) {
    console.warn('[Notify] whatsapp-web.js not ready yet — message queued skip (scan QR to activate)');
    return;
  }
  try {
    // to is expected as "91XXXXXXXXXX" → convert to chatId "91XXXXXXXXXX@c.us"
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    await waClient.sendMessage(chatId, body);
  } catch (err) {
    console.warn('[Notify] whatsapp-web.js send error:', err.message);
  }
}

async function sendFast2SMS(numbers, message) {
  if (!FAST2SMS_KEY) return;
  const nums = Array.isArray(numbers) ? numbers.join(',') : numbers;
  if (!nums) return;
  try {
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_KEY}&sender_id=FSTSMS&message=${encodeURIComponent(message)}&language=english&route=p&numbers=${nums}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.return) console.warn('[Notify] Fast2SMS failed:', data);
  } catch (err) {
    console.warn('[Notify] Fast2SMS error:', err.message);
  }
}

/**
 * normalizePhone — strips non-digits, ensures Indian 91 prefix (10-digit → 9110digit)
 */
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits.length >= 10 ? digits : null;
}

/**
 * send — main dispatcher: tries WhatsApp and/or SMS based on NOTIFY_CHANNEL
 */
async function send(phone, message) {
  if (CHANNEL === 'none' || !phone) return;
  const num = normalizePhone(phone);
  if (!num) return;

  if (CHANNEL === 'whatsapp' || CHANNEL === 'both') {
    await sendWhatsApp(num, message);
  }
  if (CHANNEL === 'sms' || CHANNEL === 'both') {
    // Fast2SMS takes 10-digit number without country code
    await sendFast2SMS(num.replace(/^91/, ''), message);
  }
}

/**
 * sendGroup — send to a WhatsApp group
 * UltraMsg group ID format: 120363xxxxxxxx@g.us
 * whatsapp-web.js group ID format: same (xxxxxxxx@g.us)
 */
async function sendGroup(message) {
  if (!GROUP_ID || CHANNEL === 'none' || CHANNEL === 'sms') return;
  await sendWhatsApp(GROUP_ID, message);
}

// ─── High-level notification functions ───────────────────────────────────────

/**
 * Notify staff when a student submits an OD request
 * @param {object} student  - { name, phone, department }
 * @param {object} request  - { event_name, event_start_date, event_end_date, request_id }
 * @param {Array}  staffList - [{ phone }]
 */
export async function notifyODSubmitted(student, request, staffList = []) {
  const msg =
    `📋 *New OD Request*\n` +
    `Student: ${student.name} (${student.department})\n` +
    `Event: ${request.event_name}\n` +
    `Dates: ${fmtDate(request.event_start_date)} – ${fmtDate(request.event_end_date)}\n` +
    `ID: ${request.request_id}\n` +
    `Please review on EventPass portal.`;

  for (const s of staffList) {
    await send(s.phone, msg);
  }
}

/**
 * Notify student when staff approves (forwards to HOD)
 */
export async function notifyStaffApproved(student, request) {
  const msg =
    `✅ *OD Request: Staff Approved*\n` +
    `Hi ${student.name}, your OD request for *${request.event_name}* has been approved by your staff and forwarded to HOD for final approval.\n` +
    `Request ID: ${request.request_id || request.id}\nCheck EventPass for details.`;
  await send(student.phone, msg);
}

/**
 * Notify student when staff rejects
 */
export async function notifyStaffRejected(student, request, reason) {
  const msg =
    `❌ *OD Request: Rejected by Staff*\n` +
    `Hi ${student.name}, your OD request for *${request.event_name}* has been rejected.\n` +
    `Reason: ${reason || 'No reason provided'}\n` +
    `Request ID: ${request.request_id || request.id}`;
  await send(student.phone, msg);
}

/**
 * Notify student when HOD approves (final)
 */
export async function notifyHODApproved(student, request) {
  const msg =
    `🎉 *OD Request: APPROVED by HOD!*\n` +
    `Hi ${student.name}, congratulations! Your OD request for *${request.event_name}* has been fully approved.\n` +
    `You can download your OD letter from the EventPass portal.\n` +
    `Request ID: ${request.request_id || request.id}`;
  await send(student.phone, msg);
}

/**
 * Notify student when HOD rejects
 */
export async function notifyHODRejected(student, request, reason) {
  const msg =
    `❌ *OD Request: Rejected by HOD*\n` +
    `Hi ${student.name}, your OD request for *${request.event_name}* has been rejected by HOD.\n` +
    `Reason: ${reason || 'No reason provided'}\n` +
    `Request ID: ${request.request_id || request.id}`;
  await send(student.phone, msg);
}

// ─── Leave notifications ──────────────────────────────────────────────────────

/**
 * Notify staff when a student submits a leave request
 */
export async function notifyLeaveSubmitted(student, leave, staffList = []) {
  const msg =
    `📋 *New Leave Request*\n` +
    `Student: ${student.name} (${student.department})\n` +
    `Type: ${leave.leave_type?.replace('_', ' ')?.toUpperCase()}\n` +
    `Dates: ${fmtDate(leave.from_date)} – ${fmtDate(leave.to_date)} (${leave.days_count} day${leave.days_count > 1 ? 's' : ''})\n` +
    `Leave ID: ${leave.leave_id}\n` +
    `Please review on EventPass portal.`;

  for (const s of staffList) {
    await send(s.phone, msg);
  }
}

/**
 * Notify student on staff leave decision
 */
export async function notifyLeaveStaffDecision(student, leave, action, role, remarks) {
  const forwarded = role !== 'hod' && action === 'approve';
  const approved = action === 'approve';
  const msg = forwarded
    ? `✅ *Leave Request: Staff Approved*\n` +
      `Hi ${student.name}, your leave (${leave.leave_id}) has been approved by staff and forwarded to HOD.`
    : approved
    ? `✅ *Leave Request: Approved*\n` +
      `Hi ${student.name}, your leave (${leave.leave_id}) has been fully approved.`
    : `❌ *Leave Request: Rejected*\n` +
      `Hi ${student.name}, your leave (${leave.leave_id}) has been rejected.\n` +
      `${remarks ? 'Reason: ' + remarks : ''}`;
  await send(student.phone, msg);
}

/**
 * Notify student on HOD leave decision
 */
export async function notifyLeaveHODDecision(student, leave, action, remarks) {
  const msg = action === 'approve'
    ? `🎉 *Leave Request: Fully Approved by HOD!*\n` +
      `Hi ${student.name}, your leave (${leave.leave_id}) has been approved. Enjoy your leave!`
    : `❌ *Leave Request: Rejected by HOD*\n` +
      `Hi ${student.name}, your leave (${leave.leave_id}) has been rejected by HOD.\n` +
      `${remarks ? 'Reason: ' + remarks : ''}`;
  await send(student.phone, msg);
}

// ─── Group / Daily summary ────────────────────────────────────────────────────

/**
 * Send daily leave & OD summary to the configured WhatsApp group
 * @param {object} summary - { date, pendingOD, pendingLeave, approvedToday, rejectedToday }
 */
export async function sendDailyGroupSummary(summary) {
  const odStudents = summary.odStudents || [];
  const leaveStudents = summary.leaveStudents || [];

  // Build OD student list
  let odList = '';
  if (odStudents.length > 0) {
    odList = `\n\n🎓 *Students on OD Today (${odStudents.length}):*\n`;
    odStudents.forEach((s, i) => {
      const yr = s.year_of_study ? `Yr${s.year_of_study}` : '';
      const sec = s.section ? `-${s.section}` : '';
      odList += `  ${i + 1}. ${s.name} (${yr}${sec}) — ${s.event_name} [${fmtDate(s.event_start_date)} – ${fmtDate(s.event_end_date)}]\n`;
    });
  } else {
    odList = `\n\n🎓 *Students on OD Today:* None\n`;
  }

  // Build Leave student list
  let leaveList = '';
  if (leaveStudents.length > 0) {
    leaveList = `\n🏖️ *Students on Leave Today (${leaveStudents.length}):*\n`;
    leaveStudents.forEach((s, i) => {
      const yr = s.year_of_study ? `Yr${s.year_of_study}` : '';
      const sec = s.section ? `-${s.section}` : '';
      const type = s.leave_type ? s.leave_type.replace('_', ' ') : 'Leave';
      leaveList += `  ${i + 1}. ${s.name} (${yr}${sec}) — ${type} [${fmtDate(s.from_date)} – ${fmtDate(s.to_date)}, ${s.days_count}d]\n`;
    });
  } else {
    leaveList = `\n🏖️ *Students on Leave Today:* None\n`;
  }

  const msg =
    `📊 *EventPass Daily Summary — ${summary.date}*\n\n` +
    `📋 *OD Requests (Pending):*\n` +
    `  • Awaiting Staff Review: ${summary.pendingOD || 0}\n` +
    `  • Awaiting HOD Review: ${summary.pendingHODOD || 0}\n` +
    `  • Approved Today: ${summary.approvedODToday || 0}\n\n` +
    `🗓️ *Leave Requests (Pending):*\n` +
    `  • Awaiting Staff Review: ${summary.pendingLeave || 0}\n` +
    `  • Awaiting HOD Review: ${summary.pendingHODLeave || 0}\n` +
    `  • Approved Today: ${summary.approvedLeaveToday || 0}` +
    odList +
    leaveList +
    `\nLogin to EventPass portal to review pending requests.`;

  await sendGroup(msg);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return String(d); }
}
