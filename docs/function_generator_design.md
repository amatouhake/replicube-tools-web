# Function Generator Design for Replicube

## 1. System Architecture

The Function Generator consists of three main layers. Since the execution environment is the browser, the heavy lifting (Synthesis Engine) should ideally run in a Web Worker to avoid freezing the UI.

```mermaid
graph TD
    A[UI / Specification Builder] -->|Constraints| B[Normalization Layer]
    B -->|Spec (Inputs -> Tasks)| C[Synthesis Engine (Worker)]
    C -->|Candidates| D[Evaluator & Ranker]
    D -->|Ranked Snippets| A
```

### Components

1.  **UI / Specification Builder**:
    *   Allows user to define ranges (e.g., `-16..31`).
    *   Block-based or text-based input for constraints (e.g., "When x=3, Output=1").
2.  **Normalization Layer**:
    *   Converts abstract constraints into a concrete **Verification Set**.
    *   Generates a list of valid input tuples `(x, y, z)` and their corresponding **Allowed Outputs**.
3.  **Synthesis Engine (Core)**:
    *   Explores the space of possible Lua/Replicube expressions.
    *   Uses **Bottom-Up Enumeration (BUE)** or **Beam Search**.
4.  **Evaluator & Ranker**:
    *   Calculates "Cost" (Length, Token Count).
    *   Filters out invalid candidates.

---

## 2. Process Flow: Input → Output

### Step 1: Normalization (The "Examples" Approach)

Instead of symbolic solving (which is hard for hash/bitwise), we use **Example-Guided Synthesis**.
We convert the user's "Input Conditions" into a finite set of test cases.

*   **Input Domain**: User specifies bounds (e.g., `x, y, z in -8..8`).
*   **Filter**: We select all `(x, y, z)` tuples that match the "Input Conditions" (e.g., `x % 2 == 0`).
*   **Target**: For each selected tuple, we define the **Allowed Output Set**.

**Data Structure: The "Spec"**
```typescript
type TestCase = {
    inputs: { x: number, y: number, z: number };
    allowedOutputs: number[] | 'TRUE' | 'FALSE' | 'ANY'; 
};
// If Output Condition is "Output > 0", allowedOutputs might be [1, 2, ..., 15] or a symbolic check.
// For MVP, discrete values are easiest.
```

### Step 2: Search Algorithm (Bottom-Up Enumeration)

We generate expressions by increasing complexity (size/depth).
To prevent exponential explosion, we use **Observational Equivalence**.

**Concept**:
If Expression A `x + 1` and Expression B `1 + x` produce the exact same results for *all* logical inputs in our test set, we only keep the smaller/simpler one (canonical form).

**Pseudo-Code**:

```typescript
function solve(spec: TestCase[]): Solution[] {
    const Bank = new Map<Signature, Expression>(); // Signature = string hash of outputs
    let currentGeneration = [
        "x", "y", "z", 
        "0", "1", "15", "16", // Common constants
        "t" // time, if applicable
    ];

    // Initialize Bank with terminals
    for (const expr of currentGeneration) {
        const sig = evaluateSignature(expr, spec.inputs);
        addToBank(Bank, sig, expr);
    }

    for (let depth = 1; depth <= MAX_DEPTH; depth++) {
        const nextGen = [];
        
        // Unary Ops: -, ~, !, floor
        for (const expr of currentGeneration) {
             tryAdd(nextGen, `-${expr}`);
             tryAdd(nextGen, `~${expr}`);
             // ...
        }

        // Binary Ops: +, -, *, %, &, |, ==, <
        // Combine expr1 from Bank AND expr2 from Bank 
        // (Optimization: Only combine recent gens to avoid re-doing work)
        for (const left of Bank.values()) {
            for (const right of Bank.values()) {
                 tryAdd(nextGen, `(${left} + ${right})`);
                 tryAdd(nextGen, `(${left} % ${right})`);
                 tryAdd(nextGen, `(${left} & ${right})`);
                 // ...
            }
        }
        
        // Check for Solutions
        // A solution is valid if its signature "matches" the user requirements for ALL test cases.
        // (Note: Signature matching for ranges/sets is "Value in AllowedOutputs")
        
        currentGeneration = nextGen;
        prune(Bank, currentGeneration); // Keep only shortest per signature
    }
    
    return extractBest(Bank);
}
```

### Step 3: Evaluation

For each candidate:
1.  **Correctness**: Does `eval(code)` fall into `allowedOutputs` for every test case?
2.  **Score**: `String.length` (primary), `TokenCount` (secondary).

---

## 3. Implementation Plan (MVP to Advanced)

### Phase 1: MVP (Boolean Logic & Simple Arithmetic)
*   **Goal**: Handle simple conditions like "Checkerboard pattern".
*   **Variables**: x, y.
*   **Ops**: `+`, `%`, `==`.
*   **Outputs**: 0 or 1.
*   **Search**: Depth 3-4.

### Phase 2: The "Replicube" Extension
*   **Goal**: Handle colors and ranges.
*   **Ops**: `&`, `|`, `>>`, `floor`, `? :` (Ternary).
*   **Constraints**: Support `Output <= 0` (Blank) semantics.
    *   *Optimization*: If user says "Blank", any negative value is valid. This increases the solution space significantly.

### Phase 3: Advanced Optimization
*   **Heuristics**: Prioritize operators used in specific contexts (e.g., `&` and `>>` for bitmasks).
*   **Divide & Conquer**: If no single expression works, try `if (cond) then A else B`. Use the synthesizer to find `cond`, `A`, and `B` separately.

---

## 4. Minimum Feature Set (First Sprint)

1.  **Condition Form**:
    *   Input: `x`, `y` (range -8 to 7).
    *   Condition: `(x + y) % 2 == 0` (Classic checkerboard).
    *   Desired Output: 1 else 0.
2.  **Generator**:
    *   Support `+, -, %, ==`.
    *   Max depth 3.
3.  **UI**:
    *   Button "Generate".
    *   List showing: `(x+y)%2` (Score: 7 chars).

## 4.1 Heuristics & Specifics
- **Mod 16**: Since Replicube colors cycle mod 16, the generator should know that `x` and `x+16` are often color-equivalent.
- **Integer Division**: Replicube uses `//` or `floor`. The generator must handle `floor(x/y)` properly.
