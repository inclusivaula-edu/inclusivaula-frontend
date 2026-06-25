import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff", padding: "2rem 1rem" }}>
      <div style={{
        maxWidth: 760, margin: "0 auto",
        background: "#fff", border: "0.5px solid #d3d1c7",
        borderRadius: 16, padding: "2.5rem",
        boxShadow: "0 4px 24px rgba(43,158,195,0.06)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logo} alt="InclusivAula" style={{ height: 48, marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2B9EC3", margin: "0 0 6px" }}>
            Política de Privacidade
          </h1>
          <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
            Última atualização: 25 de junho de 2026
          </p>
        </div>

        <div style={{ fontSize: 14, color: "#2c2c2a", lineHeight: 1.75 }}>

          <Section title="1. Identificação do Controlador">
            <p>
              A plataforma InclusivAula é operada por <strong>INCLUSIVAULA TECNOLOGIA EDUCACIONAL I/S</strong>,
              pessoa jurídica de direito privado, inscrita no CNPJ sob o n.º <strong>63.800.274/0001-85</strong>,
              com sede na Av. Maximiano dos Santos Moura, 3267-A.
            </p>
            <p>
              Para questões relacionadas à privacidade e proteção de dados, entre em contato com nosso
              Encarregado de Dados (DPO) pelo e-mail: <strong>inclusivaula@gmail.com</strong>.
            </p>
          </Section>

          <Section title="2. Dados Coletados">
            <p>Coletamos os seguintes dados pessoais para a prestação dos nossos serviços:</p>
            <ul>
              <li><strong>Dados de cadastro:</strong> nome completo, e-mail profissional, telefone, cargo/função e escola vinculada.</li>
              <li><strong>Dados de alunos (dados sensíveis):</strong> nome, série, turma, tipo de necessidade educacional especial (NEE) — coletados pelo professor/responsável pedagógico, sob sua responsabilidade direta.</li>
              <li><strong>Dados de uso:</strong> registros de aulas geradas, relatórios, planos pedagógicos, sessões de AEE e frequência.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo, navegador e logs de acesso, coletados automaticamente para segurança e melhoria da plataforma.</li>
            </ul>
          </Section>

          <Section title="3. Finalidade do Tratamento">
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul>
              <li>Autenticação e controle de acesso à plataforma;</li>
              <li>Geração de aulas, relatórios pedagógicos e documentos de inclusão educacional com auxílio de inteligência artificial;</li>
              <li>Emissão de PDFs e documentos oficiais (PEI, PAEE, AEE, Ficha de Frequência, Avaliação Pedagógica);</li>
              <li>Controle de uso e aplicação dos planos de assinatura;</li>
              <li>Suporte técnico e comunicação com os usuários cadastrados;</li>
              <li>Cumprimento de obrigações legais e regulatórias.</li>
            </ul>
          </Section>

          <Section title="4. Dados de Crianças e Adolescentes">
            <p>
              A InclusivAula trata dados pedagógicos de alunos, incluindo menores de 18 anos, no contexto
              exclusivo da relação educacional. Esses dados são inseridos pelos professores e gestores escolares
              devidamente habilitados e que assumem, ao aceitar estes Termos, a responsabilidade pela
              legitimidade da coleta perante os responsáveis legais dos alunos.
            </p>
            <p>
              Seguimos integralmente os requisitos do <strong>Art. 14 da LGPD</strong> e do <strong>ECA (Lei 8.069/1990)</strong>
              para o tratamento de dados de crianças e adolescentes, aplicando o princípio do melhor interesse
              e a proteção reforçada.
            </p>
          </Section>

          <Section title="5. Base Legal para o Tratamento">
            <p>O tratamento dos dados pessoais é realizado com fundamento nas seguintes bases legais (Art. 7º e Art. 11 da LGPD):</p>
            <ul>
              <li><strong>Execução de contrato</strong> (Art. 7º, V): prestação dos serviços contratados;</li>
              <li><strong>Obrigação legal</strong> (Art. 7º, II): cumprimento de obrigações previstas na legislação educacional (LDB, LDBN, Decreto 7.611/2011);</li>
              <li><strong>Legítimo interesse</strong> (Art. 7º, IX): segurança da plataforma, prevenção a fraudes e melhoria dos serviços;</li>
              <li><strong>Consentimento</strong> (Art. 7º, I): para comunicações de marketing e notificações opcionais.</li>
            </ul>
          </Section>

          <Section title="6. Compartilhamento de Dados">
            <p>Não vendemos, alugamos ou cedemos seus dados a terceiros para fins comerciais. Os dados podem
            ser compartilhados apenas com:</p>
            <ul>
              <li><strong>OpenAI (EUA):</strong> para processamento das solicitações de geração de conteúdo pedagógico com IA. Os dados são transmitidos de forma pseudonimizada. A OpenAI é signatária do EU-US Data Privacy Framework.</li>
              <li><strong>Supabase (PostgreSQL):</strong> infraestrutura de banco de dados e autenticação.</li>
              <li><strong>Railway:</strong> hospedagem do servidor backend.</li>
              <li><strong>Vercel:</strong> hospedagem do frontend.</li>
              <li>Autoridades competentes, quando exigido por lei ou ordem judicial.</li>
            </ul>
          </Section>

          <Section title="7. Transferência Internacional de Dados">
            <p>
              Alguns de nossos subprocessadores (OpenAI, Supabase, Railway, Vercel) estão localizados nos
              Estados Unidos. Adotamos salvaguardas contratuais e técnicas adequadas para garantir a
              proteção dos dados transferidos, em conformidade com o Art. 33 da LGPD.
            </p>
          </Section>

          <Section title="8. Segurança dos Dados">
            <p>Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo:</p>
            <ul>
              <li>Criptografia TLS em todas as transmissões de dados;</li>
              <li>Autenticação segura via JWT com expiração automática;</li>
              <li>Controle de acesso por função (RLS — Row Level Security) no banco de dados;</li>
              <li>Rate limiting para prevenção de ataques de força bruta;</li>
              <li>Backups diários automatizados com retenção mínima de 7 dias.</li>
            </ul>
          </Section>

          <Section title="9. Retenção dos Dados">
            <p>
              Os dados são mantidos pelo período necessário à execução dos serviços contratados e pelo prazo
              legal aplicável. Após o encerramento da conta, os dados são excluídos em até <strong>90 dias</strong>,
              salvo obrigação legal de retenção.
            </p>
          </Section>

          <Section title="10. Direitos do Titular">
            <p>Nos termos do Art. 18 da LGPD, você tem direito a:</p>
            <ul>
              <li>Confirmar a existência de tratamento e acessar seus dados;</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
              <li>Revogar o consentimento, quando o tratamento for baseado nessa base legal;</li>
              <li>Peticionar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
            </ul>
            <p>Para exercer seus direitos, envie solicitação para <strong>inclusivaula@gmail.com</strong>. Respondemos em até 15 dias úteis.</p>
          </Section>

          <Section title="11. Cookies">
            <p>
              Utilizamos cookies estritamente necessários para o funcionamento da plataforma (autenticação e
              preferências de sessão). Não utilizamos cookies de rastreamento ou publicidade comportamental
              sem o seu consentimento explícito.
            </p>
          </Section>

          <Section title="12. Alterações nesta Política">
            <p>
              Podemos atualizar esta Política periodicamente. Quando fizermos alterações relevantes,
              notificaremos os usuários por e-mail ou aviso na plataforma com pelo menos 15 dias de antecedência.
              O uso continuado após esse prazo implica aceitação das novas condições.
            </p>
          </Section>

          <Section title="13. Contato e Encarregado de Dados (DPO)">
            <p>
              <strong>INCLUSIVAULA TECNOLOGIA EDUCACIONAL I/S</strong><br />
              CNPJ: 63.800.274/0001-85<br />
              Endereço: Av. Maximiano dos Santos Moura, 3267-A<br />
              E-mail DPO: inclusivaula@gmail.com<br />
              Site: www.inclusivaula.com.br
            </p>
          </Section>

        </div>

        <div style={{ marginTop: 40, textAlign: "center", borderTop: "0.5px solid #d3d1c7", paddingTop: 24 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "10px 28px", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 500, cursor: "pointer"
            }}
          >
            ← Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#2B9EC3", margin: "0 0 10px", borderBottom: "0.5px solid #d3d1c7", paddingBottom: 6 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
