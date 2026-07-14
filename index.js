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
// FIREBASE ADMIN — FAIL-SOFT INITIALIZATION (added for follow-up merge)
// If Firebase env vars are missing/invalid, the follow-up routes are disabled
// but /send-email (live confirmations & status emails) KEEPS WORKING.
// Required env vars on Railway: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
// FIREBASE_PRIVATE_KEY  (copy them from the Autoemail service's Variables tab).
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
// FOLLOW-UP EMAIL SYSTEM (merged in from the Autoemail service)
// Triggered once/day by an external cron hitting /send-scheduled-emails
// ==========================================================================

// Robustly parse a scheduled date whether it was saved as a Firestore
// Timestamp (Bookings.jsx) OR an ISO string (ApprovedVisas.jsx). This fixes
// the bug where Timestamp-dated follow-ups were silently never sent.
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

async function updateEmailTracking(bookingId, emailType) {
  const updateData = {};
  const now = new Date().toISOString();
  if (emailType === "followUp1") {
    updateData["emailTracking.followUp1Sent"] = true;
    updateData["emailTracking.followUp1SentDate"] = now;
  } else if (emailType === "followUp2") {
    updateData["emailTracking.followUp2Sent"] = true;
    updateData["emailTracking.followUp2SentDate"] = now;
  } else if (emailType === "followUp3") {
    updateData["emailTracking.followUp3Sent"] = true;
    updateData["emailTracking.followUp3SentDate"] = now;
  } else if (emailType === "followUp4") {
    updateData["emailTracking.followUp4Sent"] = true;
    updateData["emailTracking.followUp4SentDate"] = now;
  } else if (emailType === "recurring") {
    const nextRecurring = new Date();
    nextRecurring.setMonth(nextRecurring.getMonth() + 6);
    updateData["emailTracking.lastRecurringEmailDate"] = now;
    updateData["emailTracking.nextRecurringEmailDate"] = nextRecurring.toISOString();
  }
  await db.collection("bookings").doc(bookingId).update(updateData);
}

async function sendFollowUpEmail(booking, bookingId, emailType) {
  try {
    if (!booking.email || booking.email.trim() === "") {
      return { success: false, emailType, bookingId, error: "No email address" };
    }
    const { subject, body } = getEmailTemplate(emailType, booking);
    if (!subject || !body) throw new Error(`Invalid email type: ${emailType}`);
    await sendEmailViaSMTP2GO({ to: booking.email, subject, body });
    await updateEmailTracking(bookingId, emailType);
    console.log(`✅ Sent ${emailType} to ${booking.email} (Booking ${bookingId})`);
    return { success: true, emailType, bookingId, email: booking.email };
  } catch (error) {
    console.error(`❌ Failed ${emailType} for booking ${bookingId}:`, error.message);
    return { success: false, emailType, bookingId, error: error.message };
  }
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

// CRON ENDPOINT — send all due follow-ups. Trigger daily (e.g. cron-job.org):
//   GET /send-scheduled-emails?token=YOUR_CRON_SECRET
app.get("/send-scheduled-emails", async (req, res) => {
  if (!guardScheduled(req, res)) return;
  const startTime = Date.now();
  try {
    const now = new Date();
    const bookingsRef = db.collection("bookings");
    const [processingSnap, approvedSnap] = await Promise.all([
      bookingsRef.where("visaStatus", "==", "Processing").get(),
      bookingsRef.where("visaStatus", "==", "Approved").get(),
    ]);

    const results = { followUp1: 0, followUp2: 0, followUp3: 0, followUp4: 0, recurring: 0, failed: 0 };
    const jobs = [];
    const run = (booking, id, type) =>
      jobs.push(
        sendFollowUpEmail(booking, id, type).then(r => {
          if (r.success) results[type]++; else results.failed++;
        })
      );

    // Processing → followUp1 (2d) & followUp2 (7d)
    for (const doc of processingSnap.docs) {
      const b = doc.data(); const t = b.emailTracking || {};
      if (!b.email) continue;
      const d1 = toDateSafe(t.followUp1ScheduledDate);
      const d2 = toDateSafe(t.followUp2ScheduledDate);
      if (!t.followUp1Sent && d1 && d1 <= now) run(b, doc.id, "followUp1");
      if (!t.followUp2Sent && d2 && d2 <= now) run(b, doc.id, "followUp2");
    }
    // Approved → followUp3 (1m), followUp4 (3m), recurring (6m)
    for (const doc of approvedSnap.docs) {
      const b = doc.data(); const t = b.emailTracking || {};
      if (!b.email) continue;
      const d3 = toDateSafe(t.followUp3ScheduledDate);
      const d4 = toDateSafe(t.followUp4ScheduledDate);
      const dr = toDateSafe(t.nextRecurringEmailDate);
      if (!t.followUp3Sent && d3 && d3 <= now) run(b, doc.id, "followUp3");
      if (!t.followUp4Sent && d4 && d4 <= now) run(b, doc.id, "followUp4");
      if (dr && dr <= now) run(b, doc.id, "recurring");
    }

    await Promise.all(jobs);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalSent = results.followUp1 + results.followUp2 + results.followUp3 + results.followUp4 + results.recurring;
    console.log(`📈 Cron done: ${totalSent} sent, ${results.failed} failed in ${duration}s`);
    res.json({
      success: true,
      summary: { totalSent, failed: results.failed, breakdown: results, duration: `${duration}s`,
        checked: { processing: processingSnap.size, approved: approvedSnap.size } },
    });
  } catch (error) {
    console.error("❌ CRON ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Read-only health/backlog check for follow-ups (safe — sends nothing).
app.get("/check-email-status", async (req, res) => {
  if (!firebaseReady) {
    return res.status(503).json({ error: "Follow-ups disabled: Firebase not configured." });
  }
  try {
    const now = new Date();
    const bookingsRef = db.collection("bookings");
    const [processingSnap, approvedSnap] = await Promise.all([
      bookingsRef.where("visaStatus", "==", "Processing").get(),
      bookingsRef.where("visaStatus", "==", "Approved").get(),
    ]);
    const pending = { followUp1: 0, followUp2: 0, followUp3: 0, followUp4: 0, recurring: 0 };
    const upcoming = { followUp1: 0, followUp2: 0, followUp3: 0, followUp4: 0, recurring: 0 };
    const bump = (k, due) => { if (!due) return; (due <= now ? pending : upcoming)[k]++; };

    processingSnap.forEach(doc => {
      const t = doc.data().emailTracking || {};
      if (!t.followUp1Sent) bump("followUp1", toDateSafe(t.followUp1ScheduledDate));
      if (!t.followUp2Sent) bump("followUp2", toDateSafe(t.followUp2ScheduledDate));
    });
    approvedSnap.forEach(doc => {
      const t = doc.data().emailTracking || {};
      if (!t.followUp3Sent) bump("followUp3", toDateSafe(t.followUp3ScheduledDate));
      if (!t.followUp4Sent) bump("followUp4", toDateSafe(t.followUp4ScheduledDate));
      bump("recurring", toDateSafe(t.nextRecurringEmailDate));
    });
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    res.json({
      status: "healthy",
      pending: { total: sum(pending), ...pending },
      upcoming: { total: sum(upcoming), ...upcoming },
      bookings: { processing: processingSnap.size, approved: approvedSnap.size },
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
