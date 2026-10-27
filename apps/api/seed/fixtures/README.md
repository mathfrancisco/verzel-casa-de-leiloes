# Fixtures do seed

Itens usados pelo `FakeCatalog` no seed de demonstração (`pnpm seed`). O seed não chama a API
externa. As cinco primeiras viram os lotes iniciais; a reposição automática de lotes
ao vivo (`refreshDemoLots`) reveza as dez.

São dez obras reais (pintura, gravura, fotografia, desenho, escultura, têxtil e cerâmica) do Art Institute of Chicago marcadas como domínio público (CC0). Os
metadados em `items.json` e as imagens `obra-*.jpg` (IIIF, 843 px de largura) foram copiados
uma única vez da API pública do museu e versionados aqui, para que o seed rode sem rede.
