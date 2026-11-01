import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { courseIds, currency = "INR", couponCode = null, gateway = "razorpay" } = await req.json();
    if (!Array.isArray(courseIds) || courseIds.length === 0) throw new Error("courseIds required");
    if (gateway !== "razorpay" && gateway !== "orange_pg") throw new Error("Unsupported payment gateway");
    if (gateway === "orange_pg" && Deno.env.get("ORANGE_PG_UAT_ENABLED") !== "true") {
      throw new Error("Orange PG UAT is disabled");
    }

    const KEY_ID = gateway === "razorpay" ? Deno.env.get("RAZORPAY_KEY_ID") : null;
    const KEY_SECRET = gateway === "razorpay" ? Deno.env.get("RAZORPAY_KEY_SECRET") : null;
    if (gateway === "razorpay" && (!KEY_ID || !KEY_SECRET)) throw new Error("Razorpay not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error("Not authenticated");

    // Fetch server-authoritative prices
    const { data: courses, error: cErr } = await supabase
      .from("selfpaced_courses").select("id,title,price,currency").in("id", courseIds).eq("is_published", true);
    if (cErr) throw cErr;
    if (!courses || courses.length !== courseIds.length) throw new Error("Some courses unavailable");

    // Filter out already-owned
    const { data: owned } = await supabase.from("selfpaced_enrollments").select("course_id").eq("user_id", user.id).in("course_id", courseIds);
    const ownedSet = new Set((owned ?? []).map((r: any) => r.course_id));
    const items = courses.filter((c: any) => !ownedSet.has(c.id));
    if (items.length === 0) throw new Error("You already own all these courses");

    const subtotal = items.reduce((s: number, c: any) => s + Number(c.price), 0);

    // ---- Coupon validation (server authoritative) ----
    let discount = 0;
    let appliedCoupon: any = null;
    if (couponCode) {
      const { data: coupon } = await supabase.from("sp_coupons").select("*")
        .eq("code", String(couponCode).toUpperCase().trim()).eq("is_active", true).maybeSingle();
      if (!coupon) throw new Error("Invalid coupon code");
      const now = new Date();
      if (coupon.expiry_date && new Date(coupon.expiry_date) < now) throw new Error("This coupon has expired");
      if (new Date(coupon.start_date) > now) throw new Error("This coupon is not yet active");
      if (coupon.applicable_to === "specific_course" && !items.some((c: any) => c.id === coupon.course_id)) {
        throw new Error("This coupon is not valid for the selected courses");
      }
      if (coupon.min_purchase_amount && subtotal < Number(coupon.min_purchase_amount)) {
        throw new Error(`Minimum purchase amount is ${coupon.min_purchase_amount}`);
      }
      if (coupon.max_total_usage || coupon.coupon_type === "one_time") {
        const { count } = await supabase.from("sp_coupon_usage")
          .select("id", { count: "exact", head: true }).eq("coupon_id", coupon.id);
        const limit = coupon.coupon_type === "one_time" ? 1 : Number(coupon.max_total_usage);
        if ((count || 0) >= limit) throw new Error("This coupon has reached its usage limit");
      }
      if (coupon.per_user_limit) {
        const { count } = await supabase.from("sp_coupon_usage")
          .select("id", { count: "exact", head: true }).eq("coupon_id", coupon.id).eq("user_id", user.id);
        if ((count || 0) >= coupon.per_user_limit) throw new Error("You have already used this coupon");
      }
      const eligibleAmount = coupon.applicable_to === "specific_course"
        ? Number(items.find((c: any) => c.id === coupon.course_id)?.price ?? 0)
        : subtotal;
      discount = coupon.discount_type === "percentage"
        ? (eligibleAmount * Number(coupon.discount_value)) / 100
        : Number(coupon.discount_value);
      if (coupon.max_discount_limit && discount > Number(coupon.max_discount_limit)) discount = Number(coupon.max_discount_limit);
      discount = Math.max(0, Math.min(discount, eligibleAmount));
      appliedCoupon = coupon;
    }

    const total = Math.round((subtotal - discount) * 100) / 100;
    if (total <= 0) throw new Error("Order total must be greater than zero");
    const amountInPaise = Math.round(total * 100);

    // Create SP order row (pending)
    const { data: order, error: oErr } = await supabase.from("selfpaced_orders").insert({
      user_id: user.id, subtotal, discount, total, currency, status: "pending",
      coupon_code: appliedCoupon?.code ?? null,
    }).select("id,order_number").single();
    if (oErr) throw oErr;

    await supabase.from("selfpaced_order_items").insert(
      items.map((c: any) => ({ order_id: order.id, course_id: c.id, title: c.title, price: c.price }))
    );

    if (gateway === "orange_pg") {
      return new Response(JSON.stringify({
        spOrderId: order.id,
        orderNumber: order.order_number,
        amount: total,
        discount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create Razorpay order
    const rzp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`),
      },
      body: JSON.stringify({ amount: amountInPaise, currency, receipt: order.order_number.substring(0, 40), notes: { sp_order_id: order.id, user_id: user.id } }),
    });
    if (!rzp.ok) throw new Error("Razorpay order failed: " + await rzp.text());
    const rzpOrder = await rzp.json();
    await supabase.from("selfpaced_orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);

    return new Response(JSON.stringify({ orderId: rzpOrder.id, key: KEY_ID, spOrderId: order.id, orderNumber: order.order_number, amount: total, discount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
