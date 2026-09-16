# Contributing to Archen

Small repo, few people, one deployed page. These rules exist so that a change
nobody reviewed cannot reach visitors.

## Branching

`main` is protected and always deployable. Nothing is pushed to it directly —
not by people, not by agents.

| Prefix | For |
| --- | --- |
| `feat/…` | New visitor-facing capability |
| `fix/…` | Correcting broken behaviour |
| `chore/…` | Tooling, docs, config |
| `claude/…` | Written by Claude Code |

The `claude/` prefix is not decoration. It makes it obvious in the branch list
and in the PR queue which changes came from an agent, so reviewers know to read
them with the same care as any other contribution — no more, no less.

## Review

Every change goes through a pull request with at least one approving review.
`.github/CODEOWNERS` requests the right reviewer automatically.

Review the diff, not the description. An agent-authored PR describes its own
reasoning convincingly and can still be wrong: during the CTA work, a change to
the wllama asset paths looked plausible, matched no real path in the published
package, and was only caught by checking the package contents. Assume the
description is a claim and the diff is the evidence.

## Verifying a change before review

There is no build step. Serve the directory and open it:

```bash
python3 -m http.server 8000
# then open http://127.0.0.1:8000
```

`file://` will not work — `index.html` loads an ES module.

Before asking for review, at minimum: complete a conversation on the page, check
the browser console is clean, and check a narrow viewport. Say in the PR what
you actually did. "Not verified in a browser" is an acceptable answer; a false
claim that it was is not.

## Things that need a second opinion

These are cheap to change and expensive to get wrong, so raise them in the PR
rather than deciding alone:

- **Funnel events.** Renaming or removing one breaks continuity in the numbers.
  Add rather than rename where you can.
- **`n_ctx`, `MAX_TOKENS`, `MAX_HISTORY_TURNS`.** They trade answer quality
  against memory use and interact with each other. wllama's default `n_ctx` is
  1024, which overflows after a few turns — this is why it is set explicitly.
- **The model.** A different model changes download size, speed and answer
  quality all at once, which are the three things the demo is judged on.
- **Visitor-facing copy.** Especially the privacy claims, which have to stay
  literally true of what the page does.

## Configuration

`CONFIG` at the top of the `<script>` in `index.html` holds `APP_URL`,
`WAITLIST_URL` and `ANALYTICS_ENDPOINT`. See `README.md`. Shipping with both
URLs empty means shipping a page with no way out — check this before deploying.
