# Interclasse Interativo

Site demonstrativo responsivo para um campeonato escolar, feito com HTML, CSS e JavaScript puro. Os nomes, datas, jogos, placares, votações e notícias iniciais são fictícios e servem somente para ilustrar a interface.

## Arquivos

- `index.html`: estrutura das seções, conteúdo e navegação do site.
- `css/styles.css`: identidade visual azul-escuro, branco e laranja, incluindo os ajustes para telas menores.
- `js/app.js`: menu móvel, votação demonstrativa, notícias, galeria local, calendário e resultados.
- `assets/images/`: pasta reservada para imagens que venham a ser adicionadas ao projeto. As imagens escolhidas no formulário não são copiadas para esta pasta.

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
