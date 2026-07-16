import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import admin from "firebase-admin";

const app = express();

const allowedOrigins = [
  "https://ostravel-portal-orignal.vercel.app", // production
  "http://localhost:5173",                      // local dev
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like Postman / server-to-server cron)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ✅ JSON parser with larger payload
app.use(express.json({ limit: "25mb" }));

// ==========================================================================
// FIREBASE ADMIN — FAIL-SOFT INITIALIZATION
// If Firebase env vars are missing/invalid, the follow-up routes are disabled
// but /send-email (live confirmations & status emails) KEEPS WORKING.
// ==========================================================================
let firebaseReady = false;
try {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    firebaseReady = true;
    console.log("✅ Firebase Admin initialized — follow-up routes enabled");
  } else {
    console.warn("⚠️ Firebase env vars missing — follow-up routes DISABLED. /send-email still works.");
  }
} catch (err) {
  console.error("❌ Firebase Admin init failed — follow-up routes DISABLED. /send-email still works. Reason:", err.message);
}
const db = firebaseReady ? admin.firestore() : null;

// ✅ Health check
app.get("/", (req, res) =>
  res.json({
    status: "Server running",
    followUpsEnabled: firebaseReady,
    service: "OS Travel Email Backend (merged: on-demand + follow-ups)",
  })
);

// ==========================================================================
// ON-DEMAND SEND — UNCHANGED (live confirmations / status-change / bulk emails)
// ==========================================================================
app.post("/send-email", async (req, res) => {
  try {
    const { subject, body, recipients, file } = req.body;

    if (!subject || !body || !recipients?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sendPromises = recipients.map(async r => {
      const resolvedBody = body.replace("{{name}}", r.name || "Customer");
      const payload = {
        api_key: process.env.SMTP_API_KEY,
        to: r.email,
        sender: `"O.S Travel & Tours" <${process.env.SENDER_EMAIL}>`,
          sender_name: "O.S Travel & Tours",
        subject,
        text_body: resolvedBody,          // plain-text fallback
        html_body: toHtml(resolvedBody),  // rich HTML with emojis + branding
      };


      // ✅ Use your original attachment code
      if (file?.name && file?.content) {
        payload.attachments = [
          {
            filename: file.name,
            mimetype: file.type || "application/octet-stream",
            fileblob: file.content.replace(/\s/g, ""),
          }
        ];
      }

      const resp = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10s circuit breaker timeout
      });

      const data = await resp.json();

      if (!data.data || (data.data.failed && data.data.failed > 0)) {
        throw new Error(`Failed to send to ${r.email}: ${JSON.stringify(data)}`);
      }

      return data;
    });

    await Promise.all(sendPromises);

    res.json({ success: true, sent: recipients.length });
  } catch (err) {
    console.error("SMTP2GO API Error:", err);
    res.status(500).json({ error: "Failed to send emails", details: err.message });
  }
});

// ==========================================================================
// FOLLOW-UP EMAIL SYSTEM
//
// The live portal writes emailTracking.followUpXScheduledDate (Timestamp or
// ISO string) on Processing / Approved visa bookings. This backend scans all
// Processing + Approved bookings, checks each follow-up date, and sends only
// emails that are due AND within the 7-day grace window (to skip the old
// backlog that was never emailed while the system was not running).
//
// Appointment-type bookings are excluded from follow-ups; the portal handles
// that by simply not writing any followUpXScheduledDate on them.
// ==========================================================================

// Grace window: only send if the follow-up became due in the last N days.
const GRACE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Parse a scheduled date whether saved as Firestore Timestamp OR ISO string.
const toDateSafe = (val) => {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate(); // Firestore Timestamp
  const d = new Date(val);                                   // ISO string / millis
  return isNaN(d.getTime()) ? null : d;
};

// ==========================================================================
// HTML EMAIL HELPER
// Converts plain-text email body → branded HTML email.
// SMTP2GO receives BOTH text_body (fallback) AND html_body (rich display).
// This means nothing breaks — clients that don't support HTML use plain text.
// ==========================================================================
function toHtml(text) {
  // Convert every character to a safe HTML representation:
  // - ASCII special chars (&, <, >) → HTML entities
  // - ALL non-ASCII chars (emojis 🎉, bullets •, Arabic, accented, etc.) → &#codepoint;
  //   This is the only reliable way to render emojis in email HTML across all clients.
  const bodyHtml = Array.from(text).map(char => {
    const code = char.codePointAt(0);
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "\n") return "<br>";
    if (code > 127) return `&#${code};`; // emoji, bullet, accented, Arabic, etc.
    return char;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3c6e 0%,#2563ab 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">&#9992;&#65039; OS Travel &amp; Tours</h1>
            <p style="margin:6px 0 0;color:#b3d4f5;font-size:13px;">Your Trusted Travel Partner</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;color:#2d3748;font-size:15px;line-height:1.8;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#718096;">OS Travel and Tours &bull; 0333-5542877 &bull; ostravelisb@gmail.com</p>
            <p style="margin:4px 0 0;font-size:12px;color:#718096;"><a href="https://www.ostravel.pk/" style="color:#2563ab;text-decoration:none;">www.ostravel.pk</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmailViaSMTP2GO({ to, subject, body }) {
  const payload = {
    api_key: process.env.SMTP_API_KEY,
    to,
    sender: `"O.S Travel & Tours" <${process.env.SENDER_EMAIL}>`,
    sender_name: "O.S Travel & Tours",
    subject,
    text_body: body,       // plain-text fallback (always present)
    html_body: toHtml(body), // rich HTML (emojis, formatting — used by modern clients)
  };
  const response = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000) // 10s circuit breaker timeout
  });
  const data = await response.json();
  if (!data.data || (data.data.failed && data.data.failed > 0)) {
    throw new Error(`SMTP2GO API Error: ${JSON.stringify(data)}`);
  }
  return data;
}

function getEmailTemplate(emailType, booking) {
  const templates = {
    followUp1: {
      subject: "📋 Your Visa Application is Being Processed - OS Travel",
      body: `Dear ${booking.fullName},
Great news! Your visa application for ${booking.country} is currently being processed. 🔄
We're working diligently to ensure everything is in order. While we handle your visa, let us help you plan the rest of your journey!
🎫 FLIGHT TICKETING — Best prices guaranteed, flexible options, multiple airlines.
🏨 HOTEL RESERVATIONS — Budget to luxury, prime locations, special rates.
🕋 UMRAH PACKAGES — Visa assistance, hotels near Haram, ground transport.
📞 Contact us anytime: 0333-5542877 | ostravelisb@gmail.com | https://www.ostravel.pk/
Best regards,
OS Travel and Tours Team`,
    },
    followUp2: {
      subject: "⏳ Visa Processing Update - Plan Your Trip with OS Travel",
      body: `Dear ${booking.fullName},
Your visa application for ${booking.country} is still being processed. We appreciate your patience! ⏳
While you wait, plan ahead and save:
✈️ EARLY BIRD FLIGHT DEALS — lock in best prices, flexible dates.
🏨 ACCOMMODATION PLANNING — early-booking discounts, free cancellation.
🏥 TRAVEL INSURANCE — medical coverage, trip protection, 24/7 assistance.
📞 Ready to plan? 0333-5542877 | ostravelisb@gmail.com | https://www.ostravel.pk/
Best regards,
OS Travel and Tours Team`,
    },
    followUp3: {
      subject: "🎉 Visa Approved! Complete Your Travel Plans - OS Travel",
      body: `Dear ${booking.fullName},
Congratulations! Your visa for ${booking.country} has been approved! 🎉
Now let's finalize your travel arrangements:
🎫 FLIGHT BOOKING — competitive prices, flexible payment plans.
🏨 HOTEL PACKAGES — special rates, prime locations, free cancellation.
🕋 UMRAH SERVICES — complete solutions with experienced guides.
🏥 TRAVEL INSURANCE — comprehensive coverage & 24/7 assistance.
📞 Book now: 0333-5542877 | ostravelisb@gmail.com | https://www.ostravel.pk/
Safe travels!
OS Travel and Tours Team`,
    },
    followUp4: {
      subject: "🌍 Your Journey Awaits - Exclusive Travel Services | OS Travel",
      body: `Dear ${booking.fullName},
We hope you're enjoying your approved visa for ${booking.country}! 🌍
As your trusted travel partner, we're here for every journey:
✈️ INTERNATIONAL FLIGHTS — worldwide, best-price guarantee, 24/7 support.
🏨 GLOBAL HOTELS — 500,000+ properties, instant confirmation.
🕋 UMRAH & HAJJ PACKAGES — premium accommodations, expert guidance.
🏥 TRAVEL INSURANCE — medical coverage, evacuation, baggage protection.
🎁 Exclusive discounts for our valued customers!
📞 Contact us: 0333-5542877 | ostravelisb@gmail.com | https://www.ostravel.pk/
Best regards,
OS Travel and Tours Team`,
    },
    recurring: {
      subject: "🌟 Planning Your Next Adventure? We're Here to Help!",
      body: `Dear ${booking.fullName},
It's been a while since we helped you with your ${booking.country} visa! We hope your trip was amazing! 🎉
🌍 PLANNING YOUR NEXT JOURNEY? OS Travel and Tours is ready to assist:
✈️ Visa Services • 🎫 Flight Ticketing • 🕋 Umrah Packages • 🏨 Hotel Bookings • 🏥 Travel Insurance
🎁 Returning-customer benefits: priority processing, exclusive discounts, dedicated support.
📞 Let's plan: 0333-5542877 | ostravelisb@gmail.com | https://www.ostravel.pk/
Best regards,
OS Travel and Tours Team`,
    },
  };
  return templates[emailType] || { subject: "", body: "" };
}

// Check whether a follow-up is due and within the grace window.
// Returns true if: not yet sent AND scheduled date is in the past AND within GRACE_WINDOW_MS.
function isDueWithinGrace(dateVal, sent, now) {
  if (sent) return false;
  const d = toDateSafe(dateVal);
  if (!d) return false;
  if (d > now) return false; // not yet due
  const age = now - d;
  return age <= GRACE_WINDOW_MS; // skip very old backlog
}

// Process ONE booking: send whatever is due, mark sent.
async function processBooking(docSnap, now, results) {
  const b = docSnap.data();
  const status = b.visaStatus;
  const t = b.emailTracking || {};
  const nowIso = now.toISOString();
  const updates = {};

  // Skip if no recipient email
  if (!b.email || b.email.trim() === "") return;

  const toSend = [];

  if (status === "Processing") {
    if (isDueWithinGrace(t.followUp1ScheduledDate, t.followUp1Sent, now)) toSend.push("followUp1");
    if (isDueWithinGrace(t.followUp2ScheduledDate, t.followUp2Sent, now)) toSend.push("followUp2");
  } else if (status === "Approved") {
    if (isDueWithinGrace(t.followUp3ScheduledDate, t.followUp3Sent, now)) toSend.push("followUp3");
    if (isDueWithinGrace(t.followUp4ScheduledDate, t.followUp4Sent, now)) toSend.push("followUp4");
    // Recurring: use the same grace window logic
    if (isDueWithinGrace(t.nextRecurringEmailDate, false, now)) toSend.push("recurring");
  }

  if (toSend.length === 0) return;

  for (const type of toSend) {
    try {
      const { subject, body } = getEmailTemplate(type, b);
      await sendEmailViaSMTP2GO({ to: b.email, subject, body });

      if (type === "recurring") {
        const next = new Date(now);
        next.setMonth(next.getMonth() + 6);
        updates["emailTracking.lastRecurringEmailDate"] = nowIso;
        updates["emailTracking.nextRecurringEmailDate"] = admin.firestore.Timestamp.fromDate(next);
      } else {
        updates[`emailTracking.${type}Sent`] = true;
        updates[`emailTracking.${type}SentDate`] = nowIso;
      }

      results[type] = (results[type] || 0) + 1;
      console.log(`✅ Sent ${type} to ${b.email} (${docSnap.id})`);
    } catch (err) {
      results.failed = (results.failed || 0) + 1;
      console.error(`❌ Failed ${type} for ${docSnap.id}:`, err.message);
    }
  }

  if (Object.keys(updates).length > 0) {
    await docSnap.ref.update(updates);
  }
}

// Count pending follow-ups for one booking (read-only, same logic as processBooking).
function countPendingForBooking(b, now) {
  const status = b.visaStatus;
  const t = b.emailTracking || {};
  let count = 0;

  if (status === "Processing") {
    if (isDueWithinGrace(t.followUp1ScheduledDate, t.followUp1Sent, now)) count++;
    if (isDueWithinGrace(t.followUp2ScheduledDate, t.followUp2Sent, now)) count++;
  } else if (status === "Approved") {
    if (isDueWithinGrace(t.followUp3ScheduledDate, t.followUp3Sent, now)) count++;
    if (isDueWithinGrace(t.followUp4ScheduledDate, t.followUp4Sent, now)) count++;
    if (isDueWithinGrace(t.nextRecurringEmailDate, false, now)) count++;
  }
  return count;
}

// Guard: block if Firebase isn't configured; require secret token if one is set.
function guardScheduled(req, res) {
  if (!firebaseReady) {
    res.status(503).json({ error: "Follow-ups disabled: Firebase not configured on this service." });
    return false;
  }
  const secret = process.env.CRON_SECRET;
  if (secret && req.query.token !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ==========================================================================
// CRON ENDPOINT — send all DUE follow-ups. Trigger daily (e.g. cron-job.org):
//   GET /send-scheduled-emails?token=YOUR_CRON_SECRET
//
// Scans Processing + Approved bookings; sends follow-ups that:
//   1. Have a scheduled date in the past
//   2. Haven't been sent yet
//   3. Became due within the last 7 days (grace window — skips old backlog)
// ==========================================================================
app.get("/send-scheduled-emails", async (req, res) => {
  if (!guardScheduled(req, res)) return;
  const startTime = Date.now();

  try {
    const now = new Date();

    // Fetch all Processing and Approved visa bookings (2 small reads, ~2767 total docs).
    const [processingSnap, approvedSnap] = await Promise.all([
      db.collection("bookings").where("visaStatus", "==", "Processing").get(),
      db.collection("bookings").where("visaStatus", "==", "Approved").get(),
    ]);

    const allDocs = [...processingSnap.docs, ...approvedSnap.docs];
    console.log(`📋 Scanning ${allDocs.length} bookings (${processingSnap.size} Processing, ${approvedSnap.size} Approved)`);

    const results = { followUp1: 0, followUp2: 0, followUp3: 0, followUp4: 0, recurring: 0, failed: 0 };
    for (const docSnap of allDocs) {
      await processBooking(docSnap, now, results);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalSent = ["followUp1", "followUp2", "followUp3", "followUp4", "recurring"]
      .reduce((s, k) => s + (results[k] || 0), 0);

    console.log(`📈 Cron done: ${allDocs.length} scanned, ${totalSent} sent, ${results.failed || 0} failed, ${duration}s`);
    res.json({
      success: true,
      summary: {
        scanned: allDocs.length,
        processing: processingSnap.size,
        approved: approvedSnap.size,
        totalSent,
        failed: results.failed || 0,
        breakdown: results,
        duration: `${duration}s`,
        graceWindowDays: 7,
      },
    });
  } catch (error) {
    console.error("❌ CRON ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================================================
// READ-ONLY STATUS CHECK — counts pending follow-ups without sending anything.
//   GET /check-email-status?token=YOUR_CRON_SECRET
// ==========================================================================
app.get("/check-email-status", async (req, res) => {
  if (!firebaseReady) {
    return res.status(503).json({ error: "Follow-ups disabled: Firebase not configured." });
  }
  try {
    const now = new Date();

    const [processingSnap, approvedSnap] = await Promise.all([
      db.collection("bookings").where("visaStatus", "==", "Processing").get(),
      db.collection("bookings").where("visaStatus", "==", "Approved").get(),
    ]);

    const allDocs = [...processingSnap.docs, ...approvedSnap.docs];
    let pendingCount = 0;
    const breakdown = { followUp1: 0, followUp2: 0, followUp3: 0, followUp4: 0, recurring: 0 };

    for (const docSnap of allDocs) {
      const b = docSnap.data();
      const status = b.visaStatus;
      const t = b.emailTracking || {};

      if (status === "Processing") {
        if (isDueWithinGrace(t.followUp1ScheduledDate, t.followUp1Sent, now)) { breakdown.followUp1++; pendingCount++; }
        if (isDueWithinGrace(t.followUp2ScheduledDate, t.followUp2Sent, now)) { breakdown.followUp2++; pendingCount++; }
      } else if (status === "Approved") {
        if (isDueWithinGrace(t.followUp3ScheduledDate, t.followUp3Sent, now)) { breakdown.followUp3++; pendingCount++; }
        if (isDueWithinGrace(t.followUp4ScheduledDate, t.followUp4Sent, now)) { breakdown.followUp4++; pendingCount++; }
        if (isDueWithinGrace(t.nextRecurringEmailDate, false, now)) { breakdown.recurring++; pendingCount++; }
      }
    }

    res.json({
      status: "healthy",
      scanned: allDocs.length,
      processing: processingSnap.size,
      approved: approvedSnap.size,
      pendingDue: pendingCount,
      breakdown,
      graceWindowDays: 7,
      note: "Counts follow-ups due in the last 7 days that haven't been sent yet.",
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// ✅ OPTIONS preflight
app.options("/send-email", (req, res) => res.sendStatus(204));

// ✅ Start server on dynamic Railway port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// ✅ Catch unhandled errors
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
