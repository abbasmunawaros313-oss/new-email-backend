// server.js
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// ✅ CORS restricted
app.use(cors({
  origin: "https://ostravel-portal-orignal.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => {
  res.send({ status: "Server is running" });
});

const transporter = nodemailer.createTransport({
  host: "mail.smtp2go.com",
  port: 465,       // <-- CHANGE THIS
  secure: true,    // <-- CHANGE THIS (port 465 requires direct SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

transporter.verify((err) => {
  if (err) console.error("SMTP2GO Error:", err);
  else console.log("✅ SMTP2GO Connected");
});

app.post("/send-email", async (req, res) => {
  try {
    const { subject, body, recipients, file } = req.body;

    if (!subject || !body || !recipients?.length) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const sendPromises = recipients.map((r) => {
      const mail = {
        from: process.env.SENDER_EMAIL,
        to: r.email,
        subject,
        text: body.replace("{{name}}", r.name || "Customer"),
      };

      if (file?.name && file?.content) {
        mail.attachments = [
          {
            filename: file.name,
            content: Buffer.from(file.content, "base64"),
            contentType: file.type,
          }
        ];
      }

      return transporter.sendMail(mail);
    });

    await Promise.all(sendPromises);
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.options("/send-email", (req, res) => res.sendStatus(204));

const PORT = process.env.PORT; // Railway PORT or fallback for local
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

