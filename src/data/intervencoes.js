/**
 * Banco de Intervenções — estratégias práticas curadas por perfil de NEE.
 * Fontes: DUA/CAST, TEACCH, Orton-Gillingham, Barkley, Renzulli,
 * Lei 13.146/2015, Decreto 7.612/2011 (Tecnologia Assistiva).
 * Mesmo referencial usado pelos agentes Nexus7 (REGRAS_NEE).
 */

export const CATEGORIAS = {
  sala: { label: "Em sala de aula", emoji: "🏫" },
  comunicacao: { label: "Comunicação", emoji: "💬" },
  avaliacao: { label: "Avaliação", emoji: "✏️" },
  ta: { label: "Tecnologia Assistiva", emoji: "🛠️" },
  familia: { label: "Com a família", emoji: "👨‍👩‍👧" }
};

export const INTERVENCOES = {
  "Autismo (TEA)": {
    fundamento: "TEACCH, ABA, Teoria da Mente (Baron-Cohen) · DSM-5 299.00 / CID-11 6A02",
    itens: [
      { cat: "sala", titulo: "Rotina visual da aula", como: "Monte um quadro com início, meio e fim da aula em pictogramas. Aponte cada etapa ao concluí-la. Reduz ansiedade por imprevisibilidade." },
      { cat: "sala", titulo: "Antecipação de transições", como: "Avise 5 minutos antes de qualquer mudança de atividade ('quando o timer tocar, vamos guardar o material'). Use timer visual." },
      { cat: "sala", titulo: "Interesse específico como gancho", como: "Descubra o hiperfoco do aluno (dinossauros, trens, números...) e use como contexto dos exercícios. Multiplicação com vagões de trem engaja mais que multiplicação abstrata." },
      { cat: "sala", titulo: "Redução de sobrecarga sensorial", como: "Posicione o aluno longe de janelas e ventiladores barulhentos. Permita fone abafador em atividades livres. Ilumine com luz natural quando possível." },
      { cat: "comunicacao", titulo: "Linguagem literal e direta", como: "Evite ironia, metáforas e ordens indiretas ('que tal guardarmos?' → 'guarde o caderno na mochila'). Uma instrução por vez." },
      { cat: "comunicacao", titulo: "CAA — Comunicação Alternativa", como: "Para alunos não-verbais ou minimamente verbais, use prancha de comunicação com pictogramas (PECS) ou app de CAA. Comece com 4-6 símbolos de alta frequência." },
      { cat: "avaliacao", titulo: "Avaliação por demonstração", como: "Substitua prova escrita por demonstração prática, portfólio ou apresentação sobre o tema — o conhecimento existe, o formato da prova é a barreira." },
      { cat: "ta", titulo: "Apps de rotina visual", como: "Niki Agenda, First Then Visual Schedule (gratuitos) — a família instala no celular e a rotina escolar vira previsível também em casa." },
      { cat: "familia", titulo: "Caderno de comunicação diária", como: "Registre 1 vitória do dia e 1 ponto de atenção. A família faz o mesmo em casa. Consistência escola-casa é o maior preditor de progresso no TEA." }
    ]
  },
  "TDAH": {
    fundamento: "Modelo de Autorregulação de Barkley, Teoria do Fluxo · DSM-5 314.01 / CID-11 6A05",
    itens: [
      { cat: "sala", titulo: "Blocos de 10-15 minutos", como: "Divida a aula em blocos curtos com pausa ativa entre eles (levantar, distribuir material, apagar o quadro). O cérebro TDAH renova o foco com movimento." },
      { cat: "sala", titulo: "Gamificação com feedback imediato", como: "Metas visíveis (barra de progresso no quadro), pontos por tarefa concluída, recompensa simbólica no fim. Feedback deve ser imediato — elogio na hora vale mais que nota na semana seguinte." },
      { cat: "sala", titulo: "Assento estratégico", como: "Primeira fileira, longe de porta e janela, perto do professor. Permita objeto de manipulação silencioso (fidget) — movimento nas mãos libera foco na mente." },
      { cat: "sala", titulo: "Instruções com objetivo explícito", como: "Comece cada atividade dizendo o que será feito, por que e quanto tempo dura. Escreva os passos no quadro — instrução só oral evapora." },
      { cat: "avaliacao", titulo: "Provas em etapas", como: "Divida a prova em 2-3 partes com pausas. Tempo extra de 25-50%. Destaque palavras-chave dos enunciados em negrito." },
      { cat: "avaliacao", titulo: "Avaliação contínua", como: "Substitua peso único da prova por observação semanal + projetos + participação. O TDAH rende de forma irregular — a média de muitos pontos é mais justa que um pico único." },
      { cat: "ta", titulo: "Timer visual", como: "Time Timer (físico ou app gratuito) — o tempo restante fica visível como área colorida. Transforma tempo abstrato em concreto." },
      { cat: "ta", titulo: "Apps de foco", como: "Forest (gratuito) para períodos de tarefa em casa. Fones de cancelamento de ruído em atividades individuais." },
      { cat: "familia", titulo: "Rotina de estudo curta em casa", como: "Oriente a família: 2 blocos de 15 min valem mais que 1 hora arrastada. Sempre no mesmo horário e local, sem celular à vista." }
    ]
  },
  "Dislexia": {
    fundamento: "Método Orton-Gillingham, Consciência Fonológica (Bradley & Bryant) · CID-11 6A03.0",
    itens: [
      { cat: "sala", titulo: "Formatação acessível de texto", como: "Fonte sem serifa (Arial, Verdana, OpenDyslexic), mínimo 14pt, espaçamento 1,5, parágrafos curtos, fundo creme em vez de branco puro." },
      { cat: "sala", titulo: "Método multissensorial", como: "Apresente conteúdo por 3 canais ao mesmo tempo: ler + ouvir + fazer. Ex.: soletrar palavra traçando as letras na areia enquanto fala os sons." },
      { cat: "sala", titulo: "Nunca leitura em voz alta forçada", como: "Não sorteie o aluno para ler em público — combine antecipadamente qual parágrafo ele lerá, para poder treinar antes. Preserva a autoestima." },
      { cat: "sala", titulo: "Régua de leitura", como: "Cartão com janela recortada que isola a linha lida. Reduz o 'nadar' das letras. Custa R$ 0,50 de cartolina." },
      { cat: "avaliacao", titulo: "Avaliação oral alternativa", como: "Permita responder oralmente ou por gravação de áudio. Avalie o conteúdo, não a ortografia (exceto em objetivos específicos de escrita)." },
      { cat: "avaliacao", titulo: "Leitor de prova", como: "Professor ou colega lê os enunciados em voz alta. Tempo extra de 50%. Enunciados curtos e diretos." },
      { cat: "ta", titulo: "Leitores de texto", como: "NaturalReader, @Voice (gratuitos) transformam qualquer texto em áudio. Audiobooks das obras literárias exigidas." },
      { cat: "familia", titulo: "Leitura compartilhada", como: "Oriente: ler PARA o filho continua importante — separa o prazer da história do esforço da decodificação. Alternar parágrafos (um cada) em textos curtos." }
    ]
  },
  "Discalculia": {
    fundamento: "Butterworth (2003), Representação Numérica Mental · CID-11 6A03.1",
    itens: [
      { cat: "sala", titulo: "Material concreto sempre", como: "Ábaco, material dourado, tampinhas, dinheiro de brinquedo. A abstração numérica só depois que a mão entendeu a quantidade." },
      { cat: "sala", titulo: "Linha numérica permanente", como: "Fixe uma reta numérica na mesa do aluno. Operações viram deslocamentos visíveis (somar = andar para a direita)." },
      { cat: "sala", titulo: "Matemática do cotidiano", como: "Contextualize tudo: troco da cantina, placar do futebol, receita de bolo. Número sem contexto não gruda." },
      { cat: "avaliacao", titulo: "Sem pressão de tempo", como: "Retire cronômetro de qualquer atividade de cálculo. Avalie o raciocínio registrado, não a velocidade. Aceite resolução por desenho." },
      { cat: "avaliacao", titulo: "Calculadora liberada", como: "Para problemas cujo objetivo é o raciocínio (não a operação), libere calculadora — como um óculos para a matemática." },
      { cat: "ta", titulo: "Apps visuais", como: "Khan Academy Kids, GeoGebra (gratuitos) — representação visual e manipulável dos conceitos." },
      { cat: "familia", titulo: "Jogos de tabuleiro", como: "Oriente a família: Ludo, dominó, jogos com dados desenvolvem senso numérico brincando. 15 min/dia vale mais que folha de continhas." }
    ]
  },
  "Deficiência intelectual": {
    fundamento: "ZDP (Vygotsky), Aprendizagem Mediada (Feuerstein) · DSM-5 317 / CID-11 6A00",
    itens: [
      { cat: "sala", titulo: "Um conceito por vez", como: "Fragmente o conteúdo: uma ideia por atividade, dominada antes da próxima. Reduza a quantidade, nunca a dignidade do conteúdo." },
      { cat: "sala", titulo: "Aprender fazendo", como: "Priorize atividades práticas e manipulativas. Conceito de metade? Corte a maçã. Sistema solar? Monte com bolas de isopor." },
      { cat: "sala", titulo: "Repetição em contextos variados", como: "Retome o mesmo conceito em formatos diferentes ao longo da semana (jogo, música, desenho, história). Repetição idêntica entedia; variada consolida." },
      { cat: "sala", titulo: "Reforço positivo imediato", como: "Comemore cada pequena conquista na hora. O senso de capacidade é o motor — este aluno frequentemente já coleciona experiências de fracasso." },
      { cat: "comunicacao", titulo: "Vocabulário do cotidiano", como: "Linguagem simples e concreta, frases curtas. Confirme a compreensão pedindo que reformule ('me conta com suas palavras')." },
      { cat: "avaliacao", titulo: "Avaliação por observação", como: "Registre progresso por observação comportamental e participação, não por prova tradicional. Compare o aluno com ele mesmo, nunca com a turma." },
      { cat: "ta", titulo: "Pictogramas e apps adaptados", como: "ARASAAC (banco gratuito de pictogramas), jogos educativos com níveis ajustáveis." },
      { cat: "familia", titulo: "Autonomia em casa", como: "Oriente: envolver em tarefas domésticas reais (pôr a mesa, separar roupas) desenvolve funções executivas e autoestima." }
    ]
  },
  "Altas Habilidades/Superdotação": {
    fundamento: "Modelo de Enriquecimento (Renzulli), Teoria dos Três Anéis · Res. CNE/CEB 2/2001",
    itens: [
      { cat: "sala", titulo: "Enriquecimento, não mais-do-mesmo", como: "Terminou antes? Nunca dê 'mais 10 exercícios iguais' — ofereça o problema-desafio, a pesquisa aberta, o nível seguinte. Repetição desmotiva e gera indisciplina." },
      { cat: "sala", titulo: "Projetos de pesquisa autônomos", como: "Negocie um projeto de interesse do aluno com produto final real (apresentação, maquete, vídeo). Reserve 1 horário semanal para ele avançar." },
      { cat: "sala", titulo: "Problemas abertos", como: "Prefira perguntas sem resposta única ('como você resolveria a falta de água da escola?') que exigem criatividade, não memória." },
      { cat: "sala", titulo: "Mentoria e monitoria", como: "Explicar para colegas consolida e desenvolve empatia — mas com moderação: o aluno AH/SD não é professor assistente gratuito." },
      { cat: "avaliacao", titulo: "Compactação curricular", como: "Avalie no início da unidade; o que já domina, pule — e use o tempo para aprofundamento. Formalize no PEI." },
      { cat: "familia", titulo: "Atenção ao socioemocional", como: "Oriente a família: assincronia (intelecto adulto, emoção infantil) gera frustração e isolamento. AH/SD também é público do AEE por lei." }
    ]
  },
  "Deficiência auditiva": {
    fundamento: "Bilinguismo (Skliar), Lei de Libras 10.436/2002 · CID-11 AB52",
    itens: [
      { cat: "sala", titulo: "Visual como canal principal", como: "Todo conteúdo oral precisa de equivalente visual simultâneo: escrita no quadro, imagem, vídeo legendado, gesto." },
      { cat: "sala", titulo: "Posição para leitura labial", como: "Fale sempre de frente, boca visível, sem contraluz. Não fale escrevendo no quadro de costas. Aluno na primeira fileira central." },
      { cat: "comunicacao", titulo: "Libras como primeira língua", como: "Para alunos surdos sinalizantes, Libras é L1 e português escrito é L2 — avalie a escrita como segunda língua, com critérios próprios." },
      { cat: "comunicacao", titulo: "Combine sinais de sala", como: "Estabeleça sinais visuais para rotinas (atenção, mudança de atividade, dúvida). A turma toda aprende — inclusão de mão dupla." },
      { cat: "avaliacao", titulo: "Enunciados visuais", como: "Provas com apoio de imagem, enunciados curtos em português direto. Permita resposta em Libras gravada em vídeo quando houver intérprete para tradução." },
      { cat: "ta", titulo: "Legendas automáticas", como: "Google Live Transcribe (gratuito) transcreve a fala do professor em tempo real no celular/tablet do aluno." },
      { cat: "familia", titulo: "Família sinalizante", como: "Oriente e encaminhe a família para curso básico de Libras (ofertas gratuitas em CAS/associações). Criança surda com família que sinaliza tem outro teto de desenvolvimento." }
    ]
  },
  "Baixa visão / Deficiência visual": {
    fundamento: "DUA (CAST), Orientação e Mobilidade · Lei 13.146/2015 Art. 74 · CID-11 9D90",
    itens: [
      { cat: "sala", titulo: "Alto contraste e ampliação", como: "Material com fonte 18pt+, contraste forte (preto no amarelo ou branco no preto). Teste com o aluno qual combinação funciona — varia por condição." },
      { cat: "sala", titulo: "Audiodescrição de tudo", como: "Descreva verbalmente cada imagem, gráfico e cena de vídeo ('no mapa, o Brasil está pintado de verde, ocupando metade da América do Sul...'). Vire hábito da turma." },
      { cat: "sala", titulo: "Ambiente previsível", como: "Não mude móveis de lugar sem avisar. Portas totalmente abertas ou fechadas (nunca entreabertas). Caminho livre até a mesa do aluno." },
      { cat: "sala", titulo: "Material tátil", como: "Maquetes, mapas com texturas (barbante, lixa, algodão), sólidos geométricos reais. O tato é o canal de imagem." },
      { cat: "avaliacao", titulo: "Prova ampliada ou oral", como: "Prova na fonte que o aluno enxerga (teste antes!), oral, ou em Braille se leitor. Tempo extra de 50% — ler com baixa visão cansa mais." },
      { cat: "ta", titulo: "Leitores de tela e lupas", como: "NVDA (gratuito, computador), TalkBack/VoiceOver (celular), lupa eletrônica ou app Magnifier. Encaminhe para avaliação de auxílios ópticos." },
      { cat: "familia", titulo: "Autonomia com segurança", como: "Oriente: superproteção atrofia. Deixar explorar a casa, servir o próprio copo, organizar o material — com supervisão, não substituição." }
    ]
  },
  "Deficiência física / Paralisia cerebral": {
    fundamento: "DUA (CAST), Posicionamento Terapêutico (Ayres) · CID-11 8D20",
    itens: [
      { cat: "sala", titulo: "Acessibilidade da estação de trabalho", como: "Mesa na altura da cadeira de rodas, material ao alcance, engrossadores de lápis (espuma), plano inclinado para escrita. Verifique posicionamento com o TO do aluno." },
      { cat: "sala", titulo: "Alternativas motoras equivalentes", como: "Para cada atividade motora, tenha a versão acessível: recortar → indicar onde o colega corta; escrever no quadro → ditar; educação física → função ativa adaptada (juiz, cronometrista, versão sentada)." },
      { cat: "comunicacao", titulo: "CAA para comprometimento oral", como: "Prancha de comunicação, app de CAA com varredura, ou acionadores. Dê TEMPO para a resposta — a lentidão motora não é lentidão cognitiva." },
      { cat: "avaliacao", titulo: "Avalie o saber, não o motor", como: "Prova oral, por apontamento, múltipla escolha adaptada, escriba (alguém escreve o que o aluno dita). Nunca reduza nota por caligrafia ou tempo motor." },
      { cat: "ta", titulo: "Acessibilidade digital", como: "Teclado ampliado/adaptado, mouse por joystick ou ocular, acionadores. Windows e Android têm acessibilidade nativa gratuita (controle por voz, teclado em varredura)." },
      { cat: "familia", titulo: "Articulação com a reabilitação", como: "Peça à família autorização para conversar com fisio/TO/fono do aluno — as metas terapêuticas e escolares devem se reforçar." }
    ]
  },
  "TDL (Transtorno do Desenvolvimento da Linguagem)": {
    fundamento: "Abordagem Naturalista, Teoria Sociocomunicativa (Bruner) · CID-11 6A01",
    itens: [
      { cat: "comunicacao", titulo: "Frases curtas, uma informação por vez", como: "'Pegue o caderno azul e abra na página 10 depois de guardar o estojo' → 'Guarde o estojo. (pausa) Agora pegue o caderno azul. (pausa) Abra na página 10.'" },
      { cat: "comunicacao", titulo: "Tempo de resposta sem pressa", como: "Conte até 10 em silêncio após perguntar. Não complete as frases do aluno nem responda por ele — o processamento é mais lento, não ausente." },
      { cat: "comunicacao", titulo: "Modelagem sem correção exposta", como: "Aluno: 'eu fazi o dever' → Professor: 'que bom que você FEZ o dever!'. Reformule certo, naturalmente, sem apontar o erro em público." },
      { cat: "sala", titulo: "Suporte visual permanente", como: "Acompanhe instruções orais com gestos, imagens e palavras-chave escritas. Rotina da aula ilustrada na parede." },
      { cat: "avaliacao", titulo: "Múltiplos canais de resposta", como: "Aceite demonstrar por desenho, apontamento, dramatização, escolha entre alternativas — a linguagem oral não é o único canal de evidência." },
      { cat: "familia", titulo: "Encaminhamento fonoaudiológico", como: "TDL exige intervenção fonoaudiológica. Articule escola-clínica: peça à fono as metas do semestre e reforce-as em sala." }
    ]
  }
};
