import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, enrollmentId, batchId, userId, finalPrice, couponId, discountAmount, coursePrice, isJr } = await req.json();

    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("Razorpay secret not configured");

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`)
    );
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Payment verification failed: invalid signature");
    }

    // Update enrollment in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const enrollmentTable = isJr ? "jr_enrollments" : "enrollments";
    const updatePayload: Record<string, any> = {
      payment_status: "completed",
      payment_method: "razorpay",
      payment_id: razorpay_payment_id,
      payment_amount: finalPrice,
      payment_date: new Date().toISOString(),
    };
    if (isJr) {
      updatePayload.approval_status = "pending";
    } else {
      updatePayload.approval_status = "pending";
      updatePayload.coupon_id = couponId || null;
      updatePayload.discount_amount = discountAmount || 0;
    }

    const { error: updateError } = await supabase
      .from(enrollmentTable)
      .update(updatePayload)
      .eq("id", enrollmentId);

    if (updateError) throw updateError;

    // Record coupon usage if applicable (main platform only)
    if (!isJr && couponId && userId) {
      await supabase.from("coupon_usage").insert({
        coupon_id: couponId,
        user_id: userId,
        enrollment_id: enrollmentId,
        course_id: null,
        discount_applied: discountAmount || 0,
        original_price: coursePrice || 0,
        final_price: finalPrice || 0,
      });
    }

    // Add to batch if applicable
    if (batchId && userId) {
      const { data: existing } = await supabase
        .from("batch_enrollments")
        .select("id")
        .eq("batch_id", batchId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("batch_enrollments").insert({
          batch_id: batchId,
          user_id: userId,
          status: "pending",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, paymentId: razorpay_payment_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verification error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
