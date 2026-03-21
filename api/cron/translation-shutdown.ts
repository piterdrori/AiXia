export default async function handler() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase env" }),
      { status: 500 }
    );
  }

  const res = await fetch(
    `${supabaseUrl}/functions/v1/translation-shutdown`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    }
  );

  const text = await res.text();

  return new Response(text, {
    status: res.status,
  });
}
