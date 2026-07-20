// ==========================================================================
// OS TRAVEL & TOURS — EMAIL TEMPLATE SYSTEM (v2, email-safe)
// Tables + inline styles + web-safe fonts (Georgia/Arial) + hosted images.
// Bright / light design. One source for confirmations AND the follow-up cron.
// ==========================================================================

const ASSET_BASE =
  process.env.ASSET_BASE ||
  "https://new-email-backend-production.up.railway.app/email-assets";
const SITE = "https://www.ostravels.com";

// ---- dynamic links to real ostravels.com pages -----------------------------
const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[()]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
const visaUrl = (c) => (c ? `${SITE}/visa/${slugify(c)}-visa/` : SITE);
const UMRAH_URL = `${SITE}/umrah-package/umrah-package/`;
const CONTACT_URL = `${SITE}/contact-2/`;

// ---- helpers ---------------------------------------------------------------
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Convert non-ASCII (em-dash, middot, accents, Arabic…) to entities so every
// client renders them (fixes the "�" issue regardless of charset in transit).
const encodeNonAscii = (s) => Array.from(String(s == null ? "" : s)).map((ch) => { const c = ch.codePointAt(0); return c > 127 ? `&#${c};` : ch; }).join("");

const INK = "#22323F", SOFT = "#54636E", ORANGE = "#E9782B", GOLD = "#C79A46", HAIR = "#EEEBE4";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";

const button = (label, url = SITE, bg = ORANGE, color = "#ffffff") => `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:18px auto 0;"><tr>
    <td style="background:${bg};border-radius:10px;"><a href="${url}" style="display:inline-block;padding:14px 34px;font-family:${SANS};font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${color};text-decoration:none;">${esc(label)}</a></td>
  </tr></table>`;

const img = (name, w) => `<img src="${ASSET_BASE}/${name}.jpg" width="${w}" style="display:block;width:100%;max-width:${w}px;height:auto;border:0;border-radius:16px;" alt="" />`;

const header = () => `
  <tr><td style="padding:14px 0 20px;text-align:center;">
    <div style="font-family:${SERIF};font-size:24px;font-weight:bold;color:${INK};letter-spacing:1px;">O.S <span style="color:${ORANGE};">TRAVEL</span> &amp; TOURS</div>
    <div style="font-family:${SANS};font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${SOFT};padding-top:5px;">Your Journey, Our Priority</div>
    <div style="width:48px;height:3px;background:${GOLD};margin:14px auto 0;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>
  </td></tr>`;

const footer = () => `
  <tr><td style="padding:26px 40px 22px;text-align:center;border-top:1px solid ${HAIR};">
    <div style="font-family:${SANS};font-size:14px;color:#3B4A56;line-height:1.95;font-weight:bold;">
      0333&nbsp;5542877 &nbsp;&middot;&nbsp; 051&nbsp;2805570 &nbsp;&middot;&nbsp; <a href="${SITE}" style="color:#3B4A56;text-decoration:none;">www.ostravels.com</a><br/>
      Office #3, Aaly Plaza, Fazal-e-Haq Rd, Blue Area, Islamabad
    </div>
    <div style="font-family:${SANS};font-size:11px;color:#aeb6bd;padding-top:14px;">&copy; 2026 O.S Travel &amp; Tours. All rights reserved.</div>
  </td></tr>`;

const hero = (name) => `<tr><td style="padding:6px 40px 0;">${img(name, 520)}</td></tr>`;

const headline = (ey, titleHtml, sub, eyColor = ORANGE) => `
  <tr><td style="padding:26px 40px 0;text-align:center;">
    <div style="font-family:${SANS};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${eyColor};font-weight:bold;">${esc(ey)}</div>
    <div style="font-family:${SERIF};font-size:34px;line-height:1.15;color:${INK};padding-top:12px;">${titleHtml}</div>
    ${sub ? `<div style="font-family:${SANS};font-size:16px;line-height:1.6;color:${SOFT};padding-top:14px;">${sub}</div>` : ""}
  </td></tr>`;

const greeting = (nm, paras) => `
  <tr><td style="padding:26px 40px 0;text-align:center;">
    <div style="font-family:${SERIF};font-size:22px;color:${INK};">Dear ${esc(nm || "Valued Client")},</div>
    ${paras.map((p) => `<div style="font-family:${SANS};font-size:16px;line-height:1.7;color:#3c4b57;padding-top:10px;">${p}</div>`).join("")}
  </td></tr>`;

const detail = (rows) => `
  <tr><td style="padding:20px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${HAIR};border-radius:12px;">
      ${rows.map(([k, v], i) => `<tr>
        <td style="padding:15px 20px;font-family:${SANS};font-size:16px;color:#465059;font-weight:bold;${i ? `border-top:1px solid ${HAIR};` : ""}">${esc(k)}</td>
        <td style="padding:15px 20px;font-family:${SANS};font-size:16px;color:${INK};font-weight:bold;text-align:right;${i ? `border-top:1px solid ${HAIR};` : ""}">${esc(v)}</td>
      </tr>`).join("")}
    </table>
  </td></tr>`;

const sectionLabel = (k, h) => `
  <tr><td style="padding:34px 40px 0;text-align:center;">
    <div style="font-family:${SANS};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:bold;">${esc(k)}</div>
    ${h ? `<div style="font-family:${SERIF};font-size:28px;color:${INK};padding-top:6px;">${esc(h)}</div>` : ""}
  </td></tr>`;

// Destinations — flush 4-per-row, photo + flag + name below (email-safe)
const destinations = (items) => `
  <tr><td style="padding:16px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${HAIR};border-radius:14px;">
      <tr>${items.map((d, i) => `
        <td width="25%" valign="top" style="padding:0;${i ? `border-left:1px solid ${HAIR};` : ""}">
          <a href="${d.url || SITE}" style="text-decoration:none;">
            <img src="${ASSET_BASE}/${d.img}.jpg" width="128" height="104" style="display:block;width:100%;height:104px;border:0;object-fit:cover;" alt="" />
            <div style="padding:9px 4px 11px;text-align:center;">
              ${d.cc ? `<img src="https://flagcdn.com/w40/${d.cc}.png" width="18" style="display:inline-block;vertical-align:middle;border-radius:3px;border:0;" alt="" /> ` : ""}<span style="font-family:${SERIF};font-size:14px;color:${INK};font-weight:bold;">${esc(d.name)}</span>
              ${d.s ? `<div style="font-family:${SANS};font-size:10px;color:${SOFT};padding-top:2px;">${esc(d.s)}</div>` : ""}
            </div>
          </a>
        </td>`).join("")}</tr>
    </table>
  </td></tr>`;

// Service / secondary cards row (icon image + title + desc)
const cards = (items, serif = true) => `
  <tr><td style="padding:14px 34px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${items.map((it) => `<td width="${Math.floor(100 / items.length)}%" valign="top" style="padding:6px 6px;text-align:center;">
        <img src="${ASSET_BASE}/${it.icon}.png" width="48" style="display:inline-block;border:0;" alt="" />
        <div style="font-family:${serif ? SERIF : SANS};font-size:${serif ? 16 : 14}px;color:${INK};font-weight:bold;padding-top:8px;">${esc(it.t)}</div>
        <div style="font-family:${SANS};font-size:12.5px;color:${SOFT};line-height:1.5;padding-top:4px;">${esc(it.d)}</div>
      </td>`).join("")}
    </tr></table>
  </td></tr>`;

// Primary next-step feature card (tinted, icon + text + button)
const feature = (icon, kk, title, desc, btn, url, bg = "#EAF3FA") => `
  <tr><td style="padding:16px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-radius:14px;"><tr>
      <td width="72" valign="middle" style="padding:20px 0 20px 20px;"><img src="${ASSET_BASE}/${icon}.png" width="50" style="display:block;border:0;" alt="" /></td>
      <td valign="middle" style="padding:18px 12px;">
        <div style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};font-weight:bold;">${esc(kk)}</div>
        <div style="font-family:${SERIF};font-size:19px;color:${INK};padding-top:3px;">${esc(title)}</div>
        <div style="font-family:${SANS};font-size:13px;color:${SOFT};line-height:1.5;padding-top:4px;">${esc(desc)}</div>
      </td>
      <td width="130" valign="middle" style="padding:18px 20px 18px 0;text-align:right;">
        <a href="${url}" style="display:inline-block;background:${ORANGE};color:#fff;font-family:${SANS};font-size:12px;font-weight:bold;padding:12px 18px;border-radius:9px;text-decoration:none;white-space:nowrap;">${esc(btn)}</a>
      </td>
    </tr></table>
  </td></tr>`;

// Featured hotel — real photo + explore CTA
const hotelShowcase = (imgName, title, desc, url) => `
  <tr><td style="padding:16px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${HAIR};border-radius:16px;">
      <tr><td style="padding:0;"><img src="${ASSET_BASE}/${imgName}.jpg" width="520" style="display:block;width:100%;height:auto;border:0;border-radius:16px 16px 0 0;" alt="" /></td></tr>
      <tr><td style="padding:16px 20px;"><table width="100%"><tr>
        <td valign="middle"><div style="font-family:${SERIF};font-size:19px;color:${INK};">${esc(title)}</div><div style="font-family:${SANS};font-size:13px;color:${SOFT};padding-top:2px;">${esc(desc)}</div></td>
        <td width="150" valign="middle" style="text-align:right;"><a href="${url}" style="display:inline-block;background:${INK};color:#fff;font-family:${SANS};font-size:12px;font-weight:bold;padding:12px 18px;border-radius:10px;text-decoration:none;">Explore hotels</a></td>
      </tr></table></td></tr>
    </table>
  </td></tr>`;

const trustRow = () => {
  const items = [["One Roof", "Visa to flight"], ["Trusted", "Real agents"], ["Best Fares", "Every route"], ["24/7", "Support"]];
  return `<tr><td style="padding:28px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${HAIR};border-radius:14px;background:#FBFAF7;"><tr>
      ${items.map(([n, l], i) => `<td width="25%" style="padding:16px 6px;text-align:center;${i ? `border-left:1px solid ${HAIR};` : ""}">
        <div style="font-family:${SERIF};font-size:20px;color:${INK};font-weight:bold;">${esc(n)}</div>
        <div style="font-family:${SANS};font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:${SOFT};padding-top:3px;">${esc(l)}</div>
      </td>`).join("")}
    </tr></table>
  </td></tr>`;
};

const ctaBand = (title, label, url = SITE, sub = "") => `
  <tr><td style="padding:32px 40px 6px;text-align:center;">
    <div style="font-family:${SERIF};font-size:23px;color:${INK};">${esc(title)}</div>
    ${sub ? `<div style="font-family:${SANS};font-size:14px;color:${SOFT};padding-top:6px;">${esc(sub)}</div>` : ""}
    ${button(label, url)}
  </td></tr>`;

const wrap = (preheader, rows) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#EDEBE6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EDEBE6;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDEBE6;padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;">
      ${header()}${rows}${trustRow()}${footer()}
    </table>
  </td></tr></table>
</body></html>`;

// Common cross-sell rows
const SVC3 = cards([
  { icon: "ic-flights", t: "Ticketing", d: "Domestic & international at trusted rates." },
  { icon: "ic-insurance", t: "Insurance", d: "Travel with complete peace of mind." },
  { icon: "ic-umrah", t: "Umrah", d: "Hotels near the Haram, full support." },
]);

// ==========================================================================
// TEMPLATES — each returns { subject, html, text }
// ==========================================================================
const templates = {
  visaDocuments: (d) => ({
    subject: "We have your documents — O.S Travel & Tours",
    html: wrap(`We've received your ${d.country} visa documents — now processing.`,
      hero("malaysia") +
      headline("Application Received", "We've got your <i>documents</i>", `Your <b style="color:${INK}">${esc(d.country)}</b> application is with our processing team — you're in good hands.`) +
      greeting(d.name, ["Thank you for choosing O.S Travel &amp; Tours. We've received everything and begun processing. Your details on record:"]) +
      detail([["Applicant", d.name || "—"], ["Passport No.", d.passport || "—"], ["Destination", d.country || "—"], ["Visa Type", d.visaType || "—"], ["Reference No.", d.reference || "OS-2026"], ["Submitted", d.date || "—"]]) +
      sectionLabel("Get a head start", "Plan while you wait") +
      feature("ic-flights", "Smart move", "Reserve flights now, pay later", "Lock today's fare — confirm once your visa is approved.", "View fares", SITE) +
      cards([{ icon: "ic-hotel", t: "Hotels", d: "Free-cancellation stays" }, { icon: "ic-insurance", t: "Insurance", d: "Often required for the visa" }, { icon: "ic-umrah", t: "Umrah", d: "Ask about packages" }], false) +
      ctaBand("Questions about your application?", "Talk to your agent", CONTACT_URL)),
    text: `Dear ${d.name}, we've received your ${d.country} visa documents and begun processing. — O.S Travel & Tours, 0333-5542877, ostravels.com`,
  }),

  visaApproved: (d) => ({
    subject: "Congratulations — your visa is approved! O.S Travel & Tours",
    html: wrap(`Your ${d.country} visa is approved — let's book your trip.`,
      hero("malaysia") +
      headline("Congratulations", "Your visa is <i>approved</i>", `You're cleared to travel to <b style="color:${INK}">${esc(d.country)}</b>. The hard part is done — now the journey begins.`, "#1B9E8F") +
      greeting(d.name, ["Wonderful news — your visa has been approved and is ready. Here are your approval details on record:"]) +
      detail([["Applicant", d.name || "—"], ["Destination", d.country || "—"], ["Visa Type", d.visaType || "Tourism"], ["Validity", d.validity || "90 days from issue"], ["Reference No.", d.reference || "OS-2026"]]) +
      sectionLabel("Your next step", "Let's get you there") +
      feature("ic-flights", "Step 1 · Book now", `Book your flight to ${esc(d.country)}`, "Best fares while your visa is fresh — flexible dates, trusted airlines.", "Search flights", visaUrl(d.country)) +
      hotelShowcase("resort", `Handpicked stays in ${esc(d.country)}`, "From city towers to resort escapes — free cancellation.", SITE) +
      cards([{ icon: "ic-insurance", t: "Insurance", d: "From a few rupees/day" }, { icon: "ic-transfers", t: "Transfers", d: "Airport pick-up & SIM" }, { icon: "ic-tours", t: "Tours", d: "Top experiences" }], false) +
      ctaBand("Ready for takeoff?", "Complete my travel plans", SITE, "Let's turn your approval into a fully booked trip.")),
    text: `Dear ${d.name}, congratulations — your ${d.country} visa is approved! Let's book your flights and hotel. — O.S Travel & Tours`,
  }),

  visaAppointment: (d) => ({
    subject: "Your embassy appointment is confirmed — O.S Travel & Tours",
    html: wrap(`Your ${d.country} visa appointment is set.`,
      hero("europe") +
      headline("Appointment Confirmed", "Your embassy appointment <i>is set</i>", `Everything is arranged for your <b style="color:${INK}">${esc(d.country)}</b> appointment.`) +
      greeting(d.name, ["Please keep the details below handy for your visit."]) +
      detail([["Country", d.country || "—"], ["Date & Time", d.appointmentDate || "—"], ["Location", d.location || "—"]]) +
      sectionLabel("Get trip-ready", "Plan ahead") +
      feature("ic-flights", "Smart move", "Book flights & insurance", "Line up your trip so you're ready the moment your visa is stamped.", "Explore", SITE) +
      ctaBand("Need to reschedule or ask something?", "Contact your agent", CONTACT_URL)),
    text: `Dear ${d.name}, your ${d.country} visa appointment is set: ${d.appointmentDate}, ${d.location}. — O.S Travel & Tours`,
  }),

  flightConfirmation: (d) => ({
    subject: `Flight booked (PNR ${d.pnr}) — O.S Travel & Tours`,
    html: wrap(`Your flight ${d.from} to ${d.to} is confirmed.`,
      hero("airport-gate") +
      headline("Booking Confirmed", "You're all set <i>to fly</i>", `Your flight to <b style="color:${INK}">${esc(d.to)}</b> is confirmed. Here's everything for your journey.`) +
      greeting(d.name, ["Your booking is confirmed with O.S Travel &amp; Tours. Please keep these details for your records:"]) +
      detail([["Route", d.route || `${d.from || "—"} to ${d.to || "—"}`], ["PNR", d.pnr || "—"], ["Departure", d.departure || "—"], ["Return", d.returnDate || "—"], ["Travellers · Class", `${d.pax || "—"} · ${d.travelClass || "—"}`]]) +
      sectionLabel("Complete your trip", "Everything for your stay") +
      hotelShowcase("burj-arab", `World-class stays in ${esc(d.to)}`, "Special rates near your itinerary — booked in minutes.", SITE) +
      cards([{ icon: "ic-insurance", t: "Insurance", d: "Delays, baggage, medical" }, { icon: "ic-transfers", t: "Transfers", d: "Airport pick-up" }, { icon: "ic-tours", t: "Tours", d: "Top experiences" }], false) +
      ctaBand("One trip, fully handled", "Plan the rest of my trip", SITE)),
    text: `Dear ${d.name}, your flight ${d.from} to ${d.to} (PNR ${d.pnr}) is confirmed. — O.S Travel & Tours`,
  }),

  umrahPackage: (d) => ({
    subject: "Your Umrah package is confirmed — O.S Travel & Tours",
    html: wrap(`Your Umrah package is securely registered.`,
      hero("madinah") +
      headline("Umrah Package Confirmed", "Your sacred journey <i>is secured</i>", "We are honoured to facilitate your blessed journey with care at every step.", GOLD) +
      greeting(d.name, ["Your Umrah package has been securely registered with O.S Travel &amp; Tours. Your package on record:"]) +
      detail([["Package", d.package || "—"], ["Departure", d.departure || "—"], ["Includes", d.includes || "Visa · Hotels · Transport"]]) +
      `<tr><td style="padding:24px 40px 0;text-align:center;"><div style="font-family:${SERIF};font-style:italic;font-size:19px;color:${GOLD};">May Allah accept your Umrah and ibadah.</div></td></tr>` +
      sectionLabel("Complete your pilgrimage", "Travel essentials") +
      feature("ic-flights", "Recommended", "Flights to Jeddah / Madinah", "Best-value fares timed to your package dates.", "View flights", SITE) +
      cards([{ icon: "ic-insurance", t: "Insurance", d: "Peace of mind for family" }, { icon: "ic-tours", t: "Ziyarat", d: "Guided historical tours" }, { icon: "ic-transfers", t: "Transport", d: "Haram-to-hotel shuttles" }], false) +
      ctaBand("Everything for your pilgrimage", "Speak with us", UMRAH_URL)),
    text: `Dear ${d.name}, your Umrah package (${d.package}) is confirmed. May Allah accept your Umrah. — O.S Travel & Tours`,
  }),

  insurance: (d) => ({
    subject: "Travel insurance received — O.S Travel & Tours",
    html: wrap(`Your travel insurance for ${d.destination} is filed and active.`,
      hero("airport-lounge") +
      headline("Coverage Confirmed", "Travel with total <i>peace of mind</i>", "Your travel insurance is filed and active. Wherever you go, you're covered.", "#1B9E8F") +
      greeting(d.name, ["Your travel insurance request has been successfully filed with O.S Travel &amp; Tours. Coverage details:"]) +
      detail([["Insured", d.name || "—"], ["Insurer", d.company || "—"], ["Destination", d.destination || "—"], ["Duration", d.days ? `${d.days} Days` : "—"], ["Effective", d.effectiveDate || "—"]]) +
      sectionLabel("The rest of your trip", "Let's complete it") +
      feature("ic-flights", "Next", `Book your flights to ${esc(d.destination)}`, "Match your journey to your cover dates with the best fares.", "Search flights", visaUrl(d.destination)) +
      cards([{ icon: "ic-visa", t: "Visa", d: "Need the visa too?" }, { icon: "ic-hotel", t: "Hotels", d: "Stays worldwide" }, { icon: "ic-tours", t: "Tours", d: "Explore with confidence" }], false) +
      ctaBand("One partner for the whole trip", "Plan with OS", SITE)),
    text: `Dear ${d.name}, your travel insurance for ${d.destination} (${d.days} days) is filed. — O.S Travel & Tours`,
  }),

  // ---- follow-ups ----
  followUp1: (d) => ({
    subject: "Your visa is in motion — O.S Travel & Tours",
    html: wrap(`Your ${d.country} visa is being processed.`,
      hero("airport-gate") +
      headline("Update · Day 2", "Your visa is <i>in motion</i>", `Your <b style="color:${INK}">${esc(d.country)}</b> application is being processed — everything's in order.`) +
      greeting(d.name, ["Great news — your visa is progressing well. While our team handles it, get a head start on the rest of your trip."]) +
      feature("ic-flights", "Smart move", "Reserve flights now, pay later", "Lock today's fare — confirm the moment your visa is approved.", "View fares", SITE) +
      cards([{ icon: "ic-hotel", t: "Hotels", d: "Free-cancellation stays" }, { icon: "ic-insurance", t: "Insurance", d: "Often required" }, { icon: "ic-umrah", t: "Umrah", d: "Ask about packages" }], false) +
      ctaBand("We'll keep you posted", "Explore our services", SITE, "You'll get an email the moment your status changes.")),
    text: `Dear ${d.name}, your ${d.country} visa is being processed. Plan your trip while you wait. — O.S Travel & Tours`,
  }),

  followUp2: (d) => ({
    subject: "Plan ahead while your visa processes — O.S Travel & Tours",
    html: wrap(`Your ${d.country} visa is still processing — plan ahead.`,
      hero("thailand") +
      headline("Update · Day 7", "Let's <i>plan ahead</i>", "Your visa is still processing — we appreciate your patience. Smart travellers plan now and get ahead of the rush.") +
      greeting(d.name, ["Here's a little inspiration while you wait:"]) +
      sectionLabel("Get inspired", "Where to next") +
      destinations([{ img: "malaysia", name: "Malaysia", cc: "my", s: "Early-bird", url: visaUrl("Malaysia") }, { img: "thailand", name: "Thailand", cc: "th", s: "Beaches", url: visaUrl("Thailand") }, { img: "singapore", name: "Singapore", cc: "sg", s: "Family", url: visaUrl("Singapore") }, { img: "burj-arab", name: "Dubai", cc: "ae", s: "Luxury", url: visaUrl("Dubai") }]) +
      sectionLabel("Featured visa", "Schengen — one visa, 27 countries") +
      hotelShowcase("europe", "Dreaming of Europe?", "One Schengen visa opens France, Italy, Spain, Switzerland & more.", SITE) +
      ctaBand("Ready to plan your trip?", "Start planning", SITE)),
    text: `Dear ${d.name}, your ${d.country} visa is still processing. Plan ahead with early-bird flights, hotels and insurance. — O.S Travel & Tours`,
  }),

  followUp4: (d) => ({
    subject: "Wherever you're headed next — O.S Travel & Tours",
    html: wrap(`Your trusted travel partner for every journey.`,
      hero("hero-wing") +
      headline("Your trusted travel partner", "Wherever you're <i>headed next</i>", "We hope your last trip was wonderful. Whenever the next journey calls, we're one message away.") +
      greeting(d.name, ["Fresh ideas for your next adventure:"]) +
      sectionLabel("Popular right now", "Explore the world") +
      destinations([{ img: "japan", name: "Japan", cc: "jp", s: "Visit", url: visaUrl("Japan") }, { img: "usa", name: "USA", cc: "us", s: "Visit & study", url: visaUrl("USA") }, { img: "istanbul", name: "Türkiye", cc: "tr", s: "e-Visa", url: visaUrl("Turkey") }, { img: "europe", name: "Europe", cc: "eu", s: "Schengen", url: SITE }]) +
      sectionLabel("All your travel, one roof") + SVC3 +
      ctaBand("One call handles your whole trip", "Plan my next journey", SITE)),
    text: `Dear ${d.name}, wherever you're headed next — flights, hotels, umrah, insurance — we've got you. — O.S Travel & Tours`,
  }),

  recurring: (d) => ({
    subject: "Ready for your next adventure? — O.S Travel & Tours",
    html: wrap(`It's been a while — let's plan your next journey.`,
      hero("maldives") +
      headline("We've missed you", "Ready for your <i>next adventure?</i>", "It's been a while! Wherever you're dreaming of next, we'll make it effortless — with priority care for returning clients.") +
      greeting(d.name, ["Where to this time?"]) +
      sectionLabel("Fresh ideas", "Your next trip awaits") +
      destinations([{ img: "istanbul", name: "Türkiye", cc: "tr", s: "Visa + tours", url: visaUrl("Turkey") }, { img: "thailand", name: "Thailand", cc: "th", s: "Beaches", url: visaUrl("Thailand") }, { img: "burj-arab", name: "Dubai", cc: "ae", s: "City breaks", url: visaUrl("Dubai") }, { img: "europe", name: "Europe", cc: "eu", s: "Schengen", url: SITE }]) +
      ctaBand("Let's plan your next journey", "Start my next trip", SITE, "Tell us where you're dreaming of — we'll handle the rest.")),
    text: `Dear ${d.name}, ready for your next adventure? Let's plan your next trip. — O.S Travel & Tours`,
  }),

  brandNewsletter: (d) => ({
    subject: "Your journey, your way — O.S Travel & Tours",
    html: wrap(`Visas, flights, hotels, Umrah & insurance — all under one roof.`,
      hero("hero-wing") +
      headline("Visas · Flights · Hotels · Umrah · Insurance", "Your journey <i>begins here</i>", "Everything you need for international travel — under one trusted roof, with real people guiding every step.") +
      greeting(d.name || "Valued Client", ["We make international travel easier, more affordable and worry-free. From your visa to your return flight, O.S Travel &amp; Tours is with you the whole way."]) +
      sectionLabel("Where will you go", "Popular Destinations") +
      destinations([{ img: "malaysia", name: "Malaysia", cc: "my", url: visaUrl("Malaysia") }, { img: "thailand", name: "Thailand", cc: "th", url: visaUrl("Thailand") }, { img: "singapore", name: "Singapore", cc: "sg", url: visaUrl("Singapore") }, { img: "indonesia", name: "Indonesia", cc: "id", url: visaUrl("Indonesia") }]) +
      destinations([{ img: "japan", name: "Japan", cc: "jp", url: visaUrl("Japan") }, { img: "usa", name: "USA", cc: "us", url: visaUrl("USA") }, { img: "istanbul", name: "Türkiye", cc: "tr", url: visaUrl("Turkey") }, { img: "madinah", name: "Saudi Arabia", cc: "sa", url: visaUrl("Saudi Arabia") }]) +
      sectionLabel("Featured visa", "Schengen — one visa, 27 countries") +
      hotelShowcase("europe", "Explore all of Europe on one visa", "France, Italy, Spain, Switzerland, Greece & more — we handle the paperwork.", SITE) +
      sectionLabel("All your travel, one roof") + SVC3 +
      sectionLabel("Where you'll stay", "Handpicked world-class hotels") +
      destinations([{ img: "burj-arab", name: "Dubai", s: "Burj Al Arab", url: SITE }, { img: "singapore", name: "Singapore", s: "Marina Bay", url: SITE }, { img: "resort", name: "Bali", s: "Beach resorts", url: SITE }, { img: "city-hotel", name: "Worldwide", s: "5-star stays", url: SITE }]) +
      ctaBand("Save time. Skip the hassle.", "Plan your journey today", CONTACT_URL)),
    text: `Greetings from O.S Travel & Tours — visas, flights, hotels, umrah and insurance, all under one roof. ostravels.com`,
  }),
};

export function renderEmail(templateType, data = {}) {
  const fn = templates[templateType];
  if (!fn) return null;
  const r = fn(data);
  return { subject: r.subject, html: encodeNonAscii(r.html), text: r.text };
}

export const TEMPLATE_NAMES = Object.keys(templates);
