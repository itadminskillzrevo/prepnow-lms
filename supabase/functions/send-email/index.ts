import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal SMTP client using raw TCP
async function sendSmtpEmail(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo: string;
  subject: string;
  body: string;
}) {
  const { host, port, username, password, from, to, cc, bcc, replyTo, subject, body } = config;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let conn: Deno.TlsConn | Deno.Conn;

  if (port === 465) {
    conn = await Deno.connectTls({ hostname: host, port });
  } else {
    conn = await Deno.connect({ hostname: host, port });
  }

  const read = async (): Promise<string> => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? decoder.decode(buf.subarray(0, n)) : "";
  };

  const write = async (cmd: string) => {
    await conn.write(encoder.encode(cmd + "\r\n"));
  };

  const writeAndRead = async (cmd: string): Promise<string> => {
    await write(cmd);
    return await read();
  };

  // Read greeting
  await read();

  // EHLO
  let ehloResp = await writeAndRead(`EHLO localhost`);

  // STARTTLS for port 587
  if (port === 587 && ehloResp.includes("STARTTLS")) {
    await writeAndRead("STARTTLS");
    conn = await Deno.startTls(conn as Deno.Conn, { hostname: host });
    ehloResp = await writeAndRead("EHLO localhost");
  }

  // AUTH LOGIN
  await writeAndRead("AUTH LOGIN");
  await writeAndRead(btoa(username));
  const authResp = await writeAndRead(btoa(password));
  if (!authResp.startsWith("235")) {
    conn.close();
    throw new Error("SMTP authentication failed: " + authResp.trim());
  }

  // MAIL FROM
  await writeAndRead(`MAIL FROM:<${from}>`);

  // RCPT TO - all recipients
  const allRecipients = [...to, ...(cc || []), ...(bcc || [])];
  for (const rcpt of allRecipients) {
    const rcptResp = await writeAndRead(`RCPT TO:<${rcpt}>`);
    if (!rcptResp.startsWith("250")) {
      console.warn(`RCPT TO failed for ${rcpt}: ${rcptResp.trim()}`);
    }
  }

  // DATA
  await writeAndRead("DATA");

  // Build email headers and body
  const headers = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    ...(cc && cc.length > 0 ? [`Cc: ${cc.join(", ")}`] : []),
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Date: ${new Date().toUTCString()}`,
  ];

  const emailData = headers.join("\r\n") + "\r\n\r\n" + body + "\r\n.\r\n";
  const dataResp = await writeAndRead(emailData);

  if (!dataResp.startsWith("250")) {
    conn.close();
    throw new Error("Failed to send email data: " + dataResp.trim());
  }

  // QUIT
  await writeAndRead("QUIT");
  conn.close();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require CRON_SECRET or a valid admin JWT
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedCron = Deno.env.get("CRON_SECRET");
  if (!expectedCron || cronSecret !== expectedCron) {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: uerr } = await supabase.auth.getUser(token);
      if (uerr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roleSet = new Set((roles ?? []).map((r: any) => r.role));
      if (!roleSet.has("admin") && !roleSet.has("superadmin")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }



  try {
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
    }

    const { to, cc, bcc, replyTo, subject, body } = await req.json();

    if (!to || to.length === 0) {
      throw new Error("'To' field is required and must have at least one recipient.");
    }
    if (!body || !body.trim()) {
      throw new Error("'Body' field is required.");
    }
    if (!replyTo || !replyTo.trim()) {
      throw new Error("'Reply-To' field is required.");
    }

    await sendSmtpEmail({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      username: SMTP_USER,
      password: SMTP_PASS,
      from: SMTP_USER,
      to: Array.isArray(to) ? to : [to],
      cc: cc && cc.length > 0 ? cc : undefined,
      bcc: bcc && bcc.length > 0 ? bcc : undefined,
      replyTo,
      subject: subject || "(No Subject)",
      body,
    });

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${Array.isArray(to) ? to.length : 1} recipient(s)` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
