import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This function generates live classes from weekly schedules
// Run it via cron job or manually to create upcoming classes

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require cron secret or admin JWT
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedCron = Deno.env.get("CRON_SECRET");
  if (!expectedCron || cronSecret !== expectedCron) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: uerr } = await authClient.auth.getUser(token);
    if (uerr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (!roleSet.has("admin") && !roleSet.has("superadmin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }



  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from("live_class_schedules")
      .select("*")
      .eq("is_active", true);

    if (schedulesError) throw schedulesError;

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active schedules found", created: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const weeksToGenerate = 2; // Generate classes for next 2 weeks
    let createdCount = 0;

    for (const schedule of schedules) {
      // Find the next occurrences of this day of week
      for (let weekOffset = 0; weekOffset < weeksToGenerate; weekOffset++) {
        const targetDate = new Date(today);
        const daysUntilTarget = (schedule.day_of_week - today.getDay() + 7) % 7;
        targetDate.setDate(today.getDate() + daysUntilTarget + weekOffset * 7);
        
        // Skip if it's in the past
        if (targetDate < today && weekOffset === 0) {
          targetDate.setDate(targetDate.getDate() + 7);
        }

        // Set the time - start_time is in IST (UTC+5:30), convert to UTC
        const [hours, minutes] = schedule.start_time.split(":");
        const istHours = parseInt(hours);
        const istMinutes = parseInt(minutes);
        // Convert IST to UTC: subtract 5 hours 30 minutes
        let utcMinutes = istMinutes - 30;
        let utcHours = istHours - 5;
        if (utcMinutes < 0) {
          utcMinutes += 60;
          utcHours -= 1;
        }
        if (utcHours < 0) {
          utcHours += 24;
          targetDate.setDate(targetDate.getDate() - 1);
        }
        targetDate.setUTCHours(utcHours, utcMinutes, 0, 0);

        // Check if class already exists for this schedule and date
        const scheduledAt = targetDate.toISOString();
        const { data: existing } = await supabase
          .from("live_classes")
          .select("id")
          .eq("schedule_id", schedule.id)
          .gte("scheduled_at", new Date(targetDate.getTime() - 60000).toISOString())
          .lte("scheduled_at", new Date(targetDate.getTime() + 60000).toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`Class already exists for schedule ${schedule.id} on ${scheduledAt}`);
          continue;
        }

        // Try to generate Google Meet link
        let meetingUrl = null;
        let meetingId = null;

        if (schedule.platform === "google_meet") {
          try {
            const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
            const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
            const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

            if (clientId && clientSecret && refreshToken) {
              // Get access token
              const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  client_id: clientId,
                  client_secret: clientSecret,
                  refresh_token: refreshToken,
                  grant_type: "refresh_token",
                }),
              });

              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                const accessToken = tokenData.access_token;

                // Create calendar event with Meet
                const endTime = new Date(targetDate.getTime() + schedule.duration_minutes * 60000);
                const event = {
                  summary: schedule.title,
                  description: schedule.description || "",
                  start: { dateTime: targetDate.toISOString(), timeZone: "UTC" },
                  end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
                  conferenceData: {
                    createRequest: {
                      requestId: crypto.randomUUID(),
                      conferenceSolutionKey: { type: "hangoutsMeet" },
                    },
                  },
                };

                const calendarResponse = await fetch(
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

                if (calendarResponse.ok) {
                  const calendarData = await calendarResponse.json();
                  meetingUrl = calendarData.conferenceData?.entryPoints?.find(
                    (ep: any) => ep.entryPointType === "video"
                  )?.uri;
                  meetingId = calendarData.id;
                }
              }
            }
          } catch (error) {
            console.error("Error generating Meet link:", error);
          }
        }

        // Create the live class
        const { error: insertError } = await supabase.from("live_classes").insert({
          course_id: schedule.course_id,
          batch_id: schedule.batch_id,
          target_student_id: schedule.target_student_id,
          schedule_id: schedule.id,
          title: schedule.title,
          description: schedule.description,
          scheduled_at: scheduledAt,
          duration_minutes: schedule.duration_minutes,
          platform: schedule.platform,
          meeting_url: meetingUrl,
          meeting_id: meetingId,
          host_id: schedule.host_id,
          status: "scheduled",
        });

        if (insertError) {
          console.error("Error creating live class:", insertError);
        } else {
          createdCount++;
          console.log(`Created live class for ${schedule.title} on ${scheduledAt}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${createdCount} live classes from ${schedules.length} schedules`,
        created: createdCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating scheduled classes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
