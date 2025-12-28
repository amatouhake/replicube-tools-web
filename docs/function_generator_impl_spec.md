# Function Generator Implementation Specification

## 1. Feature List

### UI Features
*   **Variable Selection**: Toggle buttons for `x`, `y`, `z`, `t` (time).
*   **Domain Configuration**:
    *   Range inputs for coordinates (e.g., Min `-8`, Max `7`).
    *   Preset domains (e.g., "Standard 16x16x16", "2D Plane").
*   **Constraint Editor (Visual Builder)**:
    *   "Add Condition" button.
    *   Condition Row:
        *   **Filter**: `x, y, z` selectors, Operator (`==`, `in`, `mod`), Value input.
        *   **Target Output**: Value, Range, or Special (Blank).
        *   Example Input: `Filter: x % 2 == 0` → `Target: 1`.
*   **Manual Test Case Entry**: Grid to manually specify `(x,y,z) -> output`.
*   **Controls**:
    *   `Generate` / `Stop` buttons.
    *   `Clear All` button.
*   **Feedback & Results**:
    *   Progress Indicator: "Searching depth 3... (1500 candidates)".
    *   Result List: Sortable by Length, Complexity.
    *   Code Preview: Monospace font, syntax highlighted (if possible).
    *   "Test It" Playground: Inputs for x,y,z to verify selected result instantly.

---

## 2. Data Structures (TypeScript)

### 2.1 Domain & Normalization

```typescript
// The user's requested domain
interface DomainSpec {
    x: [number, number]; // [min, max]
    y: [number, number];
    z: [number, number];
}

// A single constraint rule from the UI
interface UserConstraint {
    id: string; // unique ID for UI tracking
    conditionType: 'specific' | 'range' | 'set' | 'mod' | 'bit';
    targetInputs: string; // e.g. "x=3" or parsed logic object
    outputRequirement: OutputRequirement;
}

// The normalized target for the synthesizer
type OutputRequirement = 
    | { type: 'value', val: number }
    | { type: 'set', values: number[] }
    | { type: 'range', min: number, max: number } // Inclusive
    | { type: 'mod', divisor: number, remainder: number }
    | { type: 'blank' }; // Replicube specific: <= 0

// The "Truth Table" sent to the Worker
interface TestCase {
    input: { x: number, y: number, z: number, t: number };
    expected: OutputRequirement;
}
```

### 2.2 Worker Messages

```typescript
// Main -> Worker
type WorkerCommand = 
    | { cmd: 'START', config: SearchConfig, cases: TestCase[] }
    | { cmd: 'STOP' };

interface SearchConfig {
    maxDepth: number;
    variables: string[]; // ['x', 'y']
    ops: string[]; // ['+', '%', '==']
}

// Worker -> Main
type WorkerResponse = 
    | { type: 'PROGRESS', depth: number, candidatesExplored: number }
    | { type: 'FOUND', solution: SynthesisResult }
    | { type: 'DONE', reason: 'exhausted' | 'stopped' | 'timeout' }
    | { type: 'ERROR', message: string };

interface SynthesisResult {
    code: string; // The generated Lua/Replicube code
    score: number; // Length
    complexity: number; // Operator count
}
```

---

## 3. Worker Logic (Synthesis Engine)

The worker performs Bottom-Up Enumeration.

1.  **Bank Initialization**:
    *   Level 0: `["x", "y", "0", "1", "15", "16"]`.
    *   Compute outputs for all `TestCase` inputs. Store in `SignatureMap`.
2.  **Generation Loop (Depth 1..N)**:
    *   Combine expressions from lower levels using allowed Ops.
    *   **Pruning (Observational Equivalence)**:
        *   Calculate output signature (vector of results for all test cases).
        *   If signature exists in `SignatureMap`:
            *   Keep the shorter expression.
            *   Discard the longer one.
        *   Else: Add to `SignatureMap` and `Bank`.
3.  **Verification**:
    *   For each new expression, check if its output vector satisfies `expected` for **ALL** test cases.
    *   Note: `OutputRequirement` is looser than strict equality.
        *   If `expected` is `{type: 'blank'}`, actual value `-1` is PASS.
        *   If `expected` is `{type: 'mod', 16, 5}`, actual value `21` is PASS.
4.  **Reporting**:
    *   Stream valid solutions back to Main thread via `postMessage`.

---

## 4. UI Wireframe (Text)

```text
+-------------------------------------------------------------+
|  Replicube Function Generator (Dev)                         |
+-------------------------------------------------------------+
| [ Domain ]                                                  |
|  X: [-8 ] to [ 7 ]   Y: [-8 ] to [ 7 ]   Z: [ 0 ] to [ 0 ]  |
+-------------------------------------------------------------+
| [ Conditions ]                                       [+] Add|
|  1. IF x % 2 == 0       THEN Output = 1           [x]       |
|  2. IF x % 2 != 0       THEN Output = 0           [x]       |
|                                                             |
|  (Implicit: All unspecified inputs have undefined output)   |
+-------------------------------------------------------------+
| [ Controls ]                                                |
|  < GENERATE >    < STOP >    Status: Searching depth 3...   |
+-------------------------------------------------------------+
| [ Results ]                                                 |
|  Rank | Code              | Size | Copy                     |
|  #1   | (x % 2) == 0      | 10   | [Copy]                   |
|  #2   | 1 - (x % 2)       | 11   | [Copy]                   |
+-------------------------------------------------------------+
```

---

## 5. Implementation Roadmap

### Step 1: Core Logic (No UI)
1.  Create `src/lib/synthesis/types.ts`.
2.  Create `src/lib/synthesis/worker.ts` (Simple loop).
3.  Implement basic BUE (Bottom-Up Enumeration) with `+`, `%`.
4.  Write comprehensive unit tests for the synthesizer.

### Step 2: Minimal UI
1.  Create `/functions` outputting `src/routes/functions/+page.svelte`.
2.  Implement `WebWorker` instantiation.
3.  Connect basic Input (fixed range) -> Worker -> Console Log.

### Step 3: Normalization & Constraint Builder
1.  Implement `Normalization` helper to convert constraints to `TestCase[]`.
2.  Add UI to add/remove constraints.
3.  Visual feedback for results.

### Step 4: Replicube Specifics (Refinement)
1.  Add `blank` logic.
2.  Add bitwise operators.
3.  Optimize heuristics (colors).

---

## 6. Design Notes (Important)

- Undefined inputs are excluded from TestCase generation.
- Observational Equivalence is evaluated against PASS/FAIL vectors, not raw values.
- Conditional expressions (if/else) are only synthesized after normal enumeration fails.
- Partial solutions may be returned if high-weight constraints are satisfied.
