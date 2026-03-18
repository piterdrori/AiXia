import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: requester },
      error: requesterError,
    } = await userClient.auth.getUser();

    if (requesterError || !requester) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: requesterProfile, error: requesterProfileError } =
      await userClient
        .from("profiles")
        .select("role")
        .eq("user_id", requester.id)
        .single();

    if (
      requesterProfileError ||
      !requesterProfile ||
      requesterProfile.role !== "admin"
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only admins can send invites.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const role = String(body.role || "employee").trim();
    const memberType = body.memberType
      ? String(body.memberType).trim()
      : null;
    const redirectTo = String(body.redirectTo || "").trim();

    if (!email) {
      throw new Error("Email is required.");
    }

    if (!fullName) {
      throw new Error("Full name is required.");
    }

    if (!redirectTo) {
      throw new Error("Redirect URL is required.");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          full_name: fullName,
          requested_role: role,
          member_type: memberType,
        },
      }
    );

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
