import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, spOrderId } = await req.json();
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    // Verify HMAC
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const buf = await crypto.subtle.sign("HMAC", key, enc.encode(`${razorpay_order_id}|${razorpay_payment_id}`));
    const expected = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (expected !== razorpay_signature) throw new Error("Invalid signature");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order } = await supabase.from("selfpaced_orders").select("*").eq("id", spOrderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.razorpay_order_id !== razorpay_order_id) throw new Error("Order mismatch");

    await supabase.from("selfpaced_orders").update({
      status: "paid",
      razorpay_payment_id, razorpay_signature,
      paid_at: new Date().toISOString(),
    }).eq("id", spOrderId);

    if (order.coupon_code && Number(order.discount) > 0) {
      const { data: coupon } = await supabase.from("sp_coupons")
        .select("id").eq("code", order.coupon_code).maybeSingle();
      if (coupon) {
        const { data: existingUsage } = await supabase.from("sp_coupon_usage")
          .select("id").eq("order_id", spOrderId).maybeSingle();
        if (!existingUsage) {
          await supabase.from("sp_coupon_usage").insert({
            coupon_id: coupon.id,
            user_id: order.user_id,
            order_id: spOrderId,
            original_price: order.subtotal,
            discount_applied: order.discount,
            final_price: order.total,
          });
        }
      }
    }

    // Create enrollments
    const { data: items } = await supabase.from("selfpaced_order_items").select("course_id").eq("order_id", spOrderId);
    if (items?.length) {
      await supabase.from("selfpaced_enrollments").upsert(
        items.map((i: any) => ({ user_id: order.user_id, course_id: i.course_id, order_id: spOrderId })),
        { onConflict: "user_id,course_id" }
      );
      // clear cart
      await supabase.from("selfpaced_cart_items").delete().eq("user_id", order.user_id).in("course_id", items.map((i: any) => i.course_id));
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
