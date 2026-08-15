# Genesis Swarm — Flow & Memory

## Flow diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         YOU                                  │
│              "Build X with auth + Stripe"                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    GENESIS ORCHESTRATOR                      │
│         (SSE stream → Live Terminal + Swarm Grid)            │
└───┬─────────┬─────────┬─────────┬─────────┬─────────┬───────┘
    │         │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ L1    │ │ L2    │ │ L3–4  │ │ L5    │ │ L6    │ │ L7    │
│ SOV   │→│ ARCH  │→│ WORK  │→│ CRIT  │→│ SYNC  │→│ VALID │
│ brief │ │ plan  │ │ files │ │ review│ │ merge │ │ gate  │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───────┘ └───────┘
    │         │         │         │
    │    if unclear     │         │
    │    ◄── questions  │         │
    │    (wait for you) │         │
    │                   │         │
    └───────────────────┴─────────┴──► VECTOR MEMORY
                                      (embed + retrieve)
                                            │
                                            ▼
                                      PROJECT RECORD
                                   (summary, decisions,
                                    generated files)
```

## Layer detail

```
L1 SOVEREIGN
  ├─ Load relevant vector memory (top-K by cosine)
  ├─ Pack context under sovereign budget
  ├─ Personal reply + optional clarifying questions
  └─ Brief for Architect Council ──► memory: decision + summary

L2 ARCHITECT COUNCIL
  ├─ Retrieve memory for brief
  ├─ Stack / entities / flows / security / file plan
  └─ Decisions ──► memory: stack decision

L4 WORKERS
  ├─ Implement files from plan
  ├─ Stream file_write events
  └─ File snippets ──► memory: file chunks

L5 GUARDIANS
  ├─ Review generated code (budgeted file window)
  ├─ Emit guardian_finding
  └─ Findings ──► memory: notes

L6 SYNTHESIZER → L7 VALIDATOR
  └─ Package + final gate → status complete
```

## Memory model

Two layers work together:

1. **Project memory (structured JSON on the project)**  
   summary, completedTasks, decisions[], rejectedApproaches[]  
   Shown in Command Center; updated every Genesis pass.

2. **Vector memory (embeddings per project)**  
   Chunks: summary | decision | task | rejection | note | file | chat  
   Embedded via OpenRouter (`text-embedding-3-small`)  
   Retrieved with cosine similarity before each major LLM call  
   Only top-K high-score chunks enter the prompt (context budgets).

```
User message
    │
    ▼
embed(query) ──► cosine vs project chunks ──► top-K texts
    │
    ▼
packContext(role budget) ──► system + memory + files + user
    │
    ▼
LLM (SOVEREIGN / ARCH / WORKER / GUARDIAN)
    │
    ▼
addMemoryChunks(new facts) ──► next turn is smarter
```
