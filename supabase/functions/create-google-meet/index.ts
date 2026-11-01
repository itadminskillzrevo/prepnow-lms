import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateMeetRequest {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to refresh access token:", error);
    throw new Error("Failed to refresh Google access token");
  }

  const data = await response.json();
  return data.access_token;
}

async function createGoogleCalendarEvent(
  accessToken: string,
  title: string,
  description: string,
  startTime: string,
  endTime: string
): Promise<{ meetLink: string; eventId: string }> {
  const event = {
    summary: title,
    description: description || "",
    start: {
      dateTime: startTime,
      timeZone: "UTC",
    },
    end: {
      dateTime: endTime,
      timeZone: "UTC",
    },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to create calendar event:", error);
    throw new Error("Failed to create Google Calendar event with Meet link");
  }

  const data = await response.json();
  
  const meetLink = data.conferenceData?.entryPoints?.find(
    (ep: any) => ep.entryPointType === "video"
  )?.uri;

  if (!meetLink) {
    throw new Error("Google Meet link was not generated");
  }

  return {
    meetLink,
    eventId: data.id,
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated and has appropriate role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has instructor or admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["superadmin", "admin", "instructor"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateMeetRequest = await req.json();
    const { title, description, scheduledAt, durationMinutes } = body;

    if (!title || !scheduledAt || !durationMinutes) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, scheduledAt, durationMinutes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating Google Meet for: ${title} at ${scheduledAt}`);

    // Get access token from refresh token
    const accessToken = await getAccessToken();

    // Calculate end time
    const startDate = new Date(scheduledAt);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Create calendar event with Meet link
    const { meetLink, eventId } = await createGoogleCalendarEvent(
      accessToken,
      title,
      description || "",
      startDate.toISOString(),
      endDate.toISOString()
    );

    console.log(`Google Meet created successfully: ${meetLink}`);

    return new Response(
      JSON.stringify({
        success: true,
        meetingUrl: meetLink,
        meetingId: eventId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating Google Meet:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create Google Meet" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
