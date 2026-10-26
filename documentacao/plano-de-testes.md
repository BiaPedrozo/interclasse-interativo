# Plano de testes — Interclasse Interativo

## 1. Objetivo e ambiente

Este plano descreve verificações manuais para as funções atuais do protótipo. Os casos abaixo são **não executados**: o campo de resultado registra o que se espera observar, e não um resultado medido. Executar em navegador atualizado, primeiro por servidor HTTP local estático para permitir avaliação do IndexedDB, e anotar navegador, versão, largura de tela, data e evidências.

## 2. Casos de teste

| ID | Objetivo | Procedimento | Resultado esperado | Situação |
|---|---|---|---|---|
| **CT01** | Abrir página inicial e navegar pelas seções. | Abrir `index.html`; usar cada item do menu e os links de chamada. | A página abre; links levam às seções correspondentes e o conteúdo demonstrativo está identificado. | Não executado |
| **CT02** | Verificar navegação móvel e teclado. | Em largura inferior a 680 px, abrir/fechar o menu; navegar por Tab; abrir menu e pressionar Escape. | Menu móvel alterna; Escape fecha e devolve foco ao botão; foco visível. | Não executado |
| **CT03** | Consultar partidas e resultados iniciais. | Abrir a seção Calendário de jogos. | Jogos futuros, pendentes (se existirem) e resultados concluídos aparecem separados; cartões exibem data, horário, modalidade, duas turmas e local. | Não executado |
| **CT04** | Validar cadastro de partida obrigatória. | Na área administrativa, tentar enviar o cadastro de partida em branco. | O navegador impede envio e indica campos obrigatórios, sem criar partida. | Não executado |
| **CT05** | Cadastrar e persistir partida. | Preencher data, hora, modalidade, duas turmas e local; cadastrar; recarregar a página. | Nova partida aparece na seção correspondente e permanece no mesmo perfil do navegador. | Não executado |
| **CT06** | Registrar placar válido. | Selecionar partida sem placar; inserir dois inteiros dentro do intervalo 0–99 e salvar. | Partida muda para concluída, placar aparece em Resultados anteriores, contagem administrativa atualiza e dado persiste após recarga. | Não executado |
| **CT07** | Rejeitar placar inválido. | Tentar enviar sem seleção, com placar vazio, negativo, decimal ou acima de 99. | Validação nativa ou da aplicação impede a gravação; resultado existente não muda. | Não executado |
| **CT08** | Confirmar e cancelar correção de placar. | Selecionar partida concluída, alterar placares e testar as opções confirmar e cancelar na caixa de diálogo. | Confirmar atualiza cartões e armazenamento. Cancelar conserva o placar anterior. | Não executado |
| **CT09** | Cadastrar uma notícia. | Tentar enviar formulário vazio; depois informar título, data e conteúdo, marcar ou não o destaque e salvar. | Campos obrigatórios são validados; cartão aparece com data/conteúdo e, quando marcado, com etiqueta de comunicado importante; permanece após recarga. | Não executado |
| **CT10** | Remover notícia por ação explícita e verificar estado vazio. | Remover notícias pelo botão correspondente até não restar nenhuma; recarregar. | Cada clique remove somente a notícia selecionada; lista vazia mostra mensagem e continua vazia após recarga. | Não executado |
| **CT11** | Adicionar imagem local válida. | Informar legenda e selecionar uma imagem com até 5 MB; adicionar e recarregar. | Imagem e legenda aparecem identificadas como foto local; contador atualiza; IndexedDB conserva o item no mesmo navegador/perfil. | Não executado |
| **CT12** | Validar cadastro de imagem. | Enviar sem legenda/arquivo; depois tentar arquivo não-imagem, maior que 5 MB ou mais de seis imagens. | Formulário solicita os campos; tipos/tamanhos/quantidades fora da regra não são gravados; feedback explica o problema. | Não executado |
| **CT13** | Conferir persistência e limites locais. | Criar notícia, partida, placar e foto; atualizar a página; abrir em outro perfil/dispositivo. | Dados persistem no mesmo perfil/origem se o navegador permitir; não aparecem no perfil/dispositivo separado. Nenhum dado é enviado a servidor. | Não executado |
| **CT14** | Verificar votação demonstrativa. | Escolher candidato e enviar; recarregar a página. | Interface mostra confirmação. Não há incremento persistente, apuração nem mudança dos candidatos. | Não executado |
| **CT15** | Verificar responsividade em larguras variadas. | Revisar páginas em largura menor que 680 px, entre 680–900 px e maior que 900 px, incluindo formulários e cartões. | Menu, cartões, listas e formulários permanecem legíveis e sem rolagem horizontal inesperada. Registrar defeitos; resultado visual ainda não foi medido. | Não executado |
| **CT16** | Verificar acessibilidade básica. | Percorrer com teclado; confirmar rótulos dos campos, textos alternativos, foco, mensagens `aria-live`; testar contraste e leitor de tela. | Controles são operáveis e identificáveis; eventuais falhas de contraste/semântica são registradas. Não presumir conformidade antes da avaliação. | Não executado |
| **CT17** | Confirmar limite de acesso da área administrativa. | Abrir o site sem login e navegar até Área admin. | A área está acessível publicamente. Registrar que esse comportamento é uma limitação do protótipo e impede uso administrativo real. | Não executado |

## 3. Registro de execução

Para transformar este plano em relatório de testes, preencher por caso executado: data, responsável, navegador/versão, largura de tela, resultado real (aprovado/reprovado), evidência e defeito relacionado. Não registrar “aprovado” somente com base no resultado esperado descrito acima.
