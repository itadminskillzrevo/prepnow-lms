import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const CreateUserSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().trim().max(120).optional().default(''),
  role: z.enum(['student', 'instructor', 'admin', 'superadmin', 'jr_student', 'jr_admin', 'sp_student', 'sp_admin']).default('student'),
})

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Your session has expired. Please sign in again.' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return jsonResponse({ error: 'Your session has expired. Please sign in again.' })
    }

    // Check if requesting user is admin or superadmin
    const { data: callerRoleRows } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)

    const callerRoles: string[] = (callerRoleRows ?? []).map((row: any) => row.role)
    const callerRole = ['superadmin', 'admin', 'jr_admin', 'sp_admin'].find((allowedRole) => callerRoles.includes(allowedRole))

    if (!callerRole) {
      return jsonResponse({ error: 'Admin access is required to add users.' })
    }

    const parsedBody = CreateUserSchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return jsonResponse({ error: parsedBody.error.issues[0]?.message ?? 'Invalid user details.' })
    }

    const { email, password, fullName, role: assignRole } = parsedBody.data
    const isJrRole = assignRole === 'jr_student' || assignRole === 'jr_admin'
    const isSpRole = assignRole === 'sp_student' || assignRole === 'sp_admin'

    if (callerRole === 'jr_admin' && !['jr_student', 'jr_admin'].includes(assignRole)) {
      return jsonResponse({ error: 'JR admins can only create JR users.' })
    }

    if (callerRole === 'sp_admin' && !['sp_student', 'sp_admin'].includes(assignRole)) {
      return jsonResponse({ error: 'Self-paced admins can only create self-paced users.' })
    }

    if (assignRole === 'superadmin' && callerRole !== 'superadmin') {
      return jsonResponse({ error: 'Only superadmins can create superadmin users.' })
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        is_jr: isJrRole,
        is_selfpaced: isSpRole,
      },
    })

    if (createError) {
      const message = createError.message.includes('known to be weak')
        ? 'This password is commonly used or compromised. Please choose a stronger, unique password.'
        : createError.message
      return jsonResponse({ error: message })
    }

    // Update role if trigger's default doesn't match the requested role
    if (newUser.user) {
      // Wait for trigger to create default role/profile
      await new Promise(resolve => setTimeout(resolve, 500))

      const defaultRole = isJrRole ? 'jr_student' : isSpRole ? 'sp_student' : 'student'
      const { data: newUserRoleRows } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', newUser.user.id)

      const newUserRoles = (newUserRoleRows ?? []).map((row: any) => row.role)

      if (assignRole !== defaultRole) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', newUser.user.id)
        await supabaseAdmin.from('user_roles').insert({
          user_id: newUser.user.id,
          role: assignRole,
        })
      } else if (!newUserRoles.includes(defaultRole)) {
        await supabaseAdmin.from('user_roles').insert({
          user_id: newUser.user.id,
          role: defaultRole,
        })
      }
    }

    return jsonResponse({ 
        success: true, 
        user: { 
          id: newUser.user?.id, 
          email: newUser.user?.email 
        } 
      })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return jsonResponse({ error: errorMessage })
  }
})
