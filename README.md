# Interclasse 2026 — Colégio Sinerge

Central responsiva do campeonato, desenvolvida com HTML, CSS, JavaScript e Supabase. A plataforma permite consultar turmas, calendário, resultados, classificação, enquetes, palpites, comunicados, galeria, destaques e mural moderado. A área administrativa autenticada gerencia esses dados; as permissões também são aplicadas no banco por RLS.

Não são pré-carregados resultados, datas, elencos, slogans, votações ou comunicados fictícios. A data do evento e as informações ainda não confirmadas permanecem vazias até a organização cadastrá-las. As cores iniciais das turmas são apenas escolhas de exibição editáveis.

## Arquivos

- `index.html`, `css/styles.css`, `js/app.js`: interface, estilos responsivos e interações.
- `js/supabase-client.js`: autenticação e operações com a API REST/Auth/Storage do Supabase.
- `js/supabase-config.js`: URL do projeto e chave publicável usada pelo navegador.
- `supabase/migrations/20261027120000_initial_schema.sql`: schema inicial, RLS e estruturas básicas.
- `supabase/migrations/20261123103000_reset_application_data_keep_users.sql`: limpeza destrutiva dos dados operacionais, preservando usuários e perfis.
- `supabase/migrations/20261123110000_interclasse_2026_platform.sql`: tabelas, políticas e funções adicionais da plataforma 2026.
- `server/db/tests/schema-smoke-test.ps1`: teste legado do schema SQLite; não valida as migrations PostgreSQL do Supabase.

## Aplicar a migração no Supabase

1. Faça backup e confirme o projeto vinculado e o histórico remoto com `supabase migration list --linked`.
2. Confira todas as migrations pendentes antes de qualquer `supabase db push`. Em particular, `20261123103000_reset_application_data_keep_users.sql` apaga turmas, partidas, resultados, notícias, mídias cadastradas, enquetes e outros dados operacionais; preserva `auth.users` e `public.profiles`. Não prossiga se essa limpeza não for desejada.
3. A migration da plataforma depende do schema inicial. Aplique migrations somente depois de confirmar a sequência e o histórico do ambiente. Não cole uma migration no SQL Editor se também usa o CLI sem registrar corretamente sua execução no histórico.
4. Crie a primeira conta no **Authentication > Users**. O gatilho cria um perfil de estudante. Promova apenas uma conta autorizada a administradora pelo SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DA_CONTA_AUTORIZADA';
```

O bucket `gallery` é privado; mídias e escudos são servidos por URLs assinadas. A migration da plataforma cria os recursos da galeria, dos palpites, do mural, dos destaques e das estatísticas.

## Reiniciar os dados do Supabase sem apagar usuários

A migration `supabase/migrations/20261123103000_reset_application_data_keep_users.sql` apaga os dados operacionais (incluindo turmas, modalidades, equipes, partidas, resultados, notícias, imagens cadastradas, enquetes, votos e auditoria). Ela preserva `auth.users` e `public.profiles`, mas remove a associação de turma (`profiles.class_id`) antes de apagar as turmas. O schema, as contas/perfis e o bucket `gallery` permanecem. Arquivos armazenados no bucket não são removidos por esta migration.

Faça um backup antes de aplicá-la. Com o Supabase CLI vinculado ao projeto correto, aplique-a uma única vez com `supabase db push`. Não a execute novamente após novos dados serem cadastrados. Evite colar o arquivo no SQL Editor se também usa o CLI: uma execução manual não registra automaticamente a migration no histórico do CLI e pode fazer com que ela seja aplicada novamente.

## Conectar a interface ao Supabase

1. Em **Project Settings > API**, configure `url` e a chave **anon/publishable** em `js/supabase-config.js`. A chave publicável pode estar no front-end; nunca use `service_role` no navegador.
2. Aplique as migrations corretas ao projeto Supabase conforme o histórico remoto, após backup e revisão da migration de reset.
3. Inicie um servidor HTTP estático na raiz do repositório e abra a página pelo endereço local.
4. Cadastre a conta administrativa e promova seu perfil via SQL. Cadastro público cria apenas perfil de estudante; não concede permissões administrativas.

Sem conexão ou antes de as tabelas estarem disponíveis, a interface identifica o problema e apresenta estados vazios, sem inventar resultados. Uma conexão funcional exige que migrations, URL e chave correspondam ao mesmo projeto Supabase. Proteja dados com as políticas RLS; não confie apenas nos controles visuais.

## Como executar

Abra `index.html` em um navegador moderno. Para melhor suporte ao armazenamento de imagens, sirva a pasta com um servidor local estático de sua preferência e acesse o endereço local exibido por ele. Não é necessário instalar dependências específicas do projeto.

## Dados, privacidade e moderação

- Dados do campeonato são persistidos no Supabase e compartilhados entre visitantes do mesmo projeto.
- O cadastro público cria contas de estudante; uma conta só pode votar ou enviar palpites se estiver ativa e vinculada a uma turma. Votos e palpites são limitados no banco.
- Resultados de enquetes e palpites são exibidos após o encerramento. Empates são representados sem atribuir vitória a uma turma.
- Mensagens do mural aguardam moderação. Mídias exigem confirmação de autorização antes da publicação; revise consentimento e regras escolares antes de publicar imagens identificáveis de estudantes.
- A galeria usa o bucket privado `gallery` e URLs temporárias assinadas. O reset SQL não apaga os arquivos já armazenados no bucket.
- Não inclua dados pessoais desnecessários. Restrinja contas administrativas e revise permissões e políticas antes de publicar.

As fontes DM Sans e Space Grotesk são carregadas do Google Fonts quando há conexão; o site usa alternativas locais quando indisponível.

## Documentação e testes disponíveis

Consulte [`documentacao/README.md`](documentacao/README.md) para o índice dos documentos. O teste de fumaça legado executa o schema SQLite em memória:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\server\db\tests\schema-smoke-test.ps1
```

Esse teste não valida as migrations PostgreSQL atuais nem testa autenticação, RLS, armazenamento ou integração real com Supabase. Para verificar a plataforma, use um projeto de teste e confirme cadastro, permissões, enquetes, palpites, moderação e upload antes da publicação.
