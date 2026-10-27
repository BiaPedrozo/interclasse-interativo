# Interclasse Interativo

Site demonstrativo responsivo para um campeonato escolar, feito com HTML, CSS e JavaScript puro. Os nomes, datas, jogos, placares, votações e notícias iniciais são fictícios e servem somente para ilustrar a interface.

**Estado técnico:** a interface continua sendo front-end estático, mas o repositório agora inclui uma migração PostgreSQL para o Supabase em `supabase/migrations/`. Ela cria o banco, as regras de acesso e a classificação; ainda é necessário aplicá-la ao projeto Supabase e conectar a interface à API para haver sincronização compartilhada.

## Arquivos

- `index.html`: estrutura das seções, conteúdo e navegação do site.
- `css/styles.css`: identidade visual azul-escuro, branco e laranja, incluindo os ajustes para telas menores.
- `js/app.js`: menu móvel, votação demonstrativa, notícias, galeria local, calendário e resultados.
- `assets/images/`: pasta reservada para imagens que venham a ser adicionadas ao projeto. As imagens escolhidas no formulário não são copiadas para esta pasta.
- `documentacao/`: documentação acadêmica, requisitos, diagramas, banco proposto e plano de testes.
- `server/db/migrations/001_initial_schema.sql`: proposta de schema relacional; ainda não aplicada por um backend.
- `server/db/tests/schema-smoke-test.ps1`: teste do schema SQLite em memória para Windows.
- `supabase/migrations/20261027120000_initial_schema.sql`: migração PostgreSQL para Supabase, com RLS, autenticação por `auth.users`, validações de voto e bucket privado de galeria.

## Aplicar a migração no Supabase

1. No painel do projeto Supabase, abra **SQL Editor**, crie uma nova consulta e cole o conteúdo de `supabase/migrations/20261027120000_initial_schema.sql`.
2. Execute a consulta uma única vez. Alternativamente, com o Supabase CLI vinculado ao projeto, rode `supabase db push` na raiz do repositório.
3. Crie a primeira conta no **Authentication > Users**. O gatilho cria um perfil de estudante. Promova apenas uma conta autorizada a administradora pelo SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DA_CONTA_AUTORIZADA';
```

O bucket `gallery` é privado. A interface já consulta e atualiza notícias, partidas e resultados pelo Supabase quando a configuração estiver preenchida. O envio compartilhado de imagens permanece pendente de integração da galeria.

## Conectar a interface ao Supabase

1. Aplique primeiro a migração SQL ao projeto Supabase.
2. Em **Project Settings > API**, copie a chave **anon** ou **publishable**. Não use a chave `service_role` no navegador.
3. Cole a chave em `js/supabase-config.js`, no valor de `anonKey`.
4. Crie uma conta em **Authentication > Users** e promova-a a `admin` com o comando indicado acima.
5. Abra `index.html` por um servidor local. A área administrativa permite entrar com essa conta para publicar notícias, cadastrar partidas e registrar placares no banco compartilhado.

Com a chave vazia, o site continua em modo local de demonstração. A chave anon é pública por definição; a proteção dos dados depende das políticas RLS incluídas na migração.

## Como executar

Abra `index.html` em um navegador moderno. Para melhor suporte ao armazenamento de imagens, sirva a pasta com um servidor local estático de sua preferência e acesse o endereço local exibido por ele. Não é necessário instalar dependências específicas do projeto.

## Dados e imagens locais

- As notícias iniciais são conteúdo fictício. Notícias adicionadas ou removidas ficam no `localStorage` do navegador.
- Partidas e placares de demonstração, assim como novas partidas e resultados, ficam no `localStorage` do navegador.
- Imagens selecionadas no formulário ficam no `IndexedDB` do navegador. São arquivos locais do perfil atual e não são enviados para servidor.
- A galeria inclui quatro ilustrações CSS identificadas como ilustrações; o aviso de galeria vazia se refere a fotos locais cadastradas.
- Os dados podem desaparecer ao limpar os dados do site, usar outro navegador/perfil ou trocar de dispositivo. O espaço disponível depende do navegador. Cada imagem deve ter até 5 MB e cada cadastro aceita até seis imagens.
- A votação é somente demonstrativa e não é persistida.

Em uma versão publicada, seria necessário um serviço de backend com autenticação e armazenamento de mídia para compartilhar notícias e imagens com outros visitantes. O site atual não simula um envio ao servidor. A fonte DM Sans e Space Grotesk é carregada do Google Fonts quando há conexão com a internet; caso contrário, o navegador usa fontes alternativas.

## Como conferir calendário e resultados

1. Abra `index.html` ou sirva a pasta localmente. Na seção **Calendário de jogos**, confira as partidas futuras, com data, horário, modalidade, turmas e local, separadas dos resultados concluídos.
2. Acesse **Área admin → Gerenciar conteúdo → Cadastrar partida fictícia**. Envie o formulário vazio para ver a validação, depois preencha todos os campos e cadastre uma partida. Ela aparece na agenda e continua lá após recarregar a página.
3. Em **Registrar ou corrigir resultado**, escolha uma partida agendada e preencha os dois placares. Campos vazios, valores negativos, decimais ou acima de 99 não são aceitos. Ao salvar, a partida passa para **Resultados anteriores** e os cartões são atualizados.
4. Selecione um resultado já concluído. Os placares atuais aparecem nos campos. Ao salvar uma alteração, confirme a substituição; se cancelar, o resultado anterior permanece. Nenhuma partida é alterada ou excluída por navegar ou selecionar opções.

Todos esses fluxos são locais e demonstrativos. A listagem não sincroniza com outros navegadores ou dispositivos.

## Documentação e testes disponíveis

Consulte [`documentacao/README.md`](documentacao/README.md) para o índice dos documentos. Um teste de fumaça executado no Windows valida a sintaxe da migração e algumas restrições SQLite sem criar arquivo de banco:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\server\db\tests\schema-smoke-test.ps1
```

Esse teste não verifica um servidor web, autenticação ou persistência compartilhada. Os demais casos ainda estão no plano de testes como não executados ou pendentes do backend.
