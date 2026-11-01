import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserImport {
  email: string
  password: string
  fullName?: string
  role?: string
}

interface ImportResult {
  email: string
  success: boolean
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify requesting user is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleRows } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)

    const callerRoles = (roleRows ?? []).map((r: any) => r.role)
    const callerRole = ['superadmin', 'admin', 'jr_admin', 'sp_admin'].find((r) => callerRoles.includes(r))
    const roleData = callerRole ? { role: callerRole } : null

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { users } = await req.json() as { users: UserImport[] }

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No users provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (users.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Maximum 100 users per import' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: ImportResult[] = []
    const validRoles = ['student', 'instructor', 'admin', 'superadmin', 'jr_student', 'jr_admin', 'sp_student', 'sp_admin']

    for (const user of users) {
      try {
        if (!user.email || !user.password) {
          results.push({ email: user.email || 'unknown', success: false, error: 'Email and password required' })
          continue
        }

        if (user.password.length < 6) {
          results.push({ email: user.email, success: false, error: 'Password must be at least 6 characters' })
          continue
        }

        const assignRole = validRoles.includes(user.role || '') ? user.role! : 'student'
        const isJrRole = assignRole === 'jr_student' || assignRole === 'jr_admin'
        const isSpRole = assignRole === 'sp_student' || assignRole === 'sp_admin'

        if (assignRole === 'superadmin' && roleData.role !== 'superadmin') {
          results.push({ email: user.email, success: false, error: 'Only superadmins can create superadmin users' })
          continue
        }

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.fullName || '',
            is_jr: isJrRole,
            is_selfpaced: isSpRole,
          },
        })

        if (createError) {
          results.push({ email: user.email, success: false, error: createError.message })
          continue
        }

        const defaultRole = isJrRole ? 'jr_student' : isSpRole ? 'sp_student' : 'student'
        if (assignRole !== defaultRole && newUser.user) {
          await new Promise(resolve => setTimeout(resolve, 300))
          await supabaseAdmin.from('user_roles').delete().eq('user_id', newUser.user.id)
          await supabaseAdmin.from('user_roles').insert({
            user_id: newUser.user.id,
            role: assignRole,
          })
        }

        results.push({ email: user.email, success: true })
        console.log(`Successfully created user: ${user.email}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({ email: user.email, success: false, error: errorMessage })
        console.error(`Failed to create user ${user.email}:`, errorMessage)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`Bulk import complete: ${successCount} success, ${failCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: { total: users.length, success: successCount, failed: failCount }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Bulk import error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
