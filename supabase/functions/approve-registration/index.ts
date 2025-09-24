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

    // Send notification email to user
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    console.log('API Key available for approval email:', !!RESEND_API_KEY);
    
    try {
      if (action === 'approved') {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: [request.email],
            subject: "Welcome to Stellar Spectre - Registration Approved!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🔭 Stellar Spectre</h1>
                  <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Advanced Exoplanet Detection System</p>
                </div>
                
                <div style="padding: 40px 30px; background: white;">
                  <h2 style="color: #333; margin: 0 0 20px 0;">🎉 Registration Approved!</h2>
                  <p style="color: #666; line-height: 1.6; margin: 0 0 25px 0;">
                    Great news! Your registration request for Stellar Spectre has been approved. 
                    You can now access our advanced exoplanet detection system.
                  </p>
                  
                  <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🚀 What's Next?</h3>
                    <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Sign in to your account with your email and password</li>
                      <li>Upload stellar light curve data for analysis</li>
                      <li>Discover potential exoplanets using our AI-powered detection</li>
                      <li>Access your analysis history and results</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${req.headers.get('origin') || 'https://stellar-spectre.com'}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              text-decoration: none; 
                              padding: 15px 30px; 
                              border-radius: 8px; 
                              font-weight: bold; 
                              display: inline-block;
                              font-size: 16px;">
                      Launch Stellar Spectre
                    </a>
                  </div>
                  
                  <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Welcome to the future of exoplanet discovery! If you have any questions, 
                    feel free to reach out to our support team.
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
        console.log("Approval email API response status:", emailResponse.status);
        console.log("Approval email API response:", emailResult);

        if (!emailResponse.ok) {
          console.error("Approval email sending failed:", emailResult);
        } else {
          console.log("Approval email sent successfully!");
        }
      } else if (action === 'rejected') {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: [request.email],
            subject: "Stellar Spectre Registration Update",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🔭 Stellar Spectre</h1>
                  <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Advanced Exoplanet Detection System</p>
                </div>
                
                <div style="padding: 40px 30px; background: white;">
                  <h2 style="color: #333; margin: 0 0 20px 0;">Registration Update</h2>
                  <p style="color: #666; line-height: 1.6; margin: 0 0 25px 0;">
                    Thank you for your interest in Stellar Spectre. Unfortunately, we are unable to 
                    approve your registration at this time.
                  </p>
                  
                  <p style="color: #666; line-height: 1.6; margin: 0 0 25px 0;">
                    If you believe this is an error or would like to discuss your application further, 
                    please contact our support team.
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
        console.log("Rejection email API response status:", emailResponse.status);
        console.log("Rejection email API response:", emailResult);

        if (!emailResponse.ok) {
          console.error("Rejection email sending failed:", emailResult);
        } else {
          console.log("Rejection email sent successfully!");
        }
      }
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Continue with success response even if email fails
    }

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