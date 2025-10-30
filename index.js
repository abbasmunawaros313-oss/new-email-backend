// server.js
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// ✅ CORS setup (allow all origins for local testing)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ✅ Parse JSON requests (attachments up to 20MB)
app.use(express.json({ limit: "20mb" }));

// ✅ Health check route
app.get("/", (req, res) => {
  res.send({ status: "Server is running" });
});

// ✅ SMTP2GO transporter
const transporter = nodemailer.createTransport({
  host: "mail.smtp2go.com",
  port: 587,             // recommended SMTP port
  secure: false,           // TLS false for port 2525
  auth: {
    user: "munawar",         // your SMTP username (from SMTP2GO)
    pass: "CzVfsDb4DNC5P3nK", // SMTP password
  },
  tls: { rejectUnauthorized: false }, // optional for local testing
});

// ✅ Verify SMTP connection on startup
transporter.verify((err, success) => {
  if (err) console.error("SMTP2GO Connection Error:", err);
  else console.log("✅ SMTP2GO Connected Successfully!");
});

// ✅ Send email API
app.post("/send-email", async (req, res) => {
  try {
    const { subject, body, recipients, file } = req.body;

    if (!subject || !body || !recipients?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Send emails to all recipients
    const sendPromises = recipients.map(r => {
      const mailOptions = {
        from: "admin@ostravels.com",  // your verified sender
        to: r.email,
        subject,
        text: body.replace("{{name}}", r.name || "Customer"),
      };

      // Optional attachment
      if (file?.name && file?.content) {
        mailOptions.attachments = [
          {
            filename: file.name,
            content: Buffer.from(file.content, "base64"),
            contentType: file.type || "application/octet-stream",
          },
        ];
        console.log(`Attachment included: ${file.name}`);
      }

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(sendPromises);
    res.json({ success: true, sent: recipients.length });

  } catch (err) {
    console.error("SMTP2GO Error:", err);
    res.status(500).json({
      error: "Failed to send emails",
      details: err.response || err.message || err,
    });
  }
});

// ✅ Handle OPTIONS preflight requests for CORS
app.options("/send-email", (req, res) => res.sendStatus(204));

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
