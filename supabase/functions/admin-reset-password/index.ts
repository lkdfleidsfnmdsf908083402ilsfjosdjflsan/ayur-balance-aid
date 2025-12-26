import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create a client with the user's token to verify their identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !callingUser) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Benutzer konnte nicht identifiziert werden" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`User ${callingUser.id} attempting password reset`);

    // Check if the calling user is an admin using has_role function
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc('has_role', { _user_id: callingUser.id, _role: 'admin' });

    if (roleError) {
      console.error("Error checking role:", roleError);
      return new Response(
        JSON.stringify({ error: "Rollenprüfung fehlgeschlagen" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isAdmin) {
      console.error(`User ${callingUser.id} is not an admin`);
      return new Response(
        JSON.stringify({ error: "Nur Administratoren können Passwörter zurücksetzen" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { userId, newPassword }: ResetPasswordRequest = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "userId und newPassword sind erforderlich" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Passwort muss mindestens 6 Zeichen lang sein" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prevent admin from resetting their own password through this endpoint
    if (userId === callingUser.id) {
      return new Response(
        JSON.stringify({ error: "Sie können Ihr eigenes Passwort nicht über diese Funktion ändern" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Admin ${callingUser.id} resetting password for user ${userId}`);

    // Get target user info before reset
    const { data: targetUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const targetEmail = targetUserData?.user?.email;

    // Get admin profile for the email
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', callingUser.id)
      .single();

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Passwort konnte nicht geändert werden: " + updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Password successfully reset for user ${userId}`);

    // Send email notification to the user
    if (targetEmail) {
      try {
        const adminName = adminProfile?.name || 'Ein Administrator';
        
        await resend.emails.send({
          from: "Hotel Mandira <onboarding@resend.dev>",
          to: [targetEmail],
          subject: "Ihr Passwort wurde zurückgesetzt - Hotel Mandira KPI Dashboard",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px;">🔐 Passwort zurückgesetzt</h1>
              </div>
              
              <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hallo,</p>
                
                <p style="font-size: 16px;">
                  Ihr Passwort für das <strong>Hotel Mandira KPI Dashboard</strong> wurde von <strong>${adminName}</strong> zurückgesetzt.
                </p>
                
                <div style="background: #f8f9fa; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #856404;">
                    <strong>⚠️ Wichtig:</strong> Bitte ändern Sie Ihr Passwort bei der nächsten Anmeldung, um die Sicherheit Ihres Kontos zu gewährleisten.
                  </p>
                </div>
                
                <p style="font-size: 16px;">
                  Falls Sie diese Änderung nicht angefordert haben, wenden Sie sich bitte umgehend an die Administration.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                  Diese E-Mail wurde automatisch vom Hotel Mandira KPI Dashboard gesendet.
                </p>
              </div>
            </body>
            </html>
          `,
        });
        
        console.log(`Email notification sent to ${targetEmail}`);
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error("Error sending email notification:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Passwort wurde erfolgreich geändert" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
