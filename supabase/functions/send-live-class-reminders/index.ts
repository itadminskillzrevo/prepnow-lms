import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Require cron secret or admin JWT — prevents any signed-in user from triggering bulk notifications
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedCron = Deno.env.get('CRON_SECRET')
    if (!expectedCron || cronSecret !== expectedCron) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: uerr } = await supabase.auth.getUser(token)
      if (uerr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
      const roleSet = new Set((roles ?? []).map((r: any) => r.role))
      if (!roleSet.has('admin') && !roleSet.has('superadmin')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }



    const now = new Date()
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000)

    // Find live classes starting in about 15 minutes
    const { data: upcomingClasses, error: classError } = await supabase
      .from('live_classes')
      .select(`
        id,
        title,
        scheduled_at,
        meeting_url,
        platform,
        course_id,
        batch_id
      `)
      .gte('scheduled_at', fifteenMinutesFromNow.toISOString())
      .lte('scheduled_at', twentyMinutesFromNow.toISOString())
      .eq('status', 'scheduled')

    if (classError) throw classError

    console.log(`Found ${upcomingClasses?.length || 0} upcoming live classes`)

    const notifications: { user_id: string; title: string; message: string; type: string; link: string }[] = []

    for (const liveClass of upcomingClasses || []) {
      // Get enrolled students for this course/batch
      let enrolledStudents: any[] = []

      if (liveClass.batch_id) {
        // Get students from batch enrollment
        const { data: batchStudents } = await supabase
          .from('batch_enrollments')
          .select('user_id')
          .eq('batch_id', liveClass.batch_id)
          .eq('status', 'active')

        enrolledStudents = batchStudents || []
      } else {
        // Get all students enrolled in the course
        const { data: courseStudents } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('course_id', liveClass.course_id)
          .eq('approval_status', 'approved')
          .eq('status', 'active')

        enrolledStudents = courseStudents || []
      }

      console.log(`Found ${enrolledStudents.length} students for live class: ${liveClass.title}`)

      // Create notifications for each student
      for (const student of enrolledStudents) {
        // Check if notification already sent
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', student.user_id)
          .eq('link', `/calendar?classId=${liveClass.id}`)
          .eq('type', 'reminder')
          .gte('created_at', new Date(now.getTime() - 30 * 60 * 1000).toISOString())
          .maybeSingle()

        if (!existing) {
          notifications.push({
            user_id: student.user_id,
            title: '🔴 Live Class Starting Soon!',
            message: `"${liveClass.title}" starts in 15 minutes. Join via ${liveClass.platform}.`,
            type: 'reminder',
            link: liveClass.meeting_url || `/calendar?classId=${liveClass.id}`,
          })
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) throw notifError
      console.log(`Sent ${notifications.length} notifications`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        classesProcessed: upcomingClasses?.length || 0,
        notificationsSent: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending live class reminders:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})