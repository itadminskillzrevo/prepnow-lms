import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const hashFields = [
  "addlParam1",
  "addlParam2",
  "aggregatorID",
  "amount",
  "currencyCode",
  "customerEmailID",
  "customerMobileNo",
  "customerName",
  "merchantId",
  "merchantTxnNo",
  "payType",
  "returnURL",
  "transactionType",
  "txnDate",
] as const;

type Platform = "main" | "jr" | "selfpaced";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatTxnDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createSecureHash(hashText: string, secret: string, mode: string) {
  const encoder = new TextEncoder();
  if (mode === "sha256-prefix" || mode === "sha256-suffix") {
    const text = mode === "sha256-prefix" ? `${secret}${hashText}` : `${hashText}${secret}`;
    return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))));
  }
  if (mode === "hmac-sha256") {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(hashText))));
  }
  throw new Error(
    "Orange PG hash mode is not configured. Confirm the exact hash formula with ICICI and set ORANGE_PG_HASH_MODE.",
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let supabaseClient: ReturnType<typeof createClient> | null = null;
  let paymentAttemptId: string | null = null;
  try {
    if (Deno.env.get("ORANGE_PG_UAT_ENABLED") !== "true") {
      return jsonResponse({ error: "Orange PG UAT is disabled" }, 503);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) throw new Error("Authentication required");
    const token = authorization.slice("Bearer ".length);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase server configuration is incomplete");

    const supabase = createClient(supabaseUrl, serviceKey);
    supabaseClient = supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Authentication required");

    const { platform, recordId } = await req.json() as { platform?: Platform; recordId?: string };
    if (!recordId || (platform !== "main" && platform !== "jr" && platform !== "selfpaced")) {
      throw new Error("A valid platform and payment record are required");
    }

    let amount: number;
    let customerName = "";
    let customerEmail = user.email ?? "";
    let customerMobile = "";

    if (platform === "main" || platform === "jr") {
      const enrollmentTable = platform === "main" ? "enrollments" : "jr_enrollments";
      const courseTable = platform === "main" ? "courses" : "jr_courses";
      const profileTable = platform === "main" ? "profiles" : "jr_profiles";

      const { data: enrollment, error: enrollmentError } = await supabase
        .from(enrollmentTable)
        .select("id,user_id,course_id,payment_status")
        .eq("id", recordId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (enrollmentError) throw enrollmentError;
      if (!enrollment) throw new Error("Enrollment not found");
      if (enrollment.payment_status === "completed") throw new Error("This enrollment is already paid");

      const { data: course, error: courseError } = await supabase
        .from(courseTable)
        .select("price")
        .eq("id", enrollment.course_id)
        .maybeSingle();
      if (courseError) throw courseError;
      if (!course) throw new Error("Course not found");
      amount = Number(course.price);

      const { data: profile, error: profileError } = await supabase
        .from(profileTable)
        .select(platform === "jr" ? "full_name,email,parent_phone" : "full_name,email,phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      customerName = profile?.full_name ?? "";
      customerEmail = profile?.email ?? customerEmail;
      customerMobile = platform === "jr" ? profile?.parent_phone ?? "" : profile?.phone ?? "";
    } else {
      const { data: order, error: orderError } = await supabase
        .from("selfpaced_orders")
        .select("id,user_id,total,currency,status")
        .eq("id", recordId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order) throw new Error("Order not found");
      if (order.status !== "pending") throw new Error("This order is not awaiting payment");
      if (order.currency !== "INR") throw new Error("Orange PG UAT supports INR orders only");
      amount = Number(order.total);

      const { data: profile, error: profileError } = await supabase
        .from("selfpaced_profiles")
        .select("full_name,phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      customerName = profile?.full_name ?? "";
      customerMobile = profile?.phone ?? "";
    }

    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid payment amount");
    if (!customerName || !customerEmail || !customerMobile) {
      throw new Error("Complete the account profile with a name, email, and mobile number before paying.");
    }

    const endpoint = Deno.env.get("ORANGE_PG_INITIATE_URL");
    const merchantId = Deno.env.get("ORANGE_PG_MERCHANT_ID");
    const aggregatorId = Deno.env.get("ORANGE_PG_AGGREGATOR_ID");
    const secret = Deno.env.get("ORANGE_PG_SECURE_KEY");
    const returnUrl = Deno.env.get("ORANGE_PG_RETURN_URL");
    const hashMode = Deno.env.get("ORANGE_PG_HASH_MODE") ?? "";
    if (!endpoint || !merchantId || !aggregatorId || !secret || !returnUrl) {
      throw new Error("Orange PG UAT server settings are incomplete");
    }
    if (new URL(endpoint).hostname !== "pgpayuat.icicibank.com") {
      throw new Error("Orange PG UAT endpoint must use the ICICI UAT host");
    }
    if (new URL(returnUrl).protocol !== "https:") {
      throw new Error("Orange PG return URL must use HTTPS");
    }

    const merchantTxnNo = `SR${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().replaceAll("-", "").slice(0, 9).toUpperCase()}`;
    const requestFields: Record<(typeof hashFields)[number], string> = {
      addlParam1: "SKILLZREVO",
      addlParam2: platform,
      aggregatorID: aggregatorId,
      amount: amount.toFixed(2),
      currencyCode: "356",
      customerEmailID: customerEmail,
      customerMobileNo: customerMobile,
      customerName,
      merchantId,
      merchantTxnNo,
      payType: "0",
      returnURL: returnUrl,
      transactionType: "SALE",
      txnDate: formatTxnDate(new Date()),
    };
    const hashText = hashFields.map((field) => requestFields[field]).join("");
    const requestBody = {
      ...requestFields,
      secureHash: await createSecureHash(hashText, secret, hashMode),
    };

    const { data: attempt, error: attemptError } = await supabase
      .from("orange_pg_payment_attempts")
      .insert({
        merchant_txn_no: merchantTxnNo,
        user_id: user.id,
        platform,
        record_id: recordId,
        amount,
        status: "initiating",
      })
      .select("id")
      .single();
    if (attemptError) throw attemptError;
    paymentAttemptId = attempt.id;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20000),
    });
    const responseText = await response.text();
    let gatewayResponse: Record<string, unknown>;
    try {
      gatewayResponse = JSON.parse(responseText);
    } catch {
      throw new Error(`Orange PG returned a non-JSON response (${response.status})`);
    }
    if (!response.ok || gatewayResponse.responseCode !== "R1000") {
      await supabase.from("orange_pg_payment_attempts")
        .update({ status: "initiation_failed", response_code: String(gatewayResponse.responseCode ?? response.status) })
        .eq("id", attempt.id);
      throw new Error(`Orange PG initiation failed (${String(gatewayResponse.responseCode ?? response.status)})`);
    }

    const redirectUri = gatewayResponse.redirectURI;
    const tranCtx = gatewayResponse.tranCtx;
    if (typeof redirectUri !== "string" || typeof tranCtx !== "string" || !tranCtx) {
      throw new Error("Orange PG response is missing redirectURI or tranCtx");
    }
    const redirect = new URL(redirectUri);
    if (redirect.protocol !== "https:" || redirect.hostname !== "pgpayuat.icicibank.com") {
      throw new Error("Orange PG returned an unexpected redirect host");
    }
    redirect.searchParams.set("tranCtx", tranCtx);

    const { error: updateError } = await supabase
      .from("orange_pg_payment_attempts")
      .update({
        status: "initiated",
        tran_ctx: tranCtx,
        response_code: String(gatewayResponse.responseCode),
      })
      .eq("id", attempt.id);
    if (updateError) throw updateError;

    return jsonResponse({
      redirectUrl: redirect.toString(),
      merchantTxnNo,
      status: "initiated",
      notice: "UAT payment result is not verified by the LMS yet; access will not be granted automatically.",
    });
  } catch (error) {
    console.error("Orange PG initiation error:", error);
    if (supabaseClient && paymentAttemptId) {
      const { error: updateError } = await supabaseClient
        .from("orange_pg_payment_attempts")
        .update({ status: "initiation_failed" })
        .eq("id", paymentAttemptId);
      if (updateError) console.error("Failed to update Orange PG attempt status:", updateError);
    }
    return jsonResponse({ error: error instanceof Error ? error.message : "Orange PG initiation failed" }, 400);
  }
});
