import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const errorResponse = (message: string) => jsonResponse({ success: false, error: message });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return errorResponse('Password service is not configured. Please contact support.');
    }
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Please sign in again before changing a password.');
    }

    // Create client with user's token to check their role
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      return errorResponse('Session expired. Please sign in again.');
    }

    let body: { userId?: string; newPassword?: string; currentPassword?: string; isSelfChange?: boolean };
    try {
      body = await req.json();
    } catch (_error) {
      return errorResponse('Invalid password change request.');
    }

    const { userId, newPassword, currentPassword, isSelfChange } = body;

    if (!newPassword || newPassword.length < 6) {
      return errorResponse('Password must be at least 6 characters');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // If user is changing their own password
    if (isSelfChange || userId === requestingUser.id) {
      if (currentPassword) {
        if (!requestingUser.email) {
          return errorResponse('Unable to verify the current password for this account.');
        }

        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
          email: requestingUser.email,
          password: currentPassword,
        });

        if (signInError) {
          return errorResponse('Current password is incorrect');
        }
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        requestingUser.id,
        { password: newPassword }
      );

      if (updateError) {
        return errorResponse(updateError.message);
      }

      return jsonResponse({ success: true, message: 'Password changed successfully' });
    }

    // Admin/Superadmin changing another user's password
    if (!userId) {
      return errorResponse('User ID is required');
    }

    // Check if requesting user is admin or superadmin
    const { data: callerRoleRows, error: callerRoleError } = await supabaseAdmin.from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);
    if (callerRoleError) {
      return errorResponse(callerRoleError.message);
    }

    const callerRoles: string[] = (callerRoleRows ?? []).map((r: any) => r.role);
    const allowed = ['admin', 'superadmin', 'jr_admin', 'sp_admin'];
    if (!callerRoles.some((r) => allowed.includes(r))) {
      return errorResponse('Only admins can change other users\' passwords');
    }

    const { data: targetRoleRows, error: targetRoleError } = await supabaseAdmin.from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (targetRoleError) {
      return errorResponse(targetRoleError.message);
    }

    const targetRoles: string[] = (targetRoleRows ?? []).map((r: any) => r.role);

    if (targetRoles.includes('superadmin') && !callerRoles.includes('superadmin')) {
      return errorResponse('Cannot change superadmin password');
    }
    if (targetRoles.includes('admin') && !callerRoles.includes('superadmin')) {
      return errorResponse('Only superadmins can change admin passwords');
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      return errorResponse(updateError.message);
    }

    return jsonResponse({ success: true, message: 'Password changed successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return errorResponse(message);
  }
});
