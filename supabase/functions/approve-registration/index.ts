import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, action, adminUserId } = await req.json();

    if (!requestId || !action || !adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify admin permissions
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', adminUserId)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get registration request
    const { data: request, error: fetchError } = await supabase
      .from('user_registration_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: 'Registration request not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('user_registration_requests')
      .update({
        status: action,
        approved_by: adminUserId,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error('Failed to update request status');
    }

    // Log notification (email integration can be added later)
    console.log(`Registration ${action} for:`, request.email);
    console.log('Admin action by:', adminUserId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Registration ${action} successfully` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in approve registration:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});