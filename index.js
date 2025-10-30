import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// ✅ CORS
app.use(cors({
  origin: "https://ostravel-portal-orignal.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "20mb" }));

// ✅ Health check
app.get("/", (req, res) => res.json({ status: "Server running" }));

// ✅ Send email route
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
        subject,
        text_body: body.replace("{{name}}", r.name || "Customer"),
      };

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

// ✅ OPTIONS preflight
app.options("/send-email", (req, res) => res.sendStatus(204));

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
