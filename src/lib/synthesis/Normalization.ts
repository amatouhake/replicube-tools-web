import type { DomainSpec, UserConstraint, TestCase, InputTuple, OutputRequirement } from './types';

export class Normalizer {
	static generateTestCases(domain: DomainSpec, constraints: UserConstraint[]): TestCase[] {
		const cases: TestCase[] = [];

		// Collect all distinct values to test for each dimension
		const getValues = (range: [number, number], dim: keyof InputTuple) => {
			const values = new Set<number>();
			// Add range
			for (let i = range[0]; i <= range[1]; i++) values.add(i);

			// Add specific values from constraints
			const regex = new RegExp(`^${dim}\\s*==\\s*(-?\\d+)$`);
			for (const c of constraints) {
				const match = c.targetInputs.trim().match(regex);
				if (match) {
					values.add(parseInt(match[1], 10));
				}
			}
			return Array.from(values).sort((a, b) => a - b);
		};

		const xVals = getValues(domain.x, 'x');
		const yVals = getValues(domain.y, 'y');
		const zVals = getValues(domain.z, 'z');
		const tVals = getValues(domain.t, 't');

		for (const x of xVals) {
			for (const y of yVals) {
				for (const z of zVals) {
					for (const t of tVals) {
						const input: InputTuple = { x, y, z, t };
						const expected = this.resolveOutput(input, constraints);

						if (expected) {
							cases.push({ input, expected });
						}
					}
				}
			}
		}

		return cases;
	}

	private static resolveOutput(
		input: InputTuple,
		constraints: UserConstraint[]
	): OutputRequirement | null {
		// Last match wins? or First match?
		// Let's say First Match wins for now (priority order UI).

		for (const c of constraints) {
			if (this.matchesInput(input, c)) {
				return c.outputRequirement;
			}
		}
		return null;
	}

	private static matchesInput(input: InputTuple, c: UserConstraint): boolean {
		// Parse targetInputs string.
		// Formats supported for MVP:
		// "x=3", "x>0", "x%2==0", "always"
		// This parser needs to be robust.
		// For MVP, let's use a very simple JS-eval-like approach or regex parsing.
		// SECURITY WARNING: In a real app avoid eval. Here we are dev tool.
		// Better: implement a mini-parser.

		const cond = c.targetInputs.trim();
		if (cond === 'always' || cond === '*') return true;

		// Simple "Variable OP Value" parser
		// e.g. "x == 3", "y < 5"
		const regex = /^([xyzt])\s*(==|!=|<=|>=|<|>|%)\s*(-?\d+)$/;
		const match = cond.match(regex);

		if (match) {
			const [, v, op, valStr] = match;
			const val = parseInt(valStr, 10);
			const inputVal = input[v as keyof InputTuple];

			switch (op) {
				case '==':
					return inputVal === val;
				case '!=':
					return inputVal !== val;
				case '<':
					return inputVal < val;
				case '>':
					return inputVal > val;
				case '<=':
					return inputVal <= val;
				case '>=':
					return inputVal >= val;
				// For %, we need "x % N == R". The regex above captures "x % N" as op? No.
				// Regex needs update for modulo.
			}
		}

		// Modulo parser: "x % 2 == 0"
		const modRegex = /^([xyzt])\s*%\s*(\d+)\s*==\s*(\d+)$/;
		const modMatch = cond.match(modRegex);
		if (modMatch) {
			const [, v, divStr, remStr] = modMatch;
			const div = parseInt(divStr, 10);
			const rem = parseInt(remStr, 10);
			const inputVal = input[v as keyof InputTuple];
			return Math.abs(inputVal) % div === rem; // Javascript % behavior alert
		}

		// Fallback or complex condition?
		// Maybe support "default"
		return false;
	}

	static extractConstants(constraints: UserConstraint[]): number[] {
		const found = new Set<number>();
		const regex = /(\d+)/g;

		for (const c of constraints) {
			// Scan targetInputs
			let match;
			while ((match = regex.exec(c.targetInputs)) !== null) {
				found.add(parseInt(match[1], 10));
			}
			// Scan outputRequirement (if value)
			if (c.outputRequirement.type === 'value') {
				found.add(c.outputRequirement.val);
			}
			if (c.outputRequirement.type === 'mod') {
				found.add(c.outputRequirement.divisor);
				found.add(c.outputRequirement.remainder);
			}
		}

		// Heuristic: Add differences between all found constants
		const constants = Array.from(found);
		for (let i = 0; i < constants.length; i++) {
			for (let j = i + 1; j < constants.length; j++) {
				found.add(Math.abs(constants[i] - constants[j]));
			}
		}

		return Array.from(found);
	}
}
