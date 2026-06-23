import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("SITE_URL") || "https://www.inclusivaula.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function validarCNPJ(cnpj: string): boolean {
  const n = cnpj.replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const calc = (len: number): boolean => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(n.charAt(len - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return r === parseInt(n.charAt(len));
  };
  return calc(12) && calc(13);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, phone, schoolMode, school, inviteCode } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Cria o usuário
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name }
    });

    if (authError) throw new Error(authError.message);
    const userId = authData.user.id;

    // 2. Resolve school_id
    let schoolId: string;

    if (schoolMode === "criar") {
      if (!school?.name || !school?.city) throw new Error("Nome e cidade da escola são obrigatórios.");
      if (school.cnpj && !validarCNPJ(school.cnpj)) throw new Error("CNPJ inválido.");
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      const inviteCodeGerado = Array.from(bytes).map(b => b.toString(36)).join("").toUpperCase().substring(0, 10);
      const { data: newSchool, error: schoolError } = await supabaseAdmin
        .from("schools")
        .insert([{
          name: school.name, city: school.city,
          state: school.state || "AP", cnpj: school.cnpj || null,
          phone: school.phone || null, address: school.address || null,
          admin_user_id: userId, invite_code: inviteCodeGerado
        }])
        .select().single();
      if (schoolError) throw new Error(schoolError.message);
      schoolId = newSchool.id;
    } else if (schoolMode === "entrar") {
      if (!inviteCode) throw new Error("Código de convite obrigatório.");
      const { data: foundSchool, error: findError } = await supabaseAdmin
        .from("schools").select("id")
        .eq("invite_code", inviteCode.trim().toUpperCase()).single();
      if (findError || !foundSchool) throw new Error("Código de convite inválido.");
      schoolId = foundSchool.id;
    } else {
      throw new Error("Modo de escola inválido.");
    }

    // 3. Insere dados relacionais
    await supabaseAdmin.from("profiles").upsert([{
      id: userId, email, full_name, role: "teacher", school_id: schoolId
    }]);
    await supabaseAdmin.from("users").upsert([{
      id: userId, email, full_name, role: "teacher", school_id: schoolId
    }]);
    await supabaseAdmin.from("teachers").insert([{
      user_id: userId, school_id: schoolId,
      full_name, email, phone: phone || null, specialization: ""
    }]);

    // 4. Gera o link de confirmação
    const siteUrl = Deno.env.get("SITE_URL") || "https://www.inclusivaula.com.br";
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: { redirectTo: `${siteUrl}/` }
    });

    if (linkError) throw new Error("Erro ao gerar link de confirmação: " + linkError.message);

    const confirmationUrl = linkData?.properties?.action_link;
    if (!confirmationUrl) throw new Error("Link de confirmação não gerado.");

    // 5. Envia o email via Resend diretamente
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY não configurada.");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "InclusivAula <noreply@inclusivaula.com.br>",
        to: [email],
        subject: "Confirme seu cadastro na InclusivAula",
        html: `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f5f9ff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #2B9EC3; font-size: 24px; margin: 0;">
      Inclusiv<span style="color: #4CAF82;">Aula</span>
    </h1>
    <p style="color: #5f5e5a; font-size: 13px; margin: 4px 0 0;">Educação adaptada. Inclusão de verdade.</p>
  </div>

  <div style="background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #d3d1c7;">
    <h2 style="color: #2c2c2a; font-size: 18px; margin: 0 0 12px;">Olá, ${full_name}! 👋</h2>
    <p style="color: #5f5e5a; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
      Seu cadastro na InclusivAula foi realizado com sucesso!
    </p>
    <p style="color: #5f5e5a; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      Clique no botão abaixo para confirmar seu e-mail e acessar a plataforma:
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${confirmationUrl}"
        style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2B9EC3, #4CAF82); color: #fff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
        ✅ Confirmar e-mail
      </a>
    </div>
    <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
      Se você não criou uma conta na InclusivAula, ignore este e-mail.
    </p>
  </div>

  <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 20px;">
    InclusivAula · www.inclusivaula.com.br
  </p>
</div>
        `
      })
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Erro Resend:", JSON.stringify(emailData));
      // Usuário já foi criado — não falhar o cadastro por falha de email
      return new Response(JSON.stringify({
        success: true,
        message: "Cadastro realizado! O email de confirmação pode demorar alguns minutos."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Email enviado via Resend:", emailData.id);

    return new Response(JSON.stringify({
      success: true,
      message: "Cadastro realizado! Verifique seu e-mail para confirmar o acesso."
    }), {
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