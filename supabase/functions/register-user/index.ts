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

// Vaga que cada cargo ocupa no plano gratuito
function slotDoCargo(cargo: string): string {
  if (cargo === "diretor") return "diretor";
  if (["coordenador", "coordenador_municipal", "coordenador_estadual", "secretario_municipal", "secretario_estadual"].includes(cargo)) return "coordenador";
  if (cargo === "aee") return "aee";
  return "professor";
}

const VAGAS_FREE: Record<string, number> = { diretor: 1, coordenador: 1, aee: 1, professor: 3 };
const ROTULO_SLOT: Record<string, string> = {
  diretor: "diretor(a)", coordenador: "coordenador(a) pedagógico(a)",
  aee: "profissional de AEE", professor: "professor(es)"
};

// Papéis que podem responder pela escola
const ROLES_GESTAO = ["coordenador", "diretor", "secretaria", "mec", "admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, phone, cargo, schoolMode, school, inviteCode, acceptedTerms } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // LGPD: consentimento explícito obrigatório
    if (acceptedTerms !== true) {
      return new Response(JSON.stringify({ error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Só cargos de escola se autocadastram. Funções de rede (secretaria de
    // educação, MEC) enxergam todas as escolas e são provisionadas pela equipe
    // InclusivAula pelo painel de administração — aceitá-las aqui deixava
    // qualquer pessoa sair do cadastro com um papel acima de diretor, bastando
    // escolher "cadastrar escola nova".
    const CARGO_TO_ROLE: Record<string, string> = {
      professor: "professor",
      aee: "professor",
      psicologo: "professor",
      outro: "professor",
      coordenador: "coordenador",
      diretor: "diretor",
    };

    const CARGOS_DE_REDE = [
      "coordenador_municipal", "coordenador_estadual",
      "secretario_municipal", "secretario_estadual",
    ];
    if (CARGOS_DE_REDE.includes(cargo)) {
      return new Response(JSON.stringify({
        error: "Acesso de secretaria de educação ou órgão gestor é liberado pela equipe InclusivAula. Escreva para inclusivaula@gmail.com."
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cargo desconhecido não vira papel elevado por engano: cai em professor.
    let role = CARGO_TO_ROLE[cargo || "professor"] || "professor";

    const ROLES_CAN_CREATE_SCHOOL = ["coordenador", "diretor"];
    if (schoolMode === "criar" && !ROLES_CAN_CREATE_SCHOOL.includes(role)) {
      return new Response(JSON.stringify({ error: "Apenas coordenadores, diretores ou autoridades podem cadastrar uma escola. Solicite o código de convite ao responsável da sua escola." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Segurança: quem entra por convite não assume cargo de gestão máxima da escola de outro.
    if (schoolMode === "entrar" && ["diretor", "secretaria"].includes(role)) {
      role = "coordenador";
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve a escola ANTES de criar o usuário (evita usuário órfão)
    let schoolIdEntrar: string | null = null;
    if (schoolMode === "entrar") {
      if (!inviteCode) throw new Error("Código de convite obrigatório.");
      const { data: foundSchool, error: findError } = await supabaseAdmin
        .from("schools").select("id")
        .eq("invite_code", inviteCode.trim().toUpperCase()).single();
      if (findError || !foundSchool) throw new Error("Código de convite inválido.");
      schoolIdEntrar = foundSchool.id;

      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, professores_limite")
        .eq("school_id", schoolIdEntrar)
        .single();

      const planoFree = !sub || sub.plan === "free";

      if (planoFree) {
        // Plano gratuito: 6 vagas com papéis — 1 diretor, 1 coordenador, 1 AEE, 3 professores
        const meuSlot = slotDoCargo(cargo || "professor");
        const { data: perfis } = await supabaseAdmin
          .from("profiles")
          .select("cargo")
          .eq("school_id", schoolIdEntrar);
        const ocupadas = (perfis || []).filter(p => slotDoCargo(p.cargo || "professor") === meuSlot).length;
        if (ocupadas >= VAGAS_FREE[meuSlot]) {
          return new Response(JSON.stringify({
            error: `O plano gratuito desta escola já preencheu a(s) ${VAGAS_FREE[meuSlot]} vaga(s) de ${ROTULO_SLOT[meuSlot]}. Peça ao administrador para fazer upgrade do plano ou use outro cargo disponível.`
          }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } else {
        // Plano pago: limite total de professores do plano
        const limite = sub?.professores_limite ?? 1;
        if (limite !== -1) {
          const { count } = await supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolIdEntrar);
          if ((count ?? 0) >= limite) {
            return new Response(JSON.stringify({ error: `Esta escola atingiu o limite de ${limite} professor(es) do plano atual. Peça ao administrador para fazer upgrade do plano.` }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
      }
    } else if (schoolMode !== "criar") {
      throw new Error("Modo de escola inválido.");
    }

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
    } else {
      schoolId = schoolIdEntrar!;
    }

    // 3. Insere dados relacionais
    await supabaseAdmin.from("profiles").upsert([{
      id: userId, email, full_name, role, cargo: cargo || "professor", school_id: schoolId,
      accepted_terms_at: new Date().toISOString()
    }]);
    await supabaseAdmin.from("users").upsert([{
      id: userId, email, full_name, role, cargo: cargo || "professor", school_id: schoolId
    }]);
    await supabaseAdmin.from("teachers").insert([{
      user_id: userId, school_id: schoolId,
      full_name, email, phone: phone || null, specialization: ""
    }]);

    // 3.1 Escolas criadas pela Administração Global nascem sem responsável.
    // O primeiro gestor que entrar por convite assume esse papel. A condição
    // `admin_user_id IS NULL` faz o UPDATE ser atômico: se dois gestores se
    // cadastrarem ao mesmo tempo, apenas o primeiro grava.
    if (schoolMode === "entrar" && ROLES_GESTAO.includes(role)) {
      const { data: assumida } = await supabaseAdmin
        .from("schools")
        .update({ admin_user_id: userId })
        .eq("id", schoolId)
        .is("admin_user_id", null)
        .select("id");
      if (assumida?.length) {
        console.log(`Escola ${schoolId} passou a ter ${email} como responsável.`);
      }
    }

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

    // 5. Envia o email via Resend
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
