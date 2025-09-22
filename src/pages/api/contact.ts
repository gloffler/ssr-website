import type { APIRoute } from "astro";
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const subject = formData.get("subject")?.toString() || "Neue Anfrage";
    const message = formData.get("message")?.toString() || "";
    const consent = formData.get("consent")?.toString() || "";
    const company = formData.get("company")?.toString() || ""; // Honeypot
    const token = formData.get("cf-turnstile-response")?.toString() || ""; // Turnstile

    // Spam/Honeypot-Check
    if (company) {
      return new Response(JSON.stringify({ error: "Spam detected" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Pflichtfelder prüfen
    if (!name || !email || !message || !consent || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Turnstile-Validierung
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY || "",
          response: token,
        }),
      }
    );

    const outcome = await verifyRes.json();
    if (!outcome.success) {
      console.warn("Turnstile validation failed:", outcome);
      return new Response(
        JSON.stringify({ error: "Turnstile validation failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Nodemailer Transporter konfigurieren
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465, // 465 = SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Mail verschicken
    await transporter.sendMail({
      from: `"Website Kontakt" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO || process.env.SMTP_USER,
      subject: `[Kontakt] ${subject}`,
      text: `Von: ${name} <${email}>\n\n${message}`,
      replyTo: email,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Nachricht gesendet" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Kontaktformular Fehler:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
