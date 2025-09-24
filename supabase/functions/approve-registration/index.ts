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

    // Send notification email
    const emailSubject = action === 'approved' 
      ? 'Welcome to Stellar Spectre - Account Approved!' 
      : 'Stellar Spectre Registration Update';

    const emailContent = action === 'approved' ? `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">🌟 Stellar Spectre</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Advanced Exoplanet Detection System</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">🎉 Account Approved!</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your registration has been approved by our admin team.</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Welcome to the Future of Exoplanet Discovery!</h3>
          <p style="margin: 0 0 15px 0; color: #555; line-height: 1.6;">
            You now have access to our cutting-edge AI-powered exoplanet detection system. Here's what you can do:
          </p>
          <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
            <li><strong>Upload Light Curves:</strong> Submit your stellar photometry data</li>
            <li><strong>AI Analysis:</strong> Get instant transit detection with confidence scores</li>
            <li><strong>Advanced Processing:</strong> Support for images, CSV, Excel, and scientific datasets</li>
            <li><strong>Detailed Results:</strong> Orbital periods, transit depths, and statistical analysis</li>
          </ul>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="${Deno.env.get('SUPABASE_URL')}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; 
                      font-weight: 600; font-size: 16px;">
              Access Your Account
            </a>
          </div>
        </div>
        
        <div style="border-left: 4px solid #17a2b8; background: #f0f9ff; padding: 15px; margin-bottom: 25px;">
          <p style="margin: 0; color: #0c5460; font-size: 14px;">
            <strong>Getting Started:</strong> Log in with your registered email and start discovering exoplanets with our AI system!
          </p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Stellar Spectre - Advancing the Search for Life Beyond Earth<br>
            Questions? Contact our support team anytime.
          </p>
        </div>
      </div>
    ` : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">🌟 Stellar Spectre</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Advanced Exoplanet Detection System</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">Registration Update</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">We've reviewed your registration request.</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">
            Thank you for your interest in Stellar Spectre. Unfortunately, we're unable to approve your registration at this time.
          </p>
          <p style="margin: 0; color: #555; font-size: 14px;">
            If you have questions about this decision, please contact our support team.
          </p>
        </div>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: 'Stellar Spectre <noreply@stellarspectre.ai>',
      to: [request.email],
      subject: emailSubject,
      html: emailContent
    });

    if (emailError) {
      console.error('Error sending notification email:', emailError);
      // Don't fail the request if email fails
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