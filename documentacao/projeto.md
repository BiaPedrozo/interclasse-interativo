# Interclasse Interativo

## Capa

**Projeto acadêmico de Desenvolvimento de Sistemas**

**Título:** Interclasse Interativo  
**Integrantes:** ______________________________________________  
**Escola:** _________________________________________________  
**Turma:** __________________________________________________  
**Disciplina:** Desenvolvimento de Sistemas  
**Professor(a):** ____________________________________________  
**Ano:** 2026

> Os campos institucionais e de autoria permanecem editáveis. Este documento não presume o nome da escola, dos integrantes, da turma ou do professor.

## 1. Introdução

O Interclasse Interativo é um site demonstrativo destinado a apoiar a comunicação e a organização de um campeonato interclasse. A proposta reúne em uma interface as informações que costumam circular por diferentes canais: agenda de partidas, placares, notícias, comunicados, galeria e uma área de participação por votação.

O protótipo atual foi desenvolvido como aplicação estática no navegador, com HTML, CSS e JavaScript. Os dados de exemplo são fictícios. Notícias, partidas e resultados podem ser manipulados localmente no navegador; fotos selecionadas são armazenadas localmente. O formulário de votação apresenta uma confirmação, mas não registra nem contabiliza votos. Não há servidor, autenticação ou banco de dados.

## 2. Problema

Quando os avisos, horários, mudanças de agenda e resultados de um campeonato são divulgados em canais separados, estudantes e representantes podem ter dificuldade para localizar a versão mais recente das informações. A comissão organizadora também pode precisar repetir comunicados e atualizar placares em vários lugares. A participação da comunidade escolar depende, ainda, de meios acessíveis para acompanhar o evento e conhecer as atividades.

O projeto trata esse problema como uma oportunidade de centralizar a apresentação das informações do campeonato em um ponto de consulta. O protótipo não comprova que esses problemas ocorrem em uma escola específica; essa descrição é a motivação geral do sistema.

## 3. Justificativa

Uma interface única pode tornar a consulta à agenda e aos resultados mais direta, dar visibilidade a comunicados e facilitar a participação de estudantes. Para a comissão organizadora, uma área de demonstração permite experimentar cadastros de notícias e partidas e a atualização de placares.

Como o armazenamento atual é local ao navegador, o protótipo serve para demonstração e avaliação de interface, mas ainda não substitui uma plataforma compartilhada de publicação. A evolução para uso real exigiria persistência centralizada, controle de acesso, regras de privacidade e procedimentos de publicação adequados à comunidade escolar.

## 4. Objetivo geral

Desenvolver um sistema que centralize informações do campeonato interclasse e facilite sua organização e acompanhamento por meio de uma interface web responsiva.

## 5. Objetivos específicos

- Apresentar avisos, notícias e comunicados do campeonato.
- Exibir o calendário de partidas com data, horário, modalidade, turmas e local.
- Apresentar partidas concluídas e seus placares.
- Permitir, em modo demonstrativo, cadastrar partidas e registrar ou atualizar resultados.
- Disponibilizar uma galeria com ilustrações e fotos escolhidas localmente.
- Apresentar uma área de votação demonstrativa para o destaque do campeonato.
- Organizar a navegação para computadores e celulares.
- Documentar limites atuais e requisitos para uma futura versão compartilhada.

## 6. Público-alvo

- **Estudantes:** consultam avisos, notícias, partidas, resultados e galeria; podem experimentar o formulário de votação demonstrativa.
- **Representantes de turma:** acompanham informações das turmas e compartilham os avisos disponíveis.
- **Comissão organizadora:** experimenta os formulários locais de notícias, partidas, placares e fotos.

No protótipo, esses perfis são papéis conceituais. Não há autenticação ou autorização que diferencie um estudante de um administrador; qualquer pessoa com acesso à página pode abrir a área demonstrativa.

## 7. Escopo e funcionalidades observadas

O site contém uma página única com seções navegáveis: início, calendário, notícias e comunicados, votação, galeria e área administrativa. Os requisitos detalhados e seu estado estão em [`requisitos.md`](requisitos.md).

Estão implementados no código:

- navegação por âncoras e menu móvel;
- cartões gerados para partidas futuras, partidas passadas sem resultado e partidas concluídas;
- cadastro de partidas e registro/correção de placares com validação;
- notícias de demonstração, cadastro, destaque de comunicado e remoção;
- upload local de imagens para a galeria, com validação de tipo e tamanho;
- mensagens para listas sem conteúdo e feedback dos formulários;
- persistência local de notícias, partidas e resultados no `localStorage`, e fotos no `IndexedDB`.

> **Limite funcional:** a votação não persiste votos, não apresenta contagem e não possui administração de candidatos. A área administrativa é apenas uma demonstração local, sem login e sem publicação em servidor.

## 8. Tecnologias e arquitetura atuais

| Tecnologia/recurso | Uso observado |
|---|---|
| HTML5 | Estrutura semântica das seções, cartões e formulários. |
| CSS3 | Identidade visual e regras responsivas, incluindo pontos de quebra em 900 px e 680 px. |
| JavaScript puro | Navegação móvel, renderização dos dados, validação e interações da interface. |
| `localStorage` | Persistência local de notícias, partidas e resultados. |
| IndexedDB | Armazenamento local de imagens selecionadas. |
| Google Fonts | Carregamento opcional das fontes DM Sans e Space Grotesk pela rede. |

O navegador executa os arquivos diretamente. Não foram encontrados frameworks, bibliotecas de interface, API de servidor, banco de dados relacional ou mecanismo de autenticação no código analisado. O modelo entidade-relacionamento deste trabalho é uma proposta futura, não uma estrutura de dados implantada.

## 9. Regras de negócio resumidas

1. Dados iniciais são identificados como demonstração e não representam informações confirmadas de uma escola.
2. Uma partida nova exige data, horário, modalidade, duas turmas e local.
3. O placar requer uma partida selecionada e dois inteiros de 0 a 99.
4. Um resultado já concluído só é substituído após confirmação explícita; cancelar conserva o placar anterior.
5. Não existe ação de exclusão de partidas no painel atual.
6. Notícias exigem título, data e conteúdo; podem ser destacadas como comunicados importantes e removidas por ação explícita.
7. O formulário de voto mostra uma confirmação, mas não armazena o voto.
8. Os dados locais pertencem ao navegador e perfil atuais e não são compartilhados.

As regras completas estão em [`requisitos.md`](requisitos.md).

## 10. Modelagem do sistema

O diagrama de casos de uso representa estudantes e administradores como atores conceituais e indica a ausência de controle de acesso implementado. O diagrama entidade-relacionamento apresenta uma estrutura relacional possível para uma futura versão com servidor. Nenhum desses diagramas afirma que as entidades existam como tabelas atualmente.

Consulte [`diagramas.md`](diagramas.md) para os diagramas Mermaid e suas cardinalidades.

## 11. Testes

[`plano-de-testes.md`](plano-de-testes.md) contém casos para navegação, consulta, cadastros, validações, persistência, votação e acessibilidade básica. Os resultados descritos são resultados esperados; os casos estão marcados como **não executados**. A documentação não afirma aprovação sem execução e registro de evidências.

## 12. Conclusão

O protótipo reúne, em uma página responsiva, os principais pontos de consulta de um campeonato escolar e oferece interações locais para demonstrar cadastro de conteúdo e atualização de placares. A separação entre HTML, CSS e JavaScript facilita a identificação das partes principais do site. A persistência por navegador permite manter os dados de uma demonstração no mesmo perfil, mas não oferece compartilhamento, cópia de segurança ou controle de acesso.

Como resultado esperado em contexto acadêmico, o projeto permite exercitar estruturação de requisitos, interface web, validação de formulários, armazenamento no navegador, modelagem e planejamento de testes. O uso real depende de validação com a escola e de melhorias técnicas e organizacionais.

## 13. Pendências e próximos passos

1. Validar os requisitos e os conteúdos com a escola, sem publicar dados pessoais sem autorização.
2. Implementar backend, banco de dados e autenticação com perfis de acesso antes de disponibilizar uma administração real.
3. Persistir e contabilizar votos com regra de elegibilidade, prevenção contra votos duplicados e transparência do processo.
4. Adicionar edição segura de notícias e partidas, se necessária, com histórico de alterações; o protótipo atualmente não oferece edição de dados da partida.
5. Definir política de armazenamento, autorização e remoção de imagens, além de limites e direitos de uso.
6. Executar os casos do plano de testes em navegadores e tamanhos de tela definidos, registrar evidências e corrigir os problemas encontrados.
7. Revisar contraste, textos alternativos e navegação por tecnologias assistivas.

## Referências técnicas do projeto

- Arquivos do protótipo: `index.html`, `css/styles.css` e `js/app.js`.
- Instruções de execução e persistência: [`../README.md`](../README.md).
- Requisitos, diagramas e plano de testes deste documento.
