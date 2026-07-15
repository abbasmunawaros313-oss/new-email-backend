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
      const payload = {
        api_key: process.env.SMTP_API_KEY,
        to: r.email,
        sender: process.env.SENDER_EMAIL,
          sender_name: "OS Travel and Tours",
        subject,
        text_body: body.replace("{{name}}", r.name || "Customer"),
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
// FOLLOW-UP EMAIL SYSTEM (efficient: reads ONLY bookings that are due today)
//
// Each booking carries a single `nextEmailDue` Firestore Timestamp = the date
// of its next pending follow-up (or null / absent = nothing pending). The cron
// queries `where nextEmailDue <= now`, so it reads a handful of due records
// instead of the entire Processing/Approved history. Bookings with no field
// (all historical records) are ignored — no backlog blast, no full scans.
// ==========================================================================

// Parse a scheduled date whether saved as Firestore Timestamp OR ISO string.
const toDateSafe = (val) => {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate(); // Firestore Timestamp
  const d = new Date(val);                                   // ISO string / millis
  return isNaN(d.getTime()) ? null : d;
};

async function sendEmailViaSMTP2GO({ to, subject, body }) {
  const payload = {
    api_key: process.env.SMTP_API_KEY,
    to,
    sender: process.env.SENDER_EMAIL,
    sender_name: "OS Travel and Tours",
    subject,
    text_body: body,
  };
  const response = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

// Compute a booking's next pending follow-up date (Timestamp) or null.
function computeNextEmailDue(t, status) {
  const cand = [];
  if (status === "Processing") {
    if (!t.followUp1Sent) cand.push(toDateSafe(t.followUp1ScheduledDate));
    if (!t.followUp2Sent) cand.push(toDateSafe(t.followUp2ScheduledDate));
  } else if (status === "Approved") {
    if (!t.followUp3Sent) cand.push(toDateSafe(t.followUp3ScheduledDate));
    if (!t.followUp4Sent) cand.push(toDateSafe(t.followUp4ScheduledDate));
    cand.push(toDateSafe(t.nextRecurringEmailDate)); // recurring is always pending
  }
  const valid = cand.filter(Boolean);
  if (!valid.length) return null;
  const min = valid.reduce((a, b) => (a < b ? a : b));
  return admin.firestore.Timestamp.fromDate(min);
}

// Process ONE due booking: send whatever is due, mark sent, recompute nextEmailDue.
async function processDueBooking(docSnap, now, results) {
  const b = docSnap.data();
  const status = b.visaStatus;
  const t = { ...(b.emailTracking || {}) };
  const updates = {};
  const nowIso = new Date().toISOString();

  // No recipient — clear the field so it's never re-scanned.
  if (!b.email || b.email.trim() === "") {
    await docSnap.ref.update({ nextEmailDue: null });
    return;
  }

  const isDue = (dateVal, sent) => {
    const d = toDateSafe(dateVal);
    return !sent && d && d <= now;
  };

  const toSend = [];
  if (status === "Processing") {
    if (isDue(t.followUp1ScheduledDate, t.followUp1Sent)) toSend.push("followUp1");
    if (isDue(t.followUp2ScheduledDate, t.followUp2Sent)) toSend.push("followUp2");
  } else if (status === "Approved") {
    if (isDue(t.followUp3ScheduledDate, t.followUp3Sent)) toSend.push("followUp3");
    if (isDue(t.followUp4ScheduledDate, t.followUp4Sent)) toSend.push("followUp4");
    const rec = toDateSafe(t.nextRecurringEmailDate);
    if (rec && rec <= now) toSend.push("recurring");
  }

  for (const type of toSend) {
    try {
      const { subject, body } = getEmailTemplate(type, b);
      await sendEmailViaSMTP2GO({ to: b.email, subject, body });
      if (type === "recurring") {
        const next = new Date(now);
        next.setMonth(next.getMonth() + 6);
        t.nextRecurringEmailDate = next;
        updates["emailTracking.lastRecurringEmailDate"] = nowIso;
        updates["emailTracking.nextRecurringEmailDate"] = admin.firestore.Timestamp.fromDate(next);
      } else {
        t[`${type}Sent`] = true;
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

  // Recompute the next pending date (or null) so this booking is only re-read when due again.
  updates.nextEmailDue = computeNextEmailDue(t, status);
  await docSnap.ref.update(updates);
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

// CRON ENDPOINT — send all DUE follow-ups. Trigger daily (e.g. cron-job.org):
//   GET /send-scheduled-emails?token=YOUR_CRON_SECRET
app.get("/send-scheduled-emails", async (req, res) => {
  if (!guardScheduled(req, res)) return;
  const startTime = Date.now();
  try {
    const now = new Date();
    // EFFICIENT: only bookings whose next follow-up is due (tiny read set).
    const dueSnap = await db.collection("bookings")
      .where("nextEmailDue", "<=", admin.firestore.Timestamp.fromDate(now))
      .get();

    const results = {};
    for (const docSnap of dueSnap.docs) {
      await processDueBooking(docSnap, now, results); // sequential = gentle on SMTP; set is small
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalSent = ["followUp1", "followUp2", "followUp3", "followUp4", "recurring"]
      .reduce((s, k) => s + (results[k] || 0), 0);
    console.log(`📈 Cron done: ${dueSnap.size} due, ${totalSent} sent, ${results.failed || 0} failed, ${duration}s`);
    res.json({
      success: true,
      summary: { due: dueSnap.size, totalSent, failed: results.failed || 0, breakdown: results, duration: `${duration}s` },
    });
  } catch (error) {
    console.error("❌ CRON ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Read-only backlog check (efficient — counts only bookings due now).
app.get("/check-email-status", async (req, res) => {
  if (!firebaseReady) {
    return res.status(503).json({ error: "Follow-ups disabled: Firebase not configured." });
  }
  try {
    const now = new Date();
    const dueSnap = await db.collection("bookings")
      .where("nextEmailDue", "<=", admin.firestore.Timestamp.fromDate(now))
      .get();
    res.json({
      status: "healthy",
      pendingDue: dueSnap.size,
      note: "Counts only bookings with a follow-up due right now (efficient query, no full scan).",
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
