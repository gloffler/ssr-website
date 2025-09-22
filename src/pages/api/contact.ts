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

    // Spam-Check (falls Honeypot ausgefüllt ist)
    if (company) {
      return new Response(JSON.stringify({ error: "Spam detected" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!name || !email || !message || !consent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Transporter konfigurieren (nutze z. B. SMTP von deinem Mail-Provider)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // mx1525.netcup.net
      port: Number(process.env.SMTP_PORT), // 465
      secure: true, // wichtig: Port 465 → secure: true
      auth: {
        user: process.env.SMTP_USER, // noreply@staysilentrecords.com
        pass: process.env.SMTP_PASS,
      },
    });

    // Mail verschicken
    await transporter.sendMail({
      from: `"Website Kontakt" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO || process.env.SMTP_USER, // wohin die Mails gehen sollen
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
