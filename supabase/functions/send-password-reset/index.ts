import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

    // Check if user exists
    const { data: user } = await supabase.auth.admin.getUserByEmail(email);
    
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

    // Send email
    const resetUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${resetToken}&type=recovery&redirect_to=${encodeURIComponent(req.headers.get('origin') || '')}`;

    const { error: emailError } = await resend.emails.send({
      from: 'Stellar Spectre <noreply@stellarspectre.ai>',
      to: [email],
      subject: 'Reset Your Password - Stellar Spectre',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">🌟 Stellar Spectre</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Advanced Exoplanet Detection System</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">Password Reset Request</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">We received a request to reset your password for your Stellar Spectre account.</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">Click the button below to reset your password. This link will expire in 24 hours for security.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; 
                        font-weight: 600; font-size: 16px; margin: 10px 0;">
                Reset Password
              </a>
            </div>
          </div>
          
          <div style="border-left: 4px solid #ffc107; background: #fffbf0; padding: 15px; margin-bottom: 25px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This email was sent by Stellar Spectre Exoplanet Detection System.<br>
              If you're unable to click the button, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
        </div>
      `
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw new Error('Failed to send reset email');
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