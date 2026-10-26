# Documentação — Interclasse Interativo

Esta pasta reúne a documentação acadêmica e técnica do projeto. Os documentos descrevem o estado encontrado no código e distinguem funcionalidades existentes de propostas futuras.

## Documentos

- [`projeto.md`](projeto.md): apresentação acadêmica, escopo, objetivos, tecnologias, arquitetura, conclusão e pendências.
- [`requisitos.md`](requisitos.md): requisitos funcionais e não funcionais, regras de negócio e situação de implementação.
- [`diagramas.md`](diagramas.md): diagramas Mermaid de casos de uso e modelo entidade-relacionamento conceitual proposto.
- [`plano-de-testes.md`](plano-de-testes.md): casos manuais com procedimento, resultado esperado e estado de execução.

## Executar o site

Na pasta raiz do projeto, abra `index.html` em um navegador moderno. Para dar suporte mais previsível ao armazenamento de imagens, sirva a pasta raiz por um servidor HTTP estático local e abra o endereço local indicado pelo servidor. O projeto não precisa de instalação de dependências.

O site foi implementado com HTML, CSS e JavaScript sem frameworks. Notícias, partidas e resultados usam `localStorage`; fotos selecionadas ficam no `IndexedDB` do navegador. Esses dados não são enviados a um servidor nem compartilhados entre perfis ou dispositivos. A votação apenas mostra uma confirmação demonstrativa e não registra votos.

## Limites desta documentação

Os testes listados são propostas para execução manual. Nenhum resultado é declarado como aprovado sem evidência de execução. O modelo relacional é uma proposta futura: não existe banco de dados relacional no projeto atual.
