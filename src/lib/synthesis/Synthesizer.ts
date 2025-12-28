import type {
	TestCase,
	SearchConfig,
	SynthesisResult,
	OutputRequirement,
	InputTuple
} from './types';

type Value = number | boolean;

interface Expr {
	code: string;
	// We store outputs as a flat array for performance matching,
	// but dealing with mixed types (boolean/number) requires care.
	outputs: Value[];
	cost: number;
	depth: number;
	opCount: number;
}

export class Synthesizer {
	private cases: TestCase[];
	private config: SearchConfig;
	private bank: Map<string, Expr> = new Map(); // Signature -> Expr
	private onProgress?: (depth: number, explored: number) => void;
	private shouldStop?: () => boolean;

	constructor(
		cases: TestCase[],
		config: SearchConfig,
		onProgress?: (depth: number, explored: number) => void,
		shouldStop?: () => boolean
	) {
		this.cases = cases;
		this.config = config;
		this.onProgress = onProgress;
		this.shouldStop = shouldStop;
	}

	async *solve(): AsyncGenerator<SynthesisResult> {
		// 1. Initialize Terminals
		const gen0 = this.getTerminals();
		const nextGenBuffer: Expr[] = [];

		for (const expr of gen0) {
			this.emit(expr, nextGenBuffer);
		}

		// Yield initial matches
		for (const sol of this.checkSolutions(gen0)) {
			yield sol;
		}

		// 2. Iterate Depths
		let currentGen = [...nextGenBuffer];

		for (let depth = 1; depth <= this.config.maxDepth; depth++) {
			// Signal depth change
			this.onProgress?.(depth, this.bank.size);

			nextGenBuffer.length = 0;

			const bankSnapshot = Array.from(this.bank.values());

			// Limit bank size to prevent OOM
			const limit = this.config.bankLimit ?? 200000;
			if (bankSnapshot.length > limit) {
				console.warn('Bank limit reached, stopping search.');
				break;
			}

			const oldExprs = bankSnapshot.filter((e) => e.depth < depth - 1);

			// Chunked processing
			const CHUNK_SIZE = 100;
			let chunkCounter = 0;

			// Loop 1: Current * All
			const totalSteps =
				currentGen.length * bankSnapshot.length + oldExprs.length * currentGen.length;
			let currentStep = 0;
			let lastReportTime = Date.now();

			for (const left of currentGen) {
				if (this.shouldStop?.()) return;

				for (const right of bankSnapshot) {
					this.tryCombine(left, right, nextGenBuffer);

					chunkCounter++;
					currentStep++;
					if (chunkCounter > CHUNK_SIZE) {
						chunkCounter = 0;

						const now = Date.now();
						if (now - lastReportTime > 200) {
							const pct = Math.floor((currentStep / totalSteps) * 100);
							this.onProgress?.(depth, pct);
							lastReportTime = now;
						}

						await new Promise((r) => setTimeout(r, 0));
						if (this.shouldStop?.()) return;
					}
				}
			}

			// Loop 2: Old * Current
			for (const left of oldExprs) {
				if (this.shouldStop?.()) return;

				for (const right of currentGen) {
					this.tryCombine(left, right, nextGenBuffer);

					chunkCounter++;
					currentStep++;
					if (chunkCounter > CHUNK_SIZE) {
						chunkCounter = 0;

						const now = Date.now();
						if (now - lastReportTime > 200) {
							const pct = Math.floor((currentStep / totalSteps) * 100);
							this.onProgress?.(depth, pct);
							lastReportTime = now;
						}

						await new Promise((r) => setTimeout(r, 0));
						if (this.shouldStop?.()) return;
					}
				}
			}

			for (const sol of this.checkSolutions(nextGenBuffer)) {
				yield sol;
			}

			currentGen = [...nextGenBuffer];
			if (currentGen.length === 0) break;
		}
	}

	private emit(expr: Expr, buffer: Expr[]) {
		const limit = this.config.bankLimit ?? 200000;
		if (this.bank.size > limit) return; // Hard safety limit
		if (buffer.length > limit / 2) return; // Buffer limit (heuristic)

		const sig = this.getSignature(expr.outputs);
		if (!this.bank.has(sig)) {
			this.bank.set(sig, expr);
			buffer.push(expr);
		}
	}

	private getTerminals(): Expr[] {
		const terminals: Expr[] = [];
		const constants = new Set([0, 1, 2, 15, 16]); // Added 2 by default

		if (this.config.extraConstants) {
			this.config.extraConstants.forEach((c) => constants.add(c));
		}

		for (const c of constants) {
			terminals.push({
				code: c.toString(),
				outputs: this.cases.map(() => c),
				cost: c.toString().length,
				depth: 0,
				opCount: 0
			});
		}

		for (const v of this.config.variables) {
			const vals = this.cases.map((c) => {
				const key = v as keyof InputTuple;
				return c.input[key];
			});
			terminals.push({
				code: v,
				outputs: vals,
				cost: v.length,
				depth: 0,
				opCount: 0
			});
		}
		return terminals;
	}

	private tryCombine(left: Expr, right: Expr, targetList: Expr[]) {
		const ops = this.config.ops;

		for (const op of ops) {
			const newValues: Value[] = [];
			let valid = true;

			for (let i = 0; i < this.cases.length; i++) {
				const lVal = left.outputs[i];
				const rVal = right.outputs[i];

				if (typeof lVal !== 'number' || typeof rVal !== 'number') {
					// eslint-disable-next-line no-empty
					if (['==', '!=', 'and', 'or'].includes(op)) {
					} else {
						valid = false;
						break;
					}
				}

				const res = this.evalOp(op, lVal, rVal);
				if (res === undefined || Number.isNaN(res) || !Number.isFinite(res)) {
					valid = false;
					break;
				}
				newValues.push(res);
			}

			if (valid) {
				const code =
					op === '%' || op === '+' || op === '-' || op === '*'
						? `(${left.code} ${op} ${right.code})`
						: `${left.code} ${op} ${right.code}`;

				this.emit(
					{
						code,
						outputs: newValues,
						cost: code.length,
						depth: Math.max(left.depth, right.depth) + 1,
						opCount: left.opCount + right.opCount + 1
					},
					targetList
				);
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private evalOp(op: string, a: any, b: any): Value | undefined {
		switch (op) {
			case '+':
				return a + b;
			case '-':
				return a - b;
			case '*':
				return a * b;
			case '%':
				return b === 0 ? undefined : ((a % b) + b) % b;
			case '==':
				return a === b;
			case '!=':
				return a !== b;
			case '<':
				return a < b;
			case '>':
				return a > b;
			case '<=':
				return a <= b;
			case '>=':
				return a >= b;
			case '&':
				return a & b;
			case '|':
				return a | b;
			case '^':
				return a ^ b;
			case '<<':
				return a << b;
			case '>>':
				return a >> b;
			default:
				return undefined;
		}
	}

	private getSignature(outputs: Value[]): string {
		// Simple serialization. Only safe for primitives.
		return outputs.join(',');
	}

	private *checkSolutions(gen: Expr[]) {
		for (const expr of gen) {
			if (this.satisfiesAll(expr.outputs)) {
				yield {
					code: expr.code,
					score: expr.cost,
					complexity: expr.opCount
				} as SynthesisResult;
			}
		}
	}

	private satisfiesAll(outputs: Value[]): boolean {
		for (let i = 0; i < this.cases.length; i++) {
			if (!this.satisfies(outputs[i], this.cases[i].expected)) {
				return false;
			}
		}
		return true;
	}

	private satisfies(val: Value, req: OutputRequirement): boolean {
		if (req.type === 'blank') {
			// "0以下は空白" -> any number <= 0 is OK.
			// What about boolean? false is arguably blank?
			// Let's assume numeric mostly.
			return typeof val === 'number' && val <= 0;
		}
		if (req.type === 'value') {
			// Strict match.
			// If req is 1 (number) and val is true (boolean), fail.
			return val === req.val;
		}
		if (req.type === 'range') {
			return typeof val === 'number' && val >= req.min && val <= req.max;
		}
		if (req.type === 'set') {
			return typeof val === 'number' && req.values.includes(val);
		}
		if (req.type === 'mod') {
			if (typeof val !== 'number') return false;
			// Emulate Lua Modulo for checking?
			// JS: -1 % 16 = -1. Target: 15.
			// We need to implement Lua-style mod here.
			const m = ((val % req.divisor) + req.divisor) % req.divisor;
			return m === req.remainder;
		}
		return false;
	}
}
