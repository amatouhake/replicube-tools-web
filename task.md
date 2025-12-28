# Function Generator Implementation Tasks

- [x] Step 1: Core Synthesis Logic (BUE, Synthesizer.ts)
- [x] Step 2: Minimal Worker & UI Setup (Hardcoded Test)
- [x] Step 3: Normalization & Constraint Builder UI
    - [x] Implement `src/lib/synthesis/Normalization.ts`
    - [x] Update `src/routes/functions/+page.svelte` with Domain & Constraint UI
    - [x] Verify dynamic constraint generation
- [x] Step 4: Replicube Specifics
    - [x] Implement Lua-style Modulo
    - [x] Address Blank value support (Basic <=0 logic exists, refined via constraints)
    - [x] Bitwise Operations (`&`, `|`, `^`, `<<`, `>>`)
    - [x] Configurable Memory Limit
- [/] Step 5: Advanced Heuristics
    - [x] Diff Heuristic for constants
    - [x] Pruning optimizations
