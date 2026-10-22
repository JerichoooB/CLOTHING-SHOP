export const CONTACT_EMAIL = "jerichobalayog2@gmail.com";
export const CONTACT_ENDPOINT = "https://formspree.io/f/myeegnrb";

export async function sendContact(formData) {
  let response;
  try {
    response = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("We couldn’t confirm delivery. Check your connection and try again, or email us directly.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || result.ok !== true) {
    if (response.status === 429)
      throw new Error("The contact form is temporarily at its submission limit. Please email us directly.");
    throw new Error("Your message wasn’t accepted. Please try again, or email us directly.");
  }
}
