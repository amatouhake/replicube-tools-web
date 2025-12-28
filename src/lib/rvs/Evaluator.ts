/**
 * Compiles a template into a reusable evaluation function.
 * This is much faster for repeated evaluations (like in a search engine).
 */
export function compileExpression(
	template: string,
	params: Record<string, string | number>
): (vars: Record<string, number>) => number {
	let code = template;
	for (const [key, val] of Object.entries(params)) {
		const rel = new RegExp(`\\b${key}\\b`, 'g');
		code = code.replace(rel, val.toString());
	}

	// Replicube Lua-like conversion:
	const numbers: string[] = [];
	const placeholderCode = code.replace(/\d*\.?\d+(?:e[+-]?\d+)?/gi, (match) => {
		numbers.push(match);
		return `__NUM${numbers.length - 1}__`;
	});

	const workingCode = placeholderCode
		.replace(/\^/g, '**')
		.replace(/~/g, '^')
		.replace(/\bfloor\(([^)]+)\)/g, 'Math.floor($1)');

	// Support // operator by wrapping it in Math.floor(...)
	let refinedCode = workingCode.replace(
		/([\w\d.()*]+)\s*\/\/\s*([\w\d.()*]+)/g,
		'Math.floor($1 / $2)'
	);

	// Restore numbers
	for (let i = 0; i < numbers.length; i++) {
		refinedCode = refinedCode.replace(`__NUM${i}__`, numbers[i]);
	}

	try {
		// Use explicit arguments for the compiled function to ensure scope clarity.
		const f = new Function(
			'x',
			'y',
			'z',
			't',
			`
			return (${refinedCode});
		`
		);
		return (vars: Record<string, number>) => {
			try {
				const { x = 0, y = 0, z = 0, t = 0 } = vars;
				const res = f(x, y, z, t);
				return typeof res === 'number' ? res : 0;
			} catch {
				return 0;
			}
		};
	} catch (e) {
		console.error('Compilation error:', e, 'refinedCode:', refinedCode);
		return () => 0;
	}
}

export function evaluateExpression(
	template: string,
	params: Record<string, string | number>,
	vars: Record<string, number>
): number {
	const f = compileExpression(template, params);
	return f(vars);
}

export function getColorForValue(val: number): number | 'blank' {
	if (val < 1) return 'blank';
	const color = Math.floor(val) % 16;
	return color === 0 ? 16 : color; // Adjusting for 1-16 mapping if needed, but mod 16 usually handles it
}

export const COLOR_MAP: Record<number | 'blank', { name: string; hex: string }> = {
	blank: { name: 'Blank', hex: '#00000000' },
	1: { name: 'WHITE', hex: '#FFFFFF' },
	2: { name: 'GREY', hex: '#888888' },
	3: { name: 'BLACK', hex: '#222222' },
	4: { name: 'PEACH', hex: '#FFCCAA' },
	5: { name: 'PINK', hex: '#FF88CC' },
	6: { name: 'PURPLE', hex: '#AA44FF' },
	7: { name: 'RED', hex: '#FF0000' },
	8: { name: 'ORANGE', hex: '#FF8800' },
	9: { name: 'YELLOW', hex: '#FFFF00' },
	10: { name: 'LIGHTGREEN', hex: '#AAFF00' },
	11: { name: 'GREEN', hex: '#00AA00' },
	12: { name: 'DARKBLUE', hex: '#000088' },
	13: { name: 'BLUE', hex: '#0000FF' },
	14: { name: 'LIGHTBLUE', hex: '#0088FF' },
	15: { name: 'BROWN', hex: '#884400' },
	16: { name: 'DARKBROWN', hex: '#442200' }
};
