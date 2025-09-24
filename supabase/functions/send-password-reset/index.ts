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
    console.log('Password reset function called');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email } = await req.json();
    console.log('Password reset requested for email:', email);

    if (!email) {
      console.log('No email provided');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use Supabase's built-in password reset
    const redirectUrl = `${req.headers.get('origin') || 'https://your-app.com'}/auth`;
    console.log('Redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Supabase password reset error:', error);
      // Still continue to send notification email
    } else {
      console.log('Supabase password reset initiated successfully');
    }

    // Send custom email notification using fetch (like your Python script)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    console.log('API Key available:', !!RESEND_API_KEY);
    
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
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
                  Please check your email for the official password reset link from Supabase.
                </p>
                
                <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🔒 Security Notice</h3>
                  <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>The reset link will expire in 1 hour</li>
                    <li>You can only use the link once</li>
                    <li>If you didn't request this, you can safely ignore this email</li>
                  </ul>
                </div>
                
                <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                  If you continue to have issues accessing your account, please contact our support team.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                  © Stellar Spectre - Advanced Exoplanet Detection System
                </p>
              </div>
            </div>
          `,
        }),
      });

      const emailResult = await emailResponse.json();
      console.log("Email API response status:", emailResponse.status);
      console.log("Email API response:", emailResult);

      if (!emailResponse.ok) {
        console.error("Email sending failed:", emailResult);
        throw new Error(`Email API error: ${emailResult.message || 'Unknown error'}`);
      }

      console.log("Password reset notification email sent successfully!");
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Continue with success response for security
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'If an account with that email exists, you will receive a password reset link.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in password reset function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});