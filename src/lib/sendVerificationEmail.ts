export async function sendVerificationEmail(email: string, link: string) {
  if (!email || !link) throw new Error("Email and link are required");

  try {
    // Replace with your email provider API
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
  } catch (err) {
    console.error(err);
    throw new Error("Failed to send verification email");
  }
}
