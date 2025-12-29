import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'readonly';
  abteilung: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { users, adminSecret } = await req.json() as { users: TestUser[], adminSecret: string };
    
    // Simple secret check
    if (adminSecret !== "mandira2025test") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const user of users) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === user.email);
        
        if (existingUser) {
          // Update password for existing user
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: user.password
          });
          
          // Update profile
          await supabaseAdmin.from('profiles').upsert({
            id: existingUser.id,
            email: user.email,
            name: user.name,
            abteilung: user.abteilung
          });
          
          // Update role - delete old and insert new
          await supabaseAdmin.from('user_roles').delete().eq('user_id', existingUser.id);
          await supabaseAdmin.from('user_roles').insert({
            user_id: existingUser.id,
            role: user.role
          });
          
          results.push({ email: user.email, success: true });
          continue;
        }

        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            abteilung: user.abteilung
          }
        });

        if (createError) {
          console.error(`Error creating user ${user.email}:`, createError);
          results.push({ email: user.email, success: false, error: createError.message });
          continue;
        }

        if (!newUser.user) {
          results.push({ email: user.email, success: false, error: "No user returned" });
          continue;
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
          id: newUser.user.id,
          email: user.email,
          name: user.name,
          abteilung: user.abteilung
        });

        if (profileError) {
          console.error(`Error creating profile for ${user.email}:`, profileError);
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
          user_id: newUser.user.id,
          role: user.role
        });

        if (roleError) {
          console.error(`Error assigning role for ${user.email}:`, roleError);
        }

        results.push({ email: user.email, success: true });
        console.log(`Successfully created user: ${user.email}`);
        
      } catch (userError: any) {
        console.error(`Error processing user ${user.email}:`, userError);
        results.push({ email: user.email, success: false, error: userError.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
