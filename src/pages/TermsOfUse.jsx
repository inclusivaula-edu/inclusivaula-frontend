import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function TermsOfUse() {
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
            Termos de Uso
          </h1>
          <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
            Última atualização: 25 de junho de 2026
          </p>
        </div>

        <div style={{ fontSize: 14, color: "#2c2c2a", lineHeight: 1.75 }}>

          <Section title="1. Aceitação dos Termos">
            <p>
              Ao criar uma conta ou utilizar a plataforma InclusivAula, você declara ter lido, compreendido
              e concordado integralmente com estes Termos de Uso e com nossa{" "}
              <a href="/privacidade" style={{ color: "#2B9EC3" }}>Política de Privacidade</a>.
              Se você não concordar, não utilize os serviços.
            </p>
            <p>
              A plataforma é operada por <strong>INCLUSIVAULA TECNOLOGIA EDUCACIONAL I/S</strong>,
              CNPJ 63.800.274/0001-85.
            </p>
          </Section>

          <Section title="2. Descrição do Serviço">
            <p>
              A InclusivAula é uma plataforma SaaS (Software as a Service) voltada para profissionais de
              educação inclusiva, oferecendo:
            </p>
            <ul>
              <li>Geração de planos de aula adaptados a estudantes com NEE utilizando inteligência artificial;</li>
              <li>Emissão de relatórios pedagógicos (Semestral, Família, AEE, PEI, PAEE, Avaliação Pedagógica, Adequação Curricular, Termo de Ciência);</li>
              <li>Gestão de alunos, turmas, frequência e sessões de AEE;</li>
              <li>Geração de documentação em PDF conforme a legislação educacional brasileira.</li>
            </ul>
          </Section>

          <Section title="3. Cadastro e Conta de Usuário">
            <p>Para usar a plataforma, você deve:</p>
            <ul>
              <li>Ter capacidade civil para contratar (maior de 18 anos ou representante legal);</li>
              <li>Ser profissional da educação (professor, coordenador, diretor, profissional de AEE ou cargo equivalente);</li>
              <li>Fornecer informações verdadeiras, completas e atualizadas no cadastro;</li>
              <li>Manter a confidencialidade de sua senha e não compartilhar o acesso com terceiros.</li>
            </ul>
            <p>
              Você é inteiramente responsável por todas as ações realizadas com suas credenciais de acesso.
              Em caso de uso não autorizado, notifique-nos imediatamente em inclusivaula@gmail.com.
            </p>
          </Section>

          <Section title="4. Planos e Pagamento">
            <p>A InclusivAula oferece os seguintes planos:</p>
            <ul>
              <li><strong>Gratuito:</strong> com limites de uso mensal definidos na plataforma;</li>
              <li><strong>Planos pagos:</strong> com limites ampliados ou ilimitados, conforme descrito na página de planos.</li>
            </ul>
            <p>
              Os valores e condições dos planos pagos são exibidos na plataforma e podem ser alterados
              mediante aviso prévio de 30 dias. O pagamento é processado por meio de gateway de pagamento
              terceirizado (Mercado Pago). Não armazenamos dados de cartão de crédito.
            </p>
            <p>
              Assinaturas são renovadas automaticamente até que o usuário cancele. O cancelamento pode
              ser feito a qualquer momento, mantendo o acesso até o fim do período pago.
            </p>
          </Section>

          <Section title="5. Uso Aceitável">
            <p>É expressamente proibido:</p>
            <ul>
              <li>Utilizar a plataforma para fins ilegais ou que violem direitos de terceiros;</li>
              <li>Inserir dados de alunos sem a devida autorização dos responsáveis legais;</li>
              <li>Tentar contornar os limites de uso dos planos por meios técnicos;</li>
              <li>Fazer engenharia reversa, copiar ou redistribuir o código da plataforma;</li>
              <li>Usar os conteúdos gerados por IA como diagnósticos médicos, psicológicos ou laudos clínicos oficiais — os documentos são de suporte pedagógico;</li>
              <li>Compartilhar conteúdo que identifique alunos em redes sociais ou ambientes públicos.</li>
            </ul>
          </Section>

          <Section title="6. Conteúdo Gerado por Inteligência Artificial">
            <p>
              Os planos de aula, relatórios e documentos pedagógicos são gerados com auxílio de modelos de
              linguagem de inteligência artificial (IA). O usuário é responsável por:
            </p>
            <ul>
              <li>Revisar todo o conteúdo gerado antes de utilizá-lo ou compartilhá-lo;</li>
              <li>Adaptar o conteúdo à realidade específica de cada aluno;</li>
              <li>Garantir a conformidade com as diretrizes pedagógicas de sua rede de ensino.</li>
            </ul>
            <p>
              A InclusivAula não garante que o conteúdo gerado por IA seja isento de erros. O serviço
              é uma ferramenta de apoio pedagógico, não substituindo o julgamento profissional do educador.
            </p>
          </Section>

          <Section title="7. Responsabilidade sobre Dados de Alunos">
            <p>
              Ao inserir dados de alunos na plataforma (incluindo NEE, laudos, situação acadêmica), o
              profissional declara que:
            </p>
            <ul>
              <li>Possui autorização dos responsáveis legais para tratar esses dados;</li>
              <li>Age em conformidade com a LGPD e a legislação educacional aplicável;</li>
              <li>Assume responsabilidade pela veracidade e legalidade dos dados inseridos.</li>
            </ul>
            <p>
              A InclusivAula atua como <strong>operadora</strong> no tratamento desses dados, conforme Art. 5º, VII da LGPD,
              seguindo as instruções do controlador (escola/profissional cadastrado).
            </p>
          </Section>

          <Section title="8. Propriedade Intelectual">
            <p>
              Todo o código, design, marca e conteúdo da plataforma InclusivAula são de propriedade
              exclusiva da INCLUSIVAULA TECNOLOGIA EDUCACIONAL I/S. É vedada a reprodução total ou
              parcial sem autorização prévia e expressa.
            </p>
            <p>
              Os documentos pedagógicos gerados pelo usuário pertencem ao profissional/escola que os
              criou. A InclusivAula não reivindica propriedade sobre o conteúdo produzido pelos usuários.
            </p>
          </Section>

          <Section title="9. Disponibilidade e Limitação de Responsabilidade">
            <p>
              Buscamos manter a plataforma disponível 24 horas por dia, 7 dias por semana, mas não
              garantimos disponibilidade ininterrupta. A InclusivAula não se responsabiliza por:
            </p>
            <ul>
              <li>Interrupções de serviço causadas por terceiros (provedores de infraestrutura, OpenAI);</li>
              <li>Perda de dados resultante de uso indevido pelo usuário;</li>
              <li>Decisões pedagógicas baseadas exclusivamente no conteúdo gerado por IA;</li>
              <li>Danos indiretos, incidentais ou consequentes decorrentes do uso da plataforma.</li>
            </ul>
          </Section>

          <Section title="10. Rescisão">
            <p>
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos, sem
              aviso prévio em casos de uso fraudulento ou ilegal. Para encerramentos por outras razões,
              notificaremos com 30 dias de antecedência. Ao encerrar a conta, você poderá exportar seus
              dados antes da exclusão.
            </p>
          </Section>

          <Section title="11. Lei Aplicável e Foro">
            <p>
              Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de
              Macapá — AP para dirimir eventuais conflitos, renunciando as partes a qualquer outro,
              por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="12. Contato">
            <p>
              <strong>INCLUSIVAULA TECNOLOGIA EDUCACIONAL I/S</strong><br />
              CNPJ: 63.800.274/0001-85<br />
              Endereço: Av. Maximiano dos Santos Moura, 3267-A<br />
              E-mail: inclusivaula@gmail.com<br />
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
