import { calculateLuaSize } from '../utils/luaSize';
import { compileExpression, getColorForValue } from './Evaluator';
import type { RvsConfig, RvsResult, Condition } from './types';

// Generate a random numeric string within maxSize
function getRandomNumericString(maxSize: number): string {
	const getInt = () => {
		const r = Math.random();
		if (r < 0.3) return Math.floor(Math.random() * 17).toString();
		if (r < 0.6) return Math.floor(Math.random() * 257).toString();
		if (r < 0.9) return Math.floor(Math.random() * 4097).toString();
		return Math.floor(Math.random() * 1000000).toString();
	};

	const generate = () => {
		const patterns = ['int', 'dotInt', 'float', 'sci'];
		const pattern = patterns[Math.floor(Math.random() * patterns.length)];

		switch (pattern) {
			case 'int':
				return getInt();
			case 'dotInt':
				return '.' + getInt();
			case 'float':
				return getInt() + '.' + getInt();
			case 'sci': {
				const sign = Math.random() > 0.5 ? '-' : '';
				return getInt() + 'e' + sign + Math.floor(Math.random() * 20).toString();
			}
		}
		return '0';
	};

	for (let i = 0; i < 100; i++) {
		const s = generate();
		const { total } = calculateLuaSize(s);
		if (total <= maxSize) return s;
	}
	return '0';
}

export function calculateScore(
	config: RvsConfig,
	params: Record<string, string>
): { score: number; size: number; colors: number[]; mismatchCount: number } {
	let luaCode = config.template;
	for (const [key, val] of Object.entries(params)) {
		const rel = new RegExp(`\\b${key}\\b`, 'g');
		luaCode = luaCode.replace(rel, val);
	}
	const { total: size } = calculateLuaSize(luaCode);

	let blankPenalty = 0;
	let mismatchCount = 0;
	const colors = new Set<number>();

	// Pre-compile the expression for this set of parameters
	const evalFunc = compileExpression(config.template, params);

	for (const condition of config.conditions) {
		const testPoints = getTestPoints(condition);
		for (const x of testPoints) {
			let numVal = evalFunc({ x, y: 0, z: 0, t: 0 });

			if (config.options.floorOutput) {
				numVal = Math.floor(numVal);
			}

			let matched = false;
			if (condition.expectedType === 'color') {
				const actualColor = getColorForValue(numVal);
				matched = actualColor === condition.expectedValue;

				if (!matched) {
					if (condition.expectedValue === 'blank' || actualColor === 'blank') {
						blankPenalty += 1000;
					}
				}
				if (typeof actualColor === 'number') {
					colors.add(actualColor);
				}
			} else {
				// Numeric matching
				matched = numVal === condition.expectedValue;
			}

			if (!matched) {
				mismatchCount++;
			}
		}
	}

	const varietyPenalty = config.options.preferFewerColors
		? colors.size > 1
			? (colors.size - 1) * 200
			: 0
		: 0;

	// SCORING FORMULA:
	// Priority 1: Mismatch Count (Each mismatch is 10000)
	// Priority 2: Code Size (Each token is 100)
	const score = mismatchCount * 10000 + size * 100 + blankPenalty + varietyPenalty;

	return {
		score,
		size,
		colors: Array.from(colors),
		mismatchCount
	};
}

function getTestPoints(condition: Condition): number[] {
	const expr = condition.rawExpression.replace(/\s+/g, '');

	// Try "A <= var <= B" or "A < var < B"
	const rangeMatch = expr.match(/(-?\d*\.?\d+)([<>]=?)([xyz])([<>]=?)(-?\d*\.?\d+)/);
	if (rangeMatch) {
		const v1 = parseFloat(rangeMatch[1]);
		const op1 = rangeMatch[2];
		const variable = rangeMatch[3];
		const op2 = rangeMatch[4];
		const v2 = parseFloat(rangeMatch[5]);

		let min = v1;
		let max = v2;
		// Handle ops (though we treat < and <= roughly same for sampling)
		if (op1.startsWith('>')) {
			// v1 > x > v2 (unlikely but possible)
			min = v2;
			max = v1;
		}

		return sampleRange(min, max);
	}

	// Try "var == A", "var >= A", "var <= A"
	const simpleMatch = expr.match(/([xyz])(==|[<>]=?)(-?\d*\.?\d+)/);
	if (simpleMatch) {
		const variable = simpleMatch[1];
		const op = simpleMatch[2];
		const val = parseFloat(simpleMatch[3]);

		if (op === '==') return [val];
		if (op.startsWith('>')) return sampleRange(val, Math.max(val, 255));
		if (op.startsWith('<')) return sampleRange(Math.min(val, 0), val);
	}

	// Fallback to literal number if it's just "x" or something invalid
	return [0];
}

function sampleRange(min: number, max: number): number[] {
	if (min === max) return [min];
	const range = max - min;
	if (Math.abs(range) <= 16) {
		const points = [];
		const start = Math.min(min, max);
		const end = Math.max(min, max);
		for (let i = Math.floor(start); i <= Math.ceil(end); i++) points.push(i);
		return points.length > 0 ? points : [start];
	}

	const points = [];
	for (let i = 0; i < 16; i++) {
		points.push(min + (range * i) / 15);
	}
	return points;
}

export function randomSearch(config: RvsConfig, iterations: number): RvsResult[] {
	const results: RvsResult[] = [];

	for (let i = 0; i < iterations; i++) {
		const params: Record<string, string> = {};
		for (const p of config.parameters) {
			params[p.name] = getRandomNumericString(p.maxSize);
		}

		const { score, size, colors, mismatchCount } = calculateScore(config, params);
		results.push({
			expression: config.template,
			parameters: Object.fromEntries(
				Object.entries(params).map(([k, v]) => [
					k,
					parseFloat((v as string).startsWith('.') ? '0' + v : (v as string))
				])
			),
			score,
			size,
			colors,
			mismatchCount,
			rawParameters: params
		} as any);
	}

	return results.sort((a, b) => a.score - b.score).slice(0, 10);
}

export function hillClimb(config: RvsConfig, seed: RvsResult, iterations: number): RvsResult {
	let current = seed;

	for (let i = 0; i < iterations; i++) {
		let bestNeighbor = current;
		const raw = (current as any).rawParameters;
		if (!raw) break;
		const params = { ...raw };

		for (const pName of Object.keys(params)) {
			const pConfig = config.parameters.find((p) => p.name === pName);
			if (!pConfig) continue;

			for (let j = 0; j < 10; j++) {
				const neighborParams = { ...params };
				neighborParams[pName] = getRandomNumericString(pConfig.maxSize);

				const { score, size, colors, mismatchCount } = calculateScore(config, neighborParams);

				if (score < bestNeighbor.score) {
					bestNeighbor = {
						expression: config.template,
						parameters: Object.fromEntries(
							Object.entries(neighborParams).map(([k, v]) => [
								k,
								parseFloat((v as string).startsWith('.') ? '0' + v : (v as string))
							])
						),
						score,
						size,
						colors,
						mismatchCount,
						rawParameters: neighborParams
					} as any;
				}
			}
		}

		if (bestNeighbor.score < current.score) {
			current = bestNeighbor;
		} else {
			break;
		}
	}

	return current;
}
