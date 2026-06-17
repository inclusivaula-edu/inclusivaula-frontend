import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      email, password, full_name, phone,
      schoolMode, school, inviteCode
    } = await req.json();

    // Validações básicas
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Client com service_role — ignora RLS, pode fazer qualquer operação
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Cria o usuário no Auth com email de confirmação
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // exige confirmação de email
      user_metadata: { full_name }
    });

    if (authError) throw new Error(authError.message);
    const userId = authData.user.id;

    // 2. Resolve o school_id — cria escola nova ou entra via código
    let schoolId: string;

    if (schoolMode === "criar") {
      if (!school?.name || !school?.city) throw new Error("Nome e cidade da escola são obrigatórios.");

      // Gera código de convite único de 6 caracteres
      const inviteCodeGerado = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: newSchool, error: schoolError } = await supabaseAdmin
        .from("schools")
        .insert([{
          name: school.name,
          city: school.city,
          state: school.state || "AP",
          cnpj: school.cnpj || null,
          phone: school.phone || null,
          address: school.address || null,
          admin_user_id: userId,
          invite_code: inviteCodeGerado
        }])
        .select().single();

      if (schoolError) throw new Error(schoolError.message);
      schoolId = newSchool.id;

    } else if (schoolMode === "entrar") {
      if (!inviteCode) throw new Error("Código de convite obrigatório.");

      const { data: foundSchool, error: findError } = await supabaseAdmin
        .from("schools")
        .select("id")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (findError || !foundSchool) throw new Error("Código de convite inválido.");
      schoolId = foundSchool.id;

    } else {
      throw new Error("Modo de escola inválido.");
    }

    // 3. Insere dados relacionais — tudo com service_role, RLS não interfere
    await supabaseAdmin.from("profiles").upsert([{
      id: userId,
      email,
      full_name,
      role: "teacher",
      school_id: schoolId
    }]);

    await supabaseAdmin.from("users").upsert([{
      id: userId,
      email,
      full_name,
      role: "teacher",
      school_id: schoolId
    }]);

    await supabaseAdmin.from("teachers").insert([{
      user_id: userId,
      school_id: schoolId,
      full_name,
      email,
      phone: phone || null,
      specialization: ""
    }]);

    // 4. Envia email de confirmação via Supabase Auth
    await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: `${Deno.env.get("SITE_URL")}/`
      }
    });

    return new Response(JSON.stringify({ success: true, message: "Cadastro realizado! Confirme seu e-mail para acessar." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Erro no register-user:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});