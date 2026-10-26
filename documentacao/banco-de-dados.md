# Banco de dados e arquitetura — Interclasse Interativo

## Estado de implementação

**O projeto ainda não possui servidor, banco de dados persistente ou autenticação.** `server/db/migrations/001_initial_schema.sql` registra uma proposta de schema SQLite, executada com sucesso em memória pelo teste [`schema-smoke-test.ps1`](../server/db/tests/schema-smoke-test.ps1), usando a biblioteca SQLite nativa do Windows. O teste verificou sintaxe e algumas restrições, mas a migração ainda não foi aplicada a uma base persistente nem integrada a uma aplicação. Portanto, não há banco operacional.

## Arquitetura atual

O site é uma aplicação estática de navegador. `index.html`, `css/styles.css` e `js/app.js` compõem a interface e a lógica cliente. Notícias, partidas e resultados ficam em `localStorage`; fotos são blobs no IndexedDB. Esses mecanismos não oferecem sincronização entre pessoas, autorização de escrita, backup central nem validação de identidade. O voto é uma mensagem demonstrativa e não é armazenado.

## Arquitetura proposta

- **Runtime:** versão LTS suportada de Node.js.
- **Servidor HTTP/API:** Express 5, servindo os arquivos atuais e expondo endpoints JSON.
- **Persistência:** SQLite por meio de driver estável mantido para Node.js; consultas parametrizadas e transações.
- **Sessões:** cookie de sessão `HttpOnly`, `SameSite`, `Secure` em produção, com armazenamento persistente de sessões; senhas com derivação segura via mecanismo apropriado.
- **Proteções:** autorização por função no servidor, proteção CSRF para sessões por cookie, limite de tentativas de autenticação, cabeçalhos seguros, validação de entrada e log de auditoria.
- **Mídia:** uploads em pasta de armazenamento fora da raiz pública, com limites, MIME validado por conteúdo, nomes aleatórios, metadados no SQLite e confirmação de autorização para publicar imagens.
- **Cliente:** substituir as gravações de notícias/jogos/votos em `localStorage` por chamadas à API; manter apenas estado temporário de interface no navegador.

Essa escolha preserva HTML, CSS e JavaScript do site e acrescenta um servidor pequeno, com dependências explícitas. SQLite é adequado ao protótipo escolar hospedado em uma única instância e permite integridade relacional; caso vários servidores ou volume concorrente elevado sejam necessários, deve-se avaliar um banco servidor como PostgreSQL. A documentação oficial consultada em 26/10/2026 indica Node 24 como LTS; Express 5 aceita Node 18 ou superior. A API nativa `node:sqlite` ainda é release candidate e não foi escolhida como driver de produção. O ambiente atual não tem Node/npm disponíveis, então instalar runtime e pacotes requer autorização e validação de compatibilidade. Consulte [versões Node.js](https://nodejs.org/en/about/previous-releases), [Express 5](https://expressjs.com/en/5x/starter/installing/) e [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3).

## Modelo conceitual e lógico proposto

O arquivo de migração define as tabelas `users`, `school_classes`, `modalities`, `teams`, `athletes`, `matches`, `results`, `news`, `images`, `polls`, `candidates`, `votes` e `audit_log`.

### Relacionamentos

- `school_classes` 1:N `users` estudantes, `teams` e atletas indiretamente pelas equipes.
- `modalities` 1:N `teams` e `matches`.
- `teams` 1:N `athletes` e 1:N `matches`, em dois papéis: mandante e visitante.
- `matches` 1:0..1 `results`.
- `users` administradores 1:N notícias, partidas criadas, enquetes criadas, imagens enviadas e eventos de auditoria.
- `polls` 1:N `candidates` e 1:N `votes`.
- `athletes` 1:N candidaturas ao longo das enquetes; `candidates` 1:N `votes`.
- `users` estudantes 1:N votos em enquetes distintas; `UNIQUE(poll_id, student_id)` limita a um voto por estudante/enquete.

### Principais restrições

- Chaves primárias inteiras e chaves estrangeiras com exclusão restrita para não apagar registros que tenham histórico relacionado.
- Equipes associadas a uma turma e modalidade, únicas por `(class_id, modality_id)`; atletas únicos por nome dentro da equipe.
- Uma partida não pode associar a mesma equipe como mandante e visitante; a chave composta força as duas equipes a pertencerem à modalidade indicada.
- Índice único por local e horário de início para partidas não canceladas. Conflitos por sobreposição de duração exigem validação transacional adicional na aplicação.
- Placar não negativo, um resultado por partida e auditoria do administrador que o registrou.
- Voto único por estudante e enquete; a aplicação ainda deve verificar papel de estudante, janela de votação aberta e relação entre candidato e enquete dentro da transação.
- Arquivos limitados a JPEG/PNG/WebP/AVIF, máximo de 5 MiB, texto alternativo obrigatório e sinalizador de confirmação de autorização.
- Regras de pontuação por modalidade em colunas próprias e critérios de desempate em JSON validado. Uma implantação deve escolher quais modalidades e regras a escola realmente usa.

O diagrama ER detalhado e as cardinalidades estão em [`diagramas.md`](diagramas.md). O SQL é uma proposta de partida, não uma especificação definitiva de regras escolares.

## Configuração e inicialização

Ainda não há instruções executáveis para inicializar um banco persistente neste projeto, pois o servidor e as dependências não foram instalados. Após autorização para instalar Node.js e os pacotes escolhidos, o trabalho deverá:

1. Criar `package.json` e lockfile para registrar versões reproduzíveis.
2. Definir `DATABASE_PATH`, porta e segredo de sessão por variáveis de ambiente; manter segredos fora do repositório e fornecer somente valores vazios/de exemplo em `.env.example`.
3. Executar as migrações no startup ou por comando explícito, com backup antes de migração em banco já utilizado.
4. Criar a primeira conta administrativa por comando seguro de bootstrap, solicitando senha fora do código e armazenando apenas hash.
5. Inserir dados de demonstração identificados como fictícios por script separado, executado só em banco de desenvolvimento.
6. Fazer backup do arquivo SQLite e do diretório de mídia por procedimento documentado.

Nenhuma senha, chave ou credencial real deve ser adicionada ao repositório. Não use o arquivo de demonstração como repositório de dados reais de alunos.

### Verificação de schema executada

O script de teste abriu SQLite em memória, executou toda a migração e testou inserções válidas, unicidade de resultado por partida, unicidade de voto por estudante/enquete, chaves estrangeiras, placar negativo, conflito exato de local/horário e pertencimento de candidato à enquete. Esses testes passaram nesta máquina em 26/10/2026. Eles não cobrem API, autenticação, comportamento multiusuário, classificação, upload real, backup ou ambiente de produção.

## Pendências de segurança e operação

O protótipo atual não pode garantir acesso administrativo restrito nem votação contra duplicidade em ambiente compartilhado. Para uma implantação real, também são necessários HTTPS, configuração de cookies e origem, política de retenção, gestão de backups, autorização para fotos, minimização de dados de menores e revisão de segurança. O SQL isolado não fornece essas garantias.
