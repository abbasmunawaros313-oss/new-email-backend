import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// ✅ CORS middleware (allow only your frontend)
app.use(cors({
  origin: "https://ostravel-portal-orignal.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ✅ JSON parser with larger payload limit
app.use(express.json({ limit: "25mb" }));

// ✅ Health check
app.get("/", (req, res) => res.json({ status: "Server running" }));

// ✅ Send email route
app.post("/send-email", async (req, res) => {
  try {
    const { subject, body, recipients, file } = req.body;

    if (!subject || !body || !recipients?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sendPromises = recipients.map(async (r) => {
      const payload = {
        api_key: process.env.SMTP_API_KEY,
        to: r.email,
        sender: process.env.SENDER_EMAIL,
        subject,
        text_body: body.replace("{{name}}", r.name || "Customer"),
      };

      // ✅ Attachments formatting
      if (file?.name && file?.content) {
        payload.attachments = [
          {
            name: file.name,
            type: file.type || "application/octet-stream",
            content: file.content.replace(/^data:.*;base64,/, ""), // strip data URL header
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

// ✅ OPTIONS preflight for CORS
app.options("/send-email", (req, res) => res.sendStatus(204));

// ✅ Start server on dynamic Railway port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// ✅ Catch unhandled errors
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
