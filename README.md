# Archen — browser demo

A single-page, zero-backend demo of Archen. It downloads a small GGUF model
into the browser and runs it locally via [wllama](https://github.com/ngxson/wllama)
(llama.cpp compiled to WebAssembly). Nothing the visitor types leaves their device.

The demo exists to funnel visitors toward the full Archen app, so the
call-to-action is the point — not an afterthought.

## Configure before deploying

Open `index.html` and check the `CONFIG` block near the top of the `<script>`:

| Key | Purpose |
| --- | --- |
| `APP_URL` | Download page for a packaged Archen app, if one ships. Wins when set. |
| `WAITLIST_URL` | Sign-up form while such an app is in progress. Used when `APP_URL` is empty. |
| `REPO_URL` | This repository. **Set by default** — as of now this page *is* the product, so the call-to-action reads "View on GitHub". |
| `ANALYTICS_ENDPOINT` | Optional `POST` endpoint for anonymous funnel counters. |

The first non-empty URL wins and the call-to-action copy changes to match
(app / wait-list / open source). If all three are empty the CTA is hidden and a
warning is logged to the console — a page with no exit is the single biggest
thing to avoid shipping.

The CTA appears in two places: inline in the conversation after the visitor's
second reply (when interest is highest), and in the footer at all times.
`cta_click` events carry `kind` so the three variants can be compared if the
configuration changes over time.

## Funnel events

`track()` sends event names only — never message content, and no personal data.
Events are pushed to `window.dataLayer` when present, and beaconed to
`ANALYTICS_ENDPOINT` when configured.

| Event | Tells you |
| --- | --- |
| `load_start` / `load_complete` | Drop-off across the ~400 MB download — the main funnel leak |
| `load_cancelled`, `load_error` | Users who bailed, and failures by reason |
| `unsupported_browser` | Reach lost to browser capability |
| `risky_device_prompt` / `risky_device_continue` | Mobile and low-memory traffic, and how much of it proceeds |
| `first_message` | Activation — loaded *and* actually tried it |
| `turn_3` | Whether the small model holds interest past the novelty |
| `generation_stopped`, `generate_error` | Quality and reliability friction |
| `cta_click` (`inline` / `footer`, `kind`) | Conversion, by placement and by CTA variant |
| `model_switch`, `chip_click` | Whether visitors reach for the larger model and the guided tasks |
| `reply_complete` (`tokens`, `ms`), `regenerate`, `theme_toggle` | Real on-device speed by tier, and which UX affordances get used |

Load, activation and generation events carry `model: fast|smart` so the two tiers can be compared.

`load_start` → `load_complete` → `first_message` → `cta_click` is the funnel.
Until those four numbers exist, every other change to this page is guesswork.

## Hosting

`.nojekyll` is present for GitHub Pages, which serves this fine — but GitHub
Pages **cannot set response headers**. Without `Cross-Origin-Opener-Policy` and
`Cross-Origin-Embedder-Policy`, `SharedArrayBuffer` is unavailable and wllama
falls back to its single-threaded build, which is several times slower. The page
tells the visitor when this happens.

`_headers` ships those headers for **Cloudflare Pages** or **Netlify**. Moving the
site to either one is the single largest speed win available.

Caveat to verify on staging before switching: `COEP: require-corp` blocks
cross-origin subresources that are not CORS- or CORP-enabled. The jsDelivr and
Hugging Face fetches here are CORS-enabled and are expected to survive, but
confirm the model still downloads after the move.

## Models and answer quality

Two tiers, both Qwen2.5-Instruct in Q4_K_M, switchable from the header. The
choice is remembered per browser.

| Tier | Model | Download | When |
| --- | --- | --- | --- |
| Fast (default) | 0.5B | ~400 MB | Everyone, and the only option offered on phones |
| Smarter | 1.5B | ~1 GB | Recommended automatically on desktops reporting 8 GB+ (`navigator.deviceMemory`) |

The 1.5B model is the biggest single quality lever available in-browser: it
follows instructions far better and is much stronger in languages other than
English. If it fails to load (memory, or the file is unavailable), the page
falls back to Fast with a note rather than leaving the visitor with nothing.

**Verify before relying on it:** the Smarter file name
(`qwen2.5-1.5b-instruct-q4_k_m.gguf` in `Qwen/Qwen2.5-1.5B-Instruct-GGUF`)
follows Qwen's naming convention but was not fetched during development
because Hugging Face was unreachable from the build environment. Load it once
in a browser and confirm the download starts and the size is roughly 1 GB.

What else was done to get better answers out of small models, all in
`index.html`:

- **System prompt** rewritten as five short rules a small model can follow:
  answer in the user's language, answer first then detail, say when unsure,
  no greetings or restating the question. Every sentence costs context on
  every turn, so it is deliberately terse.
- **Sampling** (`SAMPLING`): `temperature` 0.5, `top_p` 0.9, `min_p` 0.05,
  `repeat_penalty` 1.1 over the last 64 tokens. Small models loop and ramble
  at higher temperature; the penalty and `min_p` cut both. These are the
  llama.cpp server key names, which is what the wllama engine reads.
- **Prompt cache** (`cache_prompt: true`): the KV cache for the system prompt
  and earlier turns is reused, so each reply starts faster.
- **Quick-task chips** on an empty conversation (summarize, fix writing,
  explain simply, translate). They fill the input with a scaffold, which
  keeps requests narrow — the kind of task a 0.5B model handles well —
  instead of open-ended chat, which is where it looks weakest.
- **`n_ctx`** is set explicitly to 4096. wllama's default is **1024**, which
  overflows after a few turns once the system prompt and a reply are
  counted. Prompt history is also capped to the most recent turns
  (`MAX_HISTORY_TURNS`).

Expect the 0.5B model to still feel weak on open-ended questions. That is a
product risk, not a bug: the demo has to prove *speed and privacy*, and the
chips and the Smarter tier exist to show it at its best.

## Chat experience

Patterns borrowed from the chat products people already know, kept to what a
single file can carry:

| Pattern | Seen in | Here |
| --- | --- | --- |
| Rendered replies (bold, lists, code blocks with copy) | ChatGPT, Claude | Minimal renderer in `index.html`; output is HTML-escaped first, so model text can never inject markup. Only `https://` links are turned into anchors. |
| Typing indicator, then a streaming cursor | Every major assistant | Three dots until the first token, blinking cursor while streaming, painted at most once per frame |
| Copy / Regenerate on the last reply | ChatGPT, Claude | Hover actions; Regenerate re-runs the same prompt |
| Speed shown per reply (`1.8s · 24 tok/s · fast`) | LM Studio, Open WebUI | On-device speed *is* the pitch, so it is visible rather than hidden |
| Enter sends, Shift+Enter newline, Esc stops | ChatGPT, Slack | Auto-growing textarea, 16px so mobile Safari does not zoom |
| "↓ New reply" when scrolled up | ChatGPT | Auto-scroll only while the visitor is already at the bottom |
| Empty state with a heading and suggested tasks | ChatGPT, Gemini | "What can I help with?" plus the quick-task chips |
| Conversation survives a reload | All | Last 40 messages in `localStorage` for this browser only; "Start fresh" clears it. Never shared, never sent anywhere. |
| Light and dark theme | All | Follows the OS, toggle in the header, remembered |

## Contributing

`main` is protected; changes land through pull requests. Branch naming, review
expectations and the settings that need a second opinion are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Development

No build step, no dependencies to install. Open `index.html` over HTTP
(`python3 -m http.server`) — `file://` will not work, because the page is an
ES module.
