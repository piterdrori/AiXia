import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, link } = req.body;

  if (!email || !link) {
    return res.status(400).json({ message: "Email and link are required" });
  }

  try {
    // Example using Supabase's email function or any email provider
    // Replace with your provider: SendGrid, Mailgun, etc.
    await fetch("https://YOUR_EMAIL_API/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "Complete Your AiXia TaskFlow Registration",
        html: `
          <p>Hello,</p>
          <p>Thank you for registering with AiXia TaskFlow.</p>
          <p>Click the link below to complete your profile:</p>
          <a href="${link}">${link}</a>
          <p>After submission, an admin will review your account. You cannot log in until approval.</p>
        `,
      }),
    });

    return res.status(200).json({ message: "Verification email sent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to send email" });
  }
}
