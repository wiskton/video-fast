# Video Fast

Extensão para **Chrome** e **Firefox** (Manifest V3) que acelera automaticamente
qualquer vídeo de qualquer site e permite aumentar o ganho de volume além do máximo
nativo do navegador, com uma lista de exceções por URL.

## Instalação (modo desenvolvedor)

### Chrome / Edge / Brave

1. Acesse `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta deste projeto.

### Firefox

1. Acesse `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária** e selecione o arquivo `manifest.json`.
   (Extensões temporárias são removidas ao fechar o Firefox; para uma instalação
   permanente é necessário assinar o pacote via addons.mozilla.org ou usar o Firefox
   Developer/Nightly com `xpinstall.signatures.required = false`.)

Não é necessário nenhum passo de build — a extensão roda diretamente a partir do
código-fonte (JavaScript puro, sem bundler, sem dependências externas).

## Funcionalidades

- **Velocidade padrão configurável**, aplicada automaticamente a qualquer `<video>` de
  qualquer site (0.1x a 16x).
- **Ganho de volume**, de 0% a 500%, para amplificar o áudio além do limite nativo de
  100% do elemento `<video>` (via Web Audio API).
- **Lista de exceções por URL** — sites onde nem a velocidade nem o volume são
  alterados. `twitch.tv` e `kick.com` já vêm nessa lista por padrão (plataformas de
  live streaming, onde normalmente não faz sentido acelerar o vídeo), mas podem ser
  removidos a qualquer momento.
- **Badge no ícone da barra de ferramentas** mostrando a velocidade padrão atual (ex:
  `2x`), ou `OFF` quando a extensão está desativada.

## Como usar

- Clique no ícone da extensão para abrir o popup rápido:
  - liga/desliga a extensão inteira;
  - ajusta a velocidade padrão (slider + campo numérico);
  - ajusta o ganho de volume (slider + campo numérico);
  - botão **Ignorar** adiciona/remove o site atual da lista de exceções.
- Em **Mais opções**, é possível editar a lista completa de sites ignorados, um padrão
  por linha:
  - `exemplo.com` → ignora o domínio e todos os subdomínios (`sub.exemplo.com`);
  - `*.exemplo.com` → curinga, ignora qualquer subdomínio;
  - `exemplo.com/serie/temporada1` → ignora URLs que contenham esse trecho.

Todas as configurações são aplicadas em tempo real (via `storage.onChanged`) — não é
preciso recarregar a página depois de mudar a velocidade ou o volume.

## Como funciona

O content script (`content/video-speed.js`) roda em todas as páginas e:

- aplica `video.playbackRate` a cada `<video>` encontrado, observando o DOM
  (`MutationObserver`) para pegar vídeos adicionados dinamicamente (SPAs, players que
  trocam de fonte, etc), e reforça a velocidade nos eventos `play`, `loadedmetadata` e
  `ratechange` (comum em sites que tentam redefinir a velocidade, como em anúncios);
- para o **ganho de volume**, quando configurado acima ou abaixo de 100%, cria um
  `AudioContext` e roteia o áudio do vídeo por um `GainNode`
  (`createMediaElementSource` → `GainNode` → `destination`). Enquanto o ganho estiver
  em 100% (padrão), o pipeline de áudio nativo do vídeo não é tocado — o grafo de
  Web Audio só é criado na primeira vez que o ganho é alterado.

As configurações ficam em `chrome.storage.local`.

## Estrutura do projeto

```
manifest.json                Manifesto MV3 (compatível com Chrome e Firefox)
background/background.js     Defaults de configuração e badge do ícone
content/video-speed.js        Aplica velocidade e ganho de volume em qualquer site
popup/                        Popup rápido (liga/desliga, velocidade, volume, ignorar site atual)
options/                      Página de configurações completa
lib/browser-api.js            Shim Chrome/Firefox para módulos ES (background/popup/options)
lib/browser-api.content.js    Mesmo shim, em versão "classic script" para o content script
icons/                        Ícones gerados localmente (sem dependências externas)
store-assets/                 Imagens promocionais para a Chrome Web Store (pt-BR/ e en/)
```

## Publicando na loja

- `store-assets/pt-BR/` e `store-assets/en/` contêm as imagens promocionais da Chrome
  Web Store nos tamanhos exigidos:
  - `screenshot-1280x800.png` — captura de tela / imagem principal (1280×800);
  - `small-tile-440x280.png` — ícone promocional pequeno (440×280);
  - `marquee-1400x560.png` — imagem promocional grande / marquee (1400×560).
- Os arquivos `.zip` prontos para upload ficam em `dist/` (não versionados no git —
  gere novamente quando precisar, veja abaixo).

Para gerar os `.zip` de distribuição (Chrome e Firefox):

```sh
mkdir -p dist
zip -r dist/video-fast-chrome.zip manifest.json background content lib options popup icons
zip -r dist/video-fast-firefox.zip manifest.json background content lib options popup icons
```

## Permissões usadas

| Permissão | Por quê |
| --- | --- |
| `storage` | Salvar configurações (velocidade, volume, lista de exceções) |
| `activeTab` | Ler a URL da aba atual só quando o popup é aberto, para o botão "Ignorar este site" |

Não há permissão de acesso irrestrito a todas as abas (`tabs`), nem qualquer
comunicação com servidores externos — a extensão não tem backend.

## Privacidade

Nenhum dado é coletado, armazenado remotamente ou enviado para fora do seu navegador.
Todas as configurações ficam em `chrome.storage.local`, local à sua instalação.

## Limitações conhecidas

- Alguns players com DRM (ex: alguns serviços de streaming premium) podem ignorar ou
  bloquear a alteração de `playbackRate` ou o roteamento de áudio pelo Web Audio API.
- Vídeos servidos de outra origem sem cabeçalhos CORS liberados podem não permitir o
  ganho de volume (a mudança de velocidade continua funcionando normalmente nesses
  casos) — o erro é silenciado e o áudio nativo do vídeo é mantido.
- Se o site já usa a própria Web Audio API no mesmo elemento `<video>` (ex: um
  visualizador de áudio), o ganho de volume da extensão pode não funcionar nesse
  vídeo específico, já que um elemento de mídia só pode ser conectado a um
  `MediaElementSourceNode` por vez.
c