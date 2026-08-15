# Live Terminal Experience — Design Contract

This is the non-negotiable product contract for how the AI feels in the terminal.

## 1. Personal, not robotic

Agents address the user as a partner.

Bad:
> Analyzing requirements...
> Generating schema...
> Done.

Good:
> I'm right here with you. Before we commit the swarm, I need to make sure we're building exactly what you want.
> I'm defining the auth boundary so sessions can't leak across tenants.
> I tried to break the payment flow — found one edge case and already patched it.

Each agent has a locked `voice` string in `@boss/shared` that guides tone.

## 2. Better questions first

SOVEREIGN is responsible for clarity.

- If the request is vague or high-stakes → ask 1–3 sharp questions.
- Prefer questions about: primary user, definition of done, explicit non-goals, constraints, brand.
- Never invent requirements. Never hide uncertainty.
- Only after alignment does the full Architect Council + Workers fire.

## 3. Show everything while it is happening

Every meaningful action emits a `SwarmStepEvent`:

- `agent_start` / `agent_thinking` / `agent_message` / `agent_tool` / `agent_complete`
- `layer_start` / `layer_complete`
- `question` / `decision`
- `file_write` / `file_edit` / `preview_update`
- `guardian_finding`
- `error` / `done`

The UI (SwarmTerminal + SwarmGrid) consumes this stream so the user sees:

- Which of the 7 layers is active
- Which agent is working (glow + pulse on the grid)
- The exact narration and any questions
- Files being created/edited in real time
- Guardian findings before the build is considered finished

## 4. Visual fidelity

Preserve and elevate the original look:

- Dark cyberpunk base (`240 10% 4%`)
- Neon cyan primary
- Sharp clip-path borders, glass panels, glow utilities
- 7-layer Hydra-Prime grid (L1·CEO … L7·VALID)
- WorkBlock folders for completed passes
- Live agent status: idle → active (glow + scale) → done (green check)

## 5. Specific terminal animations (build against these)

These are the concrete motion patterns the UI must implement. Timing is deliberate — fast enough to feel alive, slow enough to read.

### A. Agent cell states (SwarmGrid)

| State | Visual | Motion |
|-------|--------|--------|
| **Idle** | Dim text, low-opacity border | None |
| **Active** | Neon glow matching agent color, `scale-105` | Soft pulse on a 1.2s loop + 1px corner dot blinking |
| **Done** | Green border/text, small ✓ | 180ms scale pop (1.0 → 1.08 → 1.0) then settle |

Example CSS cues (match original language):

```css
/* active */
.agent-active {
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.55);
  transform: scale(1.05);
  animation: agent-pulse 1.2s ease-in-out infinite;
}
@keyframes agent-pulse {
  0%, 100% { filter: brightness(1); }
  50%      { filter: brightness(1.25); }
}

/* done */
.agent-done {
  animation: agent-done-pop 180ms ease-out;
}
@keyframes agent-done-pop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

### B. Streaming agent speech (typewriter + line reveal)

When an agent speaks (`agent_message` / `question`):

1. Agent name + short code appears instantly with a left cyan accent bar.
2. Body text streams character-by-character at ~28–35 chars/sec (human reading pace).
3. Cursor block (`▌`) blinks at the end until the message is complete.
4. On complete: cursor vanishes, message gets a subtle 120ms fade-settle.

```
[ SOV ]  I'm right here with you. Before we commit the swarm, I need to make
         sure we're building exactly what you want — not what I assume.▌
```

For multi-line questions, stream line-by-line with a 80–120ms pause between lines so the list feels deliberate, not dumped.

### C. Layer transition banner

On `layer_start`:

- Thin horizontal scan-line sweeps left → right across the terminal header (220ms).
- Layer label slides in: `L2 · ARCHITECT COUNCIL` with neon underline draw (300ms).
- Previous layer’s active cells flip to “done” in a short cascade (40ms stagger per cell).

On `layer_complete`:

- Brief green flash on the layer label (150ms).
- Label dims; next layer prepares.

### D. File write / edit ticker

On `file_write` / `file_edit`:

```
✦  writing  src/lib/auth.ts          ████████░░  80%
✦  wrote    src/lib/auth.ts          142 lines · 3.1s
```

- Filename appears with a cyan `✦`.
- Progress bar fills (indeterminate shimmer if size unknown).
- On complete: bar becomes solid green, line count + duration fade in.
- Entry collapses into the current WorkBlock after 1.2s so the log doesn’t explode.

### E. WorkBlock folder open/close

- Click or auto-open on new block: height animates with `grid-template-rows: 0fr → 1fr` (220ms ease).
- Chevron rotates 90°.
- Inner logs stagger-fade in (30ms per line) so the eye tracks downward.
- Collapsed state shows one-line summary: `Build · 4 agents · 18.4s · ✓`.

### F. Guardian finding flash

On `guardian_finding`:

- Red/amber left border pulse (2 beats).
- Finding text streams in.
- Severity chip (`LOW` / `MED` / `HIGH`) slides from the right.
- If auto-repair follows: chip morphs to `FIXED` with green fill (200ms).

### G. Question mode (waiting for user)

When SOVEREIGN emits `question` and is waiting:

- Input bar gains a soft cyan breathing glow.
- Placeholder: `Your move — answer SOVEREIGN to continue…`
- Swarm grid freezes on SOVEREIGN (only L1 cell active); other layers stay idle.
- After user sends: glow stops, SOVEREIGN cell does a quick “ack” pulse, then Architect Council cascade begins.

### H. Full run timeline example (what a user should see)

```
00:00  L1·CEO lights up
00:00  SOV: "I'm right here with you…"          [typewriter]
00:04  SOV: three clarifying questions           [line-by-line]
       ↳ input bar breathes, waiting…

00:18  User answers
00:18  SOV: "Clear enough. Briefing the council." 
00:19  L1 complete (green ✓ pop)
00:19  Scan-line → L2·ARCH
00:20  SYS / UXA / DAT / SEC / OPS cascade active
00:21  SYS: "I'm mapping the skeleton…"
00:24  ✦ writing  packages/db/schema.ts
00:27  ✦ wrote    packages/db/schema.ts  86 lines
00:31  L2 complete
00:31  Scan-line → L3·DEPT …
…workers…
01:12  L5·CRIT — BugHunter / SecurityAuditor / UX Critic
01:14  ⚠ HIGH: missing rate limit on /api/login   [red pulse]
01:16  Worker auto-repair → FIXED
01:22  L6·SYNC merge
01:28  L7·VALID pass
01:29  DONE — WorkBlock collapses with summary
```

Implementers: drive *all* of the above from the `SwarmStepEvent` stream. Do not invent parallel UI state that can drift from the event bus.

## 6. Continuity with original features

Keep:

- Genesis Swarm / Hydra-Prime identity
- Live terminal + streaming
- Project memory
- Stripe + plans
- Command Center
- One-click deploy path
- Mobile build notes / future pipeline

Elevate with:

- Personal questioning loop
- Full event transparency
- Real GitHub ownership + Actions
- Continuous Guardian (later phase)
- Multiplayer presence (later phase)

---

This document is the source of truth for terminal behavior. Any new agent or stream event must obey it.
