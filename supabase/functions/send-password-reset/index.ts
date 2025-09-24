import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Send password reset email
    try {
      const emailResponse = await resend.emails.send({
        from: "Stellar Spectre <onboarding@resend.dev>",
        to: [email],
        subject: "Reset Your Stellar Spectre Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔭 Stellar Spectre</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Advanced Exoplanet Detection System</p>
            </div>
            
            <div style="padding: 40px 30px; background: white;">
              <h2 style="color: #333; margin: 0 0 20px 0;">Password Reset Request</h2>
              <p style="color: #666; line-height: 1.6; margin: 0 0 25px 0;">
                We received a request to reset your password for your Stellar Spectre account. 
                Click the button below to create a new password.
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          text-decoration: none; 
                          padding: 15px 30px; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          display: inline-block;
                          font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                This link will expire in 24 hours. If you didn't request this password reset, 
                you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                © Stellar Spectre - Advanced Exoplanet Detection System
              </p>
            </div>
          </div>
        `,
      });

      console.log("Password reset email sent successfully:", emailResponse);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Continue with success response for security (don't reveal email sending failures)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'If an account with that email exists, you will receive a password reset link.'
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