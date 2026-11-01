import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to check their role
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client early for role lookups (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check requesting user's roles (may have multiple)
    const { data: callerRoleRows } = await supabaseAdmin.from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    const callerRoles: string[] = (callerRoleRows ?? []).map((r: any) => r.role);
    const allowed = ['superadmin', 'admin', 'jr_admin', 'sp_admin'];
    const callerRole = allowed.find((r) => callerRoles.includes(r)) ?? callerRoles[0];

    if (!callerRole || !allowed.includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check target user's roles (may have multiple)
    const { data: targetRoleRows } = await supabaseAdmin.from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const targetRoles: string[] = (targetRoleRows ?? []).map((r: any) => r.role);

    // Cannot delete superadmin
    if (targetRoles.includes('superadmin')) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete a superadmin account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // admin can't delete other admins; only superadmin can
    if (targetRoles.includes('admin') && callerRole !== 'superadmin') {
      return new Response(
        JSON.stringify({ error: 'Only superadmins can delete admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // jr_admin can only delete jr users
    if (callerRole === 'jr_admin' && !targetRoles.some((r) => ['jr_student', 'jr_admin'].includes(r))) {
      return new Response(
        JSON.stringify({ error: 'JR admins can only delete JR users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // sp_admin can only delete sp users
    if (callerRole === 'sp_admin' && !targetRoles.some((r) => ['sp_student', 'sp_admin'].includes(r))) {
      return new Response(
        JSON.stringify({ error: 'Self-paced admins can only delete self-paced users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Delete the auth user first when present
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    const deleteMessage = deleteError?.message?.toLowerCase() ?? '';
    const authUserMissing = deleteMessage.includes('not found') || deleteMessage.includes('user not found');

    if (deleteError && !authUserMissing) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up app data too, including legacy/orphaned rows with no auth user
    await Promise.all([
      supabaseAdmin.from('user_roles').delete().eq('user_id', userId),
      supabaseAdmin.from('profiles').delete().eq('user_id', userId),
      supabaseAdmin.from('jr_profiles').delete().eq('user_id', userId),
      supabaseAdmin.from('selfpaced_profiles').delete().eq('user_id', userId),
      supabaseAdmin.from('enrollments').delete().eq('user_id', userId),
      supabaseAdmin.from('jr_enrollments').delete().eq('user_id', userId),
      supabaseAdmin.from('selfpaced_enrollments').delete().eq('user_id', userId),
      supabaseAdmin.from('selfpaced_cart_items').delete().eq('user_id', userId),
      supabaseAdmin.from('selfpaced_wishlist').delete().eq('user_id', userId),
      supabaseAdmin.from('selfpaced_orders').delete().eq('user_id', userId),
      supabaseAdmin.from('batch_enrollments').delete().eq('user_id', userId),
      supabaseAdmin.from('jr_lesson_progress').delete().eq('user_id', userId),
      supabaseAdmin.from('jr_quiz_attempts').delete().eq('user_id', userId),
      supabaseAdmin.from('exam_quiz_attempts').delete().eq('user_id', userId),
    ]);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
