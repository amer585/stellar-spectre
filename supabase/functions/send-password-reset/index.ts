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

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Check if user exists by querying auth.users via SQL (safer approach)
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .limit(1);
    
    if (userError) {
      console.error('Error checking user:', userError);
      // Return success anyway for security (don't reveal if user exists)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account with that email exists, you will receive a password reset link.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users && users.length > 0 ? users[0] : null;
    
    if (!user) {
      // Don't reveal if user exists for security
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account with that email exists, you will receive a password reset link.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store reset token
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error storing reset token:', insertError);
      throw new Error('Failed to create reset token');
    }

    // Generate reset URL
    const resetUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${resetToken}&type=recovery&redirect_to=${encodeURIComponent(req.headers.get('origin') || '')}`;

    // Log for now (email integration can be added later)
    console.log('Password reset requested for:', email);
    console.log('Reset URL:', resetUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'If an account with that email exists, you will receive a password reset link.',
        // Include reset URL in development for testing
        ...(Deno.env.get('ENVIRONMENT') === 'development' && { resetUrl })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in password reset:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});