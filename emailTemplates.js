// ==========================================================================
// OS TRAVEL & TOURS — EMAIL TEMPLATE SYSTEM
// Email-safe HTML (tables + inline styles + hosted <img>), no emoji, dynamic.
// One place for BOTH confirmations and the follow-up sequence.
// ==========================================================================

const ASSET_BASE =
  process.env.ASSET_BASE ||
  "https://new-email-backend-production.up.railway.app/email-assets";
const SITE = "https://www.ostravel.pk";

// ---- helpers --------------------------------------------------------------
const esc = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const img = (name, alt = "") =>
  `<img src="${ASSET_BASE}/${name}.jpg" width="600" alt="${esc(alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />`;

const button = (label, url = SITE) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="background:#C79A3A;border-radius:2px;">
      <a href="${url}" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#231602;text-decoration:none;">${esc(label)}</a>
    </td></tr></table>`;

const header = () => `
  <tr><td style="background:#0B1D38;border-bottom:2px solid #C79A3A;padding:18px 0;text-align:center;">
    <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:20px;letter-spacing:3px;">O.S <span style="color:#E8843B;">TRAVEL</span> &amp; TOURS</div>
    <div style="color:#9DB0C7;font-size:9px;letter-spacing:5px;text-transform:uppercase;margin-top:5px;">Your Journey, Our Priority</div>
  </td></tr>`;

const footer = () => `
  <tr><td style="background:#08152b;padding:24px 40px;">
    <div style="color:#B7C6D8;font-size:12px;line-height:1.9;">
      0333&nbsp;5542877<br/>
      <a href="${SITE}" style="color:#C7D5E6;text-decoration:none;">www.ostravel.pk</a> &nbsp;&middot;&nbsp; www.ostravels.com<br/>
      Office No.1, 2nd Floor, Al-Hafeez Mall, G-11 Markaz, Islamabad
    </div>
    <div style="border-top:1px solid #182f4d;margin-top:16px;padding-top:14px;color:#61748c;font-size:10.5px;text-align:center;letter-spacing:1px;">
      &copy; 2026 O.S Travel &amp; Tours. All rights reserved.
    </div>
  </td></tr>`;

// Hero: full-width photo + a navy band below with eyebrow + serif title (email-safe).
const hero = (imgName, eyebrow, titleHtml, subtitle = "") => `
  <tr><td style="padding:0;">${img(imgName)}</td></tr>
  <tr><td style="background:#0B1D38;padding:26px 40px;">
    <div style="color:#E8C877;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">${esc(eyebrow)}</div>
    <div style="color:#ffffff;font-family:Georgia,serif;font-size:25px;line-height:1.22;margin-top:8px;">${titleHtml}</div>
    ${subtitle ? `<div style="color:#c9d6e6;font-size:14px;line-height:1.6;margin-top:8px;">${esc(subtitle)}</div>` : ""}
  </td></tr>`;

const greeting = (name, paras) => `
  <tr><td style="padding:28px 40px 2px;">
    <div style="font-family:Georgia,serif;font-size:19px;color:#0B1D38;">Dear ${esc(name || "Valued Client")},</div>
    ${paras.map((p) => `<p style="font-size:14.5px;line-height:1.7;color:#41525f;margin:14px 0 0;">${p}</p>`).join("")}
  </td></tr>`;

const detail = (title, rows) => `
  <tr><td style="padding:22px 40px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E7DFCF;border-collapse:collapse;">
      <tr><td colspan="2" style="background:#0B1D38;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;padding:10px 16px;">${esc(title)}</td></tr>
      ${rows.map(([k, v]) => `<tr>
        <td style="padding:11px 16px;font-size:13px;color:#7a8794;border-top:1px solid #EFE8DA;">${esc(k)}</td>
        <td style="padding:11px 16px;font-size:13px;color:#122238;font-weight:bold;text-align:right;border-top:1px solid #EFE8DA;">${esc(v)}</td>
      </tr>`).join("")}
    </table>
  </td></tr>`;

const crossHead = (label) => `
  <tr><td style="padding:26px 40px 2px;text-align:center;">
    <span style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B07A1E;font-weight:bold;">${esc(label)}</span>
  </td></tr>`;

// A row of 2 or 3 service cross-sell cells (text only — email-safe, no icons).
const services = (items) => {
  const w = Math.floor(100 / items.length);
  return `
  <tr><td style="padding:14px 34px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${items.map((s) => `<td width="${w}%" valign="top" style="padding:8px 10px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:15px;color:#0B1D38;font-weight:bold;">${esc(s.title)}</div>
        <div style="font-size:12px;color:#5b6b78;line-height:1.5;margin-top:5px;">${esc(s.desc)}</div>
        <a href="${s.url || SITE}" style="display:inline-block;margin-top:8px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;color:#B07A1E;text-decoration:none;border-bottom:1px solid #D9C089;padding-bottom:2px;">${esc(s.link || "Explore")}</a>
      </td>`).join("")}
    </tr></table>
  </td></tr>`;
};

// A row of destination photo tiles with a name caption below.
const destinations = (items) => {
  const w = Math.floor(100 / items.length);
  return `
  <tr><td style="padding:16px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${items.map((d) => `<td width="${w}%" valign="top" style="padding:0 1px;">
        <a href="${d.url || SITE}" style="text-decoration:none;">
          <img src="${ASSET_BASE}/${d.img}.jpg" alt="${esc(d.name)}" width="200" style="display:block;width:100%;height:120px;object-fit:cover;border:0;" />
          <div style="background:#0B1D38;color:#fff;font-family:Georgia,serif;font-size:14px;text-align:center;padding:8px 4px;">${esc(d.name)}</div>
        </a>
      </td>`).join("")}
    </tr></table>
  </td></tr>`;
};

const ctaBand = (title, label, url = SITE, bg = "#0B1D38", sub = "") => `
  <tr><td style="background:${bg};padding:26px 40px;text-align:center;">
    <div style="font-family:Georgia,serif;color:#fff;font-size:19px;line-height:1.3;margin-bottom:${sub ? "6px" : "16px"};">${esc(title)}</div>
    ${sub ? `<div style="color:#9fb2c9;font-size:13px;margin-bottom:16px;">${esc(sub)}</div>` : ""}
    ${button(label, url)}
  </td></tr>`;

const wrap = (preheader, bodyRows) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#e9e6df;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#e9e6df;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e6df;padding:22px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FBF9F5;">
        ${header()}
        ${bodyRows}
        ${footer()}
      </table>
    </td></tr>
  </table>
</body></html>`;

// Common cross-sell sets
const SVC_FLIGHT = { title: "Flights", desc: "Best fares, flexible options.", link: "Explore", url: SITE };
const SVC_HOTEL = { title: "Hotels", desc: "Prime spots, special rates.", link: "Find stays", url: SITE };
const SVC_INSURANCE = { title: "Travel Insurance", desc: "Total peace of mind.", link: "Get covered", url: SITE };
const SVC_UMRAH = { title: "Umrah Packages", desc: "Hotels near the Haram, full support.", link: "See packages", url: SITE };

// ==========================================================================
// TEMPLATES  — each returns { subject, html, text }
// ==========================================================================
const templates = {
  // 1 — Visa documents received
  visaDocuments: (d) => ({
    subject: "We have your documents — O.S Travel & Tours",
    html: wrap(`We've received your visa documents for ${d.country}. Your application is now being processed.`,
      hero("documents", "Application Received", "We have your documents.<br/>The journey begins.") +
      greeting(d.name, [
        `Thank you for choosing O.S Travel &amp; Tours. Your visa documents for <b>${esc(d.country)}</b> have been received in full, and your application is now with our processing team.`,
      ]) +
      detail("Your Application", [
        ["Passport", d.passport || "—"], ["Visa Type", d.visaType || "—"],
        ["Destination", d.country || "—"], ["Received On", d.date || "—"],
      ]) +
      crossHead("While we handle your visa") +
      services([SVC_FLIGHT, SVC_HOTEL, SVC_INSURANCE]) +
      ctaBand("Questions about your application?", "Talk to your agent")),
    text: `Dear ${d.name}, we have received your visa documents for ${d.country} and your application is being processed. — O.S Travel & Tours, 0333-5542877, www.ostravel.pk`,
  }),

  // 2 — Visa appointment confirmed
  visaAppointment: (d) => ({
    subject: "Your embassy appointment is confirmed — O.S Travel & Tours",
    html: wrap(`Your ${d.country} visa appointment is set for ${d.appointmentDate}.`,
      hero("europe", "Appointment Confirmed", "Your embassy appointment<br/>is secured.") +
      greeting(d.name, [
        `Everything is arranged for your <b>${esc(d.country)}</b> visa appointment. Please keep the details below handy.`,
      ]) +
      detail("Appointment Details", [
        ["Country", d.country || "—"], ["Date & Time", d.appointmentDate || "—"],
        ["Location", d.location || "—"],
      ]) +
      `<tr><td style="padding:8px 40px 0;font-size:13px;color:#41525f;line-height:1.9;">
        &#10003;&nbsp; Bring originals of all documents &nbsp;&nbsp; &#10003;&nbsp; Carry your passport &amp; slip<br/>
        &#10003;&nbsp; Arrive 15 minutes early &nbsp;&nbsp; &#10003;&nbsp; Dress smart &amp; formal
      </td></tr>` +
      ctaBand("Get trip-ready while you wait", "Book flights & insurance")),
    text: `Dear ${d.name}, your ${d.country} visa appointment is set: ${d.appointmentDate}, ${d.location}. — O.S Travel & Tours`,
  }),

  // 3 — Visa approved (status change + follow-up 3)
  visaApproved: (d) => ({
    subject: "Congratulations — your visa is approved! O.S Travel & Tours",
    html: wrap(`Your visa for ${d.country} has been approved. Let's finalise your trip.`,
      hero("cappadocia", "Congratulations", "Your visa is approved!", `Your visa for ${d.country} has been approved — the hard part is done.`) +
      greeting(d.name, [
        `Wonderful news! Your visa for <b>${esc(d.country)}</b> has been <b style="color:#0F7A6E;">approved</b>. Now let's finalise your flights and stay so you can travel with total confidence.`,
      ]) +
      destinations([
        { img: "malaysia", name: "Book Flights" }, { img: "resort", name: "Reserve a Hotel" },
      ]) +
      ctaBand("You're cleared for takeoff.", "Complete my booking", SITE, "#0B1D38", "Let's turn that approval into a booked, ready-to-go trip.")),
    text: `Dear ${d.name}, congratulations — your visa for ${d.country} is approved! Let's finalise your flights and hotel. — O.S Travel & Tours`,
  }),

  // 4 — Flight booking confirmation
  flightConfirmation: (d) => ({
    subject: `Flight booked (PNR ${d.pnr}) — O.S Travel & Tours`,
    html: wrap(`Your flight ${d.from} to ${d.to} is confirmed. PNR ${d.pnr}.`,
      hero("airport", "Booking Confirmed", "You're all set. Time to fly.") +
      greeting(d.name, [`Your flight is confirmed with O.S Travel &amp; Tours. Here is your journey summary.`]) +
      detail("Journey Details", [
        ["Route", d.route || `${d.from || "—"} to ${d.to || "—"}`],
        ["Departure", d.departure || "—"], ["Return", d.returnDate || "—"],
        ["PNR", d.pnr || "—"], ["Travellers · Class", `${d.pax || "—"} · ${d.travelClass || "—"}`],
      ]) +
      `<tr><td style="padding:12px 40px 0;font-size:12.5px;color:#7a8794;text-align:center;">Please clear any remaining balance before the ticketing deadline to secure this fare.</td></tr>` +
      crossHead("Complete your trip") +
      services([SVC_HOTEL, SVC_INSURANCE]) +
      ctaBand("Fly with total confidence", "Plan the rest of my trip")),
    text: `Dear ${d.name}, your flight ${d.from}→${d.to} (PNR ${d.pnr}) is confirmed. — O.S Travel & Tours`,
  }),

  // 5 — Umrah package confirmation
  umrahPackage: (d) => ({
    subject: "Your Umrah package is confirmed — O.S Travel & Tours",
    html: wrap(`Your Umrah package is securely registered. We are honoured to serve your journey.`,
      hero("madinah", "Umrah Package Confirmed", "Your sacred journey<br/>is secured.") +
      greeting(d.name, [
        `Your Umrah package has been securely registered with O.S Travel &amp; Tours. We are deeply honoured to facilitate your blessed journey.`,
      ]) +
      detail("Package Details", [
        ["Package", d.package || "—"], ["Departure", d.departure || "—"],
        ["Includes", d.includes || "Visa · Haram Hotels · Transport"],
      ]) +
      `<tr><td style="padding:24px 40px 6px;text-align:center;">
        <div style="color:#C79A3A;font-size:15px;letter-spacing:6px;">&#10022; &#10022; &#10022;</div>
        <div style="font-family:Georgia,serif;font-style:italic;color:#0B1D38;font-size:18px;margin-top:8px;">May Allah accept your Umrah and ibadah.</div>
      </td></tr>` +
      crossHead("Travel essentials") +
      services([{ title: "Flights to Jeddah", desc: "Best-value fares for your dates.", link: "View flights" }, SVC_INSURANCE])),
    text: `Dear ${d.name}, your Umrah package (${d.package}) is confirmed. May Allah accept your Umrah. — O.S Travel & Tours`,
  }),

  // 6 — Travel insurance received
  insurance: (d) => ({
    subject: "Travel insurance received — O.S Travel & Tours",
    html: wrap(`Your travel insurance for ${d.destination} has been filed. You're covered.`,
      hero("coast", "Coverage Filed", "Travel with total<br/>peace of mind.") +
      greeting(d.name, [
        `Your travel insurance request has been successfully filed with O.S Travel &amp; Tours. Wherever you go, you are covered.`,
      ]) +
      detail("Coverage Details", [
        ["Insurer", d.company || "—"], ["Destination", d.destination || "—"],
        ["Duration", d.days ? `${d.days} Days` : "—"], ["Effective", d.effectiveDate || "—"],
      ]) +
      crossHead("The rest of your trip") +
      services([SVC_FLIGHT, { title: "Visa Services", desc: "Need the visa too? We do that.", link: "Start visa" }]) +
      ctaBand("One partner for the whole trip", "Plan with OS")),
    text: `Dear ${d.name}, your travel insurance for ${d.destination} (${d.days} days) is filed. — O.S Travel & Tours`,
  }),

  // 7 — Hotel booking confirmation
  hotel: (d) => ({
    subject: "Your stay is confirmed — O.S Travel & Tours",
    html: wrap(`Your hotel reservation is confirmed. Rest easy.`,
      hero("hotel-room", "Reservation Confirmed", "Your stay is confirmed.<br/>Rest easy.") +
      greeting(d.name, [`Your hotel reservation is secured with O.S Travel &amp; Tours. We look forward to a comfortable stay for you.`]) +
      detail("Reservation", [
        ["Property", d.property || "—"], ["Check-in → Check-out", d.dates || "—"],
        ["Nights · Rooms", d.nightsRooms || "—"],
      ]) +
      ctaBand("Need flights & transfers too?", "Complete my trip")),
    text: `Dear ${d.name}, your hotel reservation (${d.property}) is confirmed. — O.S Travel & Tours`,
  }),

  // 8 — Follow-up 1: in processing (day 2)
  followUp1: (d) => ({
    subject: "Your visa is in motion — O.S Travel & Tours",
    html: wrap(`Your visa for ${d.country} is being processed. Let's plan the rest of your journey.`,
      hero("plane-sky", "Update · Day 2", "Your visa is in motion.") +
      greeting(d.name, [
        `Great news — your visa application for <b>${esc(d.country)}</b> is being processed and everything is in order. While our team handles it, let's get the rest of your journey planned.`,
      ]) +
      crossHead("While we handle your visa") +
      services([SVC_FLIGHT, SVC_HOTEL, SVC_INSURANCE]) +
      ctaBand("Plan now, travel the moment it's approved.", "Explore our services")),
    text: `Dear ${d.name}, your visa for ${d.country} is being processed. Plan your flights/hotels/insurance while you wait. — O.S Travel & Tours`,
  }),

  // 9 — Follow-up 2: still processing, plan ahead (day 7)
  followUp2: (d) => ({
    subject: "Plan ahead while your visa processes — O.S Travel & Tours",
    html: wrap(`Your ${d.country} visa is still processing. Get ahead of the rush.`,
      hero("maldives", "Update · Day 7", "Thank you for your patience —<br/>let's plan ahead.") +
      greeting(d.name, [
        `Your visa for <b>${esc(d.country)}</b> is still being processed — we appreciate your patience. Smart travellers plan while they wait, and get ahead of the rush.`,
      ]) +
      crossHead("Get inspired while you wait") +
      destinations([{ img: "thailand", name: "Thailand" }, { img: "singapore", name: "Singapore" }, { img: "dubai", name: "Dubai" }]) +
      services([{ title: "Early-Bird Flights", desc: "Lock in fares, stay flexible.", link: "View flights" }, SVC_HOTEL, SVC_INSURANCE]) +
      ctaBand("Ready to plan your trip?", "Start planning with an expert", SITE, "#7a1440")),
    text: `Dear ${d.name}, your ${d.country} visa is still processing. Plan ahead with early-bird flights, hotels and insurance. — O.S Travel & Tours`,
  }),

  // 10 — Follow-up 4: journey awaits (~3 months)
  followUp4: (d) => ({
    subject: "Wherever you're headed next, we've got you — O.S Travel & Tours",
    html: wrap(`Your trusted travel partner for every journey.`,
      hero("hero-wing", "We're here for the long haul", "Wherever you're headed next,<br/>we've got you.") +
      greeting(d.name, [
        `We hope you're making the most of your <b>${esc(d.country)}</b> visa! As your trusted partner, we're ready whenever the next trip calls.`,
      ]) +
      destinations([{ img: "dubai", name: "UAE" }, { img: "istanbul", name: "Türkiye" }, { img: "maldives", name: "Maldives" }]) +
      crossHead("All your travel, one roof") +
      services([SVC_FLIGHT, SVC_HOTEL, SVC_UMRAH, SVC_INSURANCE]) +
      ctaBand("One call handles your whole trip.", "Get in touch", SITE, "#324a64")),
    text: `Dear ${d.name}, wherever you're headed next — flights, hotels, umrah, insurance — we've got you. — O.S Travel & Tours`,
  }),

  // 11 — Recurring re-engagement (~6 months)
  recurring: (d) => ({
    subject: "Ready for your next adventure? — O.S Travel & Tours",
    html: wrap(`It's been a while since your ${d.country} visa. Let's plan your next journey.`,
      hero("santorini", "We've missed you", "Ready for your<br/>next adventure?") +
      greeting(d.name, [
        `It's been a while since we arranged your <b>${esc(d.country)}</b> visa — we hope the trip was unforgettable! Wherever you're dreaming of next, let's make it effortless. As a returning client, you'll always have our priority attention.`,
      ]) +
      destinations([{ img: "istanbul", name: "Türkiye" }, { img: "thailand", name: "Thailand" }, { img: "dubai", name: "Dubai" }]) +
      ctaBand("Let's plan your next journey.", "Start my next trip", SITE, "#0B1D38", "Tell us where you're dreaming of — we'll handle the rest.")),
    text: `Dear ${d.name}, ready for your next adventure? Let's plan your next trip. — O.S Travel & Tours`,
  }),

  // 12 — Brand / newsletter blast
  brandNewsletter: (d) => ({
    subject: "Your journey, your way — O.S Travel & Tours",
    html: wrap(`Best visas, discounted airfares and travel insurance — all under one roof.`,
      hero("hero-wing", "Visas · Airfares · Insurance", "Your journey, your way —<br/>before you even take off.", "Everything you need for international travel, under one trusted roof.") +
      greeting(d.name || "Valued Client", [
        `Greetings from O.S Travel &amp; Tours! We make international travel easier, more affordable and worry-free — guiding you from visa to journey with trusted, personal support at every step.`,
      ]) +
      crossHead("Explore our top destinations") +
      destinations([{ img: "malaysia", name: "Malaysia" }, { img: "thailand", name: "Thailand" }, { img: "singapore", name: "Singapore" }, { img: "indonesia", name: "Indonesia" }]) +
      crossHead("All your travel, one roof") +
      services([{ title: "Airline Ticketing", desc: "Domestic & international at trusted rates.", link: "Enquire" }, SVC_INSURANCE, SVC_UMRAH]) +
      ctaBand("Save time, skip the hassle.", "Plan your journey today")),
    text: `Greetings from O.S Travel & Tours — visas, flights, hotels, umrah and insurance, all under one roof. www.ostravel.pk`,
  }),
};

/**
 * Render an email template.
 * @returns { subject, html, text } or null if template unknown.
 */
export function renderEmail(templateType, data = {}) {
  const fn = templates[templateType];
  if (!fn) return null;
  return fn(data);
}

export const TEMPLATE_NAMES = Object.keys(templates);
