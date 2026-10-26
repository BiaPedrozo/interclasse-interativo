# Requisitos do sistema — Interclasse Interativo

## 1. Convenções de estado

- **Implementado:** comportamento localizado no código do protótipo.
- **Parcial:** há interface ou parte do comportamento, mas não há persistência, compartilhamento ou controle necessário ao uso completo.
- **Pendente:** não foi encontrado comportamento correspondente no código analisado.
- A presença do código não equivale a aprovação em testes de navegador. Os testes ainda devem ser executados conforme [`plano-de-testes.md`](plano-de-testes.md).

## 2. Requisitos funcionais

| ID | Requisito | Estado observado e evidência |
|---|---|---|
| **RF01** | Visualizar a página inicial, avisos e navegação principal. | **Implementado no protótipo.** A seção `#inicio` e o aviso demonstrativo estão em `index.html`. O menu usa âncoras e script móvel em `js/app.js`. Validação em navegadores pendente. |
| **RF02** | Consultar notícias e comunicados, incluindo destaque de comunicado. | **Implementado localmente.** Notícias iniciais são fictícias; o código permite cadastrar/remover e marcar notícias importantes. Dados ficam no `localStorage` do perfil atual. |
| **RF03** | Consultar calendário de partidas futuras e agendadas. | **Implementado localmente.** Cartões mostram data, hora, modalidade, duas turmas e local; novos jogos podem ser cadastrados. Agenda salva no `localStorage`. |
| **RF04** | Consultar resultados e placares de partidas concluídas. | **Implementado localmente.** Cartões de resultados são renderizados a partir dos dados demonstrativos e podem ser atualizados no painel. |
| **RF05** | Participar da votação do campeonato. | **Parcial.** Há seleção de candidato e mensagem de confirmação. O voto não é persistido, contabilizado ou submetido a um servidor; não representa uma votação real. |
| **RF06** | Consultar galeria de imagens. | **Implementado para demonstração local.** A galeria apresenta ilustrações CSS e fotos escolhidas no painel, guardadas no IndexedDB deste navegador. Não há publicação ou compartilhamento. |
| **RF07** | Cadastrar e gerenciar partidas pela área administrativa demonstrativa. | **Parcial.** É possível cadastrar partida. Não há edição de seus dados cadastrais nem exclusão. O painel não tem autenticação e é acessível a qualquer visitante. |
| **RF08** | Registrar e atualizar resultados. | **Implementado localmente.** Placar inteiro entre 0 e 99; partida existente selecionada; alteração de placar concluído pede confirmação. O resultado é persistido no `localStorage` local. |
| **RF09** | Cadastrar e gerenciar notícias. | **Parcial.** É possível criar e remover notícias e marcar comunicados importantes. Não há edição de notícia; dados locais não são publicados. |
| **RF10** | Gerenciar dados da votação (candidatos, votos e apuração). | **Pendente.** Não há cadastro de candidatos, persistência de votos, apuração ou administração de votação. As opções exibidas são fixas no HTML. |
| **RF11** | Selecionar imagens locais e adicioná-las à galeria de demonstração. | **Implementado localmente.** Formulário aceita até seis imagens de até 5 MB cada, verifica tipo de mídia e grava no IndexedDB. Não faz upload para servidor. |
| **RF12** | Exibir estado vazio quando não há notícias ou fotos locais. | **Implementado no código.** Há mensagens específicas na lista de notícias e na galeria. As ilustrações CSS são identificadas separadamente de fotos locais. |

## 3. Requisitos não funcionais

| ID | Requisito e critério verificável | Estado observado |
|---|---|---|
| **RNF01** | Responsividade: navegação e conteúdo devem se adaptar a celular e computador; verificar ao menos larguras abaixo de 680 px, entre 680–900 px e acima de 900 px. | **Implementado em CSS, validação pendente.** Há media queries em 680 px e 900 px. Não há evidência de teste visual em dispositivos/navegadores nesta entrega. |
| **RNF02** | Usabilidade: rótulos devem descrever ações; navegação principal deve levar às seções; formulários devem informar erros/sucesso. | **Parcialmente implementado.** Há navegação por âncoras e mensagens de feedback, mas a avaliação com usuários não foi feita. |
| **RNF03** | Validação: campos obrigatórios não vazios; placares inteiros de 0 a 99; imagem do tipo imagem, no máximo 5 MB, até seis por envio. | **Implementado no código.** Há atributos nativos HTML e verificações JavaScript. A execução dos casos de validação está pendente. |
| **RNF04** | Manutenibilidade: manter estrutura, estilos e lógica em arquivos separados, com identificadores e funções compreensíveis. | **Parcialmente atendido.** HTML, CSS e JavaScript estão separados. O CSS possui trechos compactados em linhas extensas e o JavaScript concentra vários recursos em um arquivo; refatoração futura pode melhorar leitura. |
| **RNF05** | Desempenho: carregamento e interação devem ser adequados à escala pequena prevista para uma demonstração escolar. Medir em ambiente definido antes de declarar metas. | **Não medido.** O projeto não usa frameworks; não foram executadas medições de tempo, tamanho de transferência ou escala. Não há métrica de desempenho aprovada. |
| **RNF06** | Segurança: proteger administração e dados contra acesso e alteração não autorizados. Critério de produção: autenticação/autorização no servidor e validação no backend. | **Pendente para produção.** A área administrativa é pública e não tem autenticação; os dados residem no navegador. Escape de conteúdo inserido reduz risco de injeção nos cartões, mas não substitui controles de servidor. |
| **RNF07** | Acessibilidade básica: foco visível, navegação por teclado, rótulos associados, regiões anunciadas e alternativas textuais para imagens. Verificar contraste e leitor de tela. | **Parcialmente implementado, auditoria pendente.** Há link para pular conteúdo, foco visível, rótulos, `aria-live`, Escape no menu e texto alternativo nas fotos locais. Contraste e operação com leitor de tela não foram auditados; ilustrações CSS não representam fotografias. |
| **RNF08** | Persistência: dados permanecem após recarga no mesmo navegador/perfil e limitações de armazenamento são informadas. | **Implementado localmente, limitado.** Notícias, partidas e placares em `localStorage`; fotos em IndexedDB. Voto não persiste. Limpeza do navegador, cotas, origem e dispositivo afetam disponibilidade. Não há sincronização nem backup. |

## 4. Regras de negócio

| ID | Regra |
|---|---|
| **RN01** | Dados iniciais, nomes, horários, resultados e notícias são fictícios. As áreas correspondentes devem manter identificação de demonstração. |
| **RN02** | Uma partida só pode ser cadastrada se data, horário, modalidade, turma 1, turma 2 e local estiverem preenchidos. |
| **RN03** | O cadastro de uma partida cria um novo item; não modifica nem remove partidas existentes. Não existe ação de exclusão de partidas na interface atual. |
| **RN04** | Um placar exige uma partida selecionada e dois números inteiros entre 0 e 99, inclusive. |
| **RN05** | O registro de placar transforma o jogo em concluído e atualiza a agenda/resultados após salvar. |
| **RN06** | A correção de placar de partida já concluída exige confirmação. Se a pessoa cancelar, o placar previamente salvo é mantido. |
| **RN07** | Partida sem resultado com data/hora futura aparece em Jogos futuros; sem resultado e com data/hora passada aparece em Aguardando resultado; com status concluído aparece em Resultados anteriores. A classificação usa o relógio local do navegador. |
| **RN08** | Uma notícia exige título, data e conteúdo; título tem até 90 caracteres e conteúdo até 500 caracteres. |
| **RN09** | A pessoa que cadastra uma notícia pode marcar o campo de destaque; a interface apresenta a etiqueta “Comunicado importante”. |
| **RN10** | Notícias podem ser removidas por botão explícito. Não há edição de notícia no protótipo. |
| **RN11** | Foto local exige legenda e pelo menos um arquivo de imagem; são aceitos até seis arquivos por envio, com limite de 5 MB por arquivo. |
| **RN12** | Selecionar uma opção de voto e enviar o formulário só atualiza a mensagem da interface. Não cria voto persistido nem altera contagem. |
| **RN13** | As operações de demonstração não são sincronizadas com outras pessoas. Uma área administrativa real deverá ter autorização e persistência central. |

## 5. Fora do escopo implementado / pendências funcionais

- Autenticação de administradores e permissões por perfil.
- Backend, API e banco de dados compartilhado.
- Persistência, apuração e prevenção a votos duplicados.
- Cadastro/edição de candidatos e gestão de ciclos de votação.
- Edição de dados cadastrais de partidas ou notícias.
- Remoção de imagens da galeria por interface administrativa.
- Upload de imagens para servidor, publicação e moderação.
- Histórico/auditoria de mudanças, backup e sincronização entre dispositivos.
