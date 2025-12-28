import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  token: string;
  name: string;
  password: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, name, password }: RegisterRequest = await req.json();

    console.log("Processing registration for token:", token);

    // Validate inputs
    if (!token || !name || !password) {
      return new Response(
        JSON.stringify({ error: "Token, Name und Passwort sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Passwort muss mindestens 6 Zeichen lang sein" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch the invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      console.error("Invitation not found or expired:", inviteError);
      return new Response(
        JSON.stringify({ error: "Einladung ist ungültig oder abgelaufen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found invitation for:", invitation.email, "Role:", invitation.role);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    if (existingUser) {
      console.error("User already exists:", invitation.email);
      return new Response(
        JSON.stringify({ error: "Ein Account mit dieser E-Mail existiert bereits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user with admin API (auto-confirms email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        abteilung: invitation.abteilung,
      },
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Benutzer konnte nicht erstellt werden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created:", newUser.user.id);

    // Update profile with name and abteilung
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        name: name, 
        abteilung: invitation.abteilung 
      })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Non-fatal, continue
    }

    // Update user role (replace default 'mitarbeiter' with invited role)
    if (invitation.role !== 'mitarbeiter') {
      // Delete default role
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", newUser.user.id);

      // Insert correct role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: invitation.role });

      if (roleError) {
        console.error("Error setting role:", roleError);
      }
    }

    console.log("Role set to:", invitation.role);

    // Mark invitation as used
    const { error: updateError } = await supabaseAdmin
      .from("invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error marking invitation as used:", updateError);
    }

    console.log("Registration completed successfully for:", invitation.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Registrierung erfolgreich",
        email: invitation.email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in register-with-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Ein Fehler ist aufgetreten" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});