/**
 * Notification Service — WhatsApp (WA Web preferred → UltraMsg fallback) + SMS (Fast2SMS)
 *
 * Env vars required (add to .env):
 *   NOTIFY_CHANNEL=whatsapp        # 'whatsapp' | 'sms' | 'both' | 'none'
 *   ULTRAMSG_INSTANCE_ID=xxxx      # from app.ultramsg.com  (fallback, optional)
 *   ULTRAMSG_TOKEN=xxxx            # UltraMsg token for API fallback
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
let GROUP_ID = process.env.NOTIFY_GROUP_ID || '';

// ─── Runtime config (controlled by HOD via API) ───────────────────────────────
let _autoEnabled = false;
export function setAutoEnabled(v) { _autoEnabled = !!v; }
export function isAutoEnabled() { return _autoEnabled; }
export function setGroupId(id) { if (id) GROUP_ID = id; }

// ─── whatsapp-web.js client ──────────────────────────────────────────────────

let waClient = null;
let waReady = false;
let waInitialising = false;
let waQRDataURL = null;   // base64 PNG for web UI
let waQRString = null;    // raw QR string
let waError = null;       // last error message
let waInitTimer = null;   // timeout for init

/** Returns current WhatsApp connection status for the admin dashboard */
export function getWAStatus() {
  const hasUltraMsg = !!(ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN);
  if (waReady) return { status: 'ready', ultramsgAvailable: hasUltraMsg };
  if (waQRDataURL) return { status: 'qr', qr: waQRDataURL, ultramsgAvailable: hasUltraMsg };
  if (waInitialising) return { status: 'connecting', ultramsgAvailable: hasUltraMsg };
  if (waError) return { status: 'error', error: waError, ultramsgAvailable: hasUltraMsg };
  return { status: hasUltraMsg ? 'ultramsg_only' : 'not_started', ultramsgAvailable: hasUltraMsg };
}

function resetWAClient() {
  clearTimeout(waInitTimer);
  if (waClient) {
    try { waClient.destroy(); } catch {}
  }
  waClient = null;
  waReady = false;
  waInitialising = false;
  waQRDataURL = null;
  waQRString = null;
  waError = null;
}

export function initWAClient(force = false) {
  if (force) resetWAClient();
  if (waClient || waInitialising) return;
  waInitialising = true;
  waError = null;
  console.log('[Notify] Initialising whatsapp-web.js client...');

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
  });

  // Timeout: if no QR and not ready after 120s, reset
  waInitTimer = setTimeout(() => {
    if (!waReady && !waQRDataURL) {
      console.warn('[Notify] WA client init timed out after 120s');
      waError = 'Connection timed out. Chromium may not be installed. Click Connect again to retry.';
      resetWAClient();
      waError = 'Connection timed out. Click Reconnect to try again.';
    }
  }, 120_000);

  waClient.on('qr', async (qr) => {
    clearTimeout(waInitTimer);
    waQRString = qr;
    try {
      waQRDataURL = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      console.log('[Notify] QR code ready');
    } catch (e) {
      console.warn('[Notify] QR image gen failed:', e.message);
    }
  });

  waClient.on('ready', () => {
    clearTimeout(waInitTimer);
    waReady = true;
    waQRDataURL = null;
    waQRString = null;
    waError = null;
    waInitialising = false;
    console.log('[Notify] whatsapp-web.js ready ✅');
  });

  waClient.on('auth_failure', (msg) => {
    console.warn('[Notify] Auth failure:', msg);
    waError = 'Authentication failed. Delete .wwebjs_auth and try again.';
    resetWAClient();
    waError = 'Authentication failed. Click Reconnect to try again.';
  });

  waClient.on('disconnected', (reason) => {
    console.warn('[Notify] WhatsApp disconnected:', reason);
    resetWAClient();
  });

  waClient.initialize().catch((err) => {
    console.warn('[Notify] whatsapp-web.js init error:', err.message);
    waError = `Init failed: ${err.message}. Click Reconnect to try again.`;
    waClient = null;
    waInitialising = false;
    clearTimeout(waInitTimer);
  });
}

// Do NOT auto-init — user clicks Connect manually from the dashboard

// ─── Low-level senders ────────────────────────────────────────────────────────

/**
 * Try WA Web first (preferred); if not ready → fallback to UltraMsg
 */
async function sendWhatsApp(to, body) {
  // Primary: whatsapp-web.js
  if (waReady && waClient) {
    try {
      const chatId = to.includes('@') ? to : `${to}@c.us`;
      await waClient.sendMessage(chatId, body);
      return; // success
    } catch (err) {
      console.warn('[Notify] whatsapp-web.js send error, trying UltraMsg fallback:', err.message);
    }
  }

  // Fallback: UltraMsg
  if (ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: ULTRAMSG_TOKEN, to, body }),
      });
      const data = await res.json();
      if (data.sent === 'true' || data.sent === true) return; // success
      console.warn('[Notify] UltraMsg also failed:', data);
    } catch (err) {
      console.warn('[Notify] UltraMsg error:', err.message);
    }
  }

  // Neither worked
  if (!waReady) {
    console.warn('[Notify] No WhatsApp channel available — scan QR or configure UltraMsg');
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
 * getWAGroups — returns list of WhatsApp groups from whatsapp-web.js client
 */
export async function getWAGroups() {
  if (!waClient || !waReady) return [];
  try {
    const chats = await waClient.getChats();
    return chats
      .filter(c => c.isGroup)
      .map(c => ({ id: c.id._serialized, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { return []; }
}

/**
 * sendManualMessage — always sends regardless of CHANNEL setting (used by manual send UI)
 */
export async function sendManualMessage(to, body) {
  await sendWhatsApp(to, body);
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
