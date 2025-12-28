export type TokenType =
	| 'keyword'
	| 'identifier'
	| 'operator'
	| 'number'
	| 'string'
	| 'comment'
	| 'whitespace'
	| 'other';

export interface Token {
	value: string;
	type: TokenType;
	cost: number;
	// Helper to debug
	original?: string;
}

export function calculateLuaSize(code: string): { total: number; tokens: Token[] } {
	const tokens = tokenize(code);
	const total = tokens.reduce((sum, t) => sum + t.cost, 0);
	return { total, tokens };
}

function tokenize(code: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	const n = code.length;

	// Context tracking for unary vs binary minus
	// Start of file is a "unary expected" context
	let expectUnary = true;

	while (i < n) {
		const char = code[i];

		// 1. Whitespace (Skip but reset/keep context?)
		// Whitespace doesn't change syntax context typically, EXCEPT newline might?
		// In Lua, newlines are just whitespace mostly, unless ambiguous syntax.
		// For our purpose, we just skip cost, but we need to pass `expectUnary` state correctly?
		// Actually, whitespace doesn't "consume" the expectation of a value.
		if (/\s/.test(char)) {
			// Keep looping to consume all whitespace
			let val = char;
			i++;
			while (i < n && /\s/.test(code[i])) {
				val += code[i];
				i++;
			}
			// Whitespace 0 cost
			// Do NOT change expectUnary status
			continue;
		}

		// 2. Comments (Skip)
		if (code.startsWith('--', i)) {
			// Check for multiline --[[ ... ]]
			let isBlock = false;
			if (code.startsWith('--[[', i)) {
				isBlock = true;
			} else if (code.startsWith('--[=[', i)) {
				// Technically Lua allows [=[ ... ]=] levels
				isBlock = true;
			}

			// Simplification: Assume --[[ is block, -- is line.
			// Lua block comments are complicated with nesting levels [===[ ]===].
			// For now, let's detect the opening level.

			// Actually, let's keep it simple for now or implement robustly?
			// "Comments are also not counted"

			let val = '';
			// Check for block comment start logic
			// e.g. --[[ ... ]]
			const blockMatch = code.slice(i).match(/^--\[(=*)\[/);
			if (blockMatch) {
				const eqs = blockMatch[1];
				const close = `]${eqs}]`;
				const startIdx = i;
				i += blockMatch[0].length;

				const closeIdx = code.indexOf(close, i);
				if (closeIdx !== -1) {
					i = closeIdx + close.length;
					val = code.slice(startIdx, i);
				} else {
					// Unclosed block comment, read till end
					val = code.slice(startIdx);
					i = n;
				}
			} else {
				// Line comment
				const startIdx = i;
				const newlineIdx = code.indexOf('\n', i);
				if (newlineIdx !== -1) {
					i = newlineIdx; // Keep newline for whitespace handling next loop? Or consume it?
					// Usually line comment ends at newline. Newline is whitespace.
					val = code.slice(startIdx, i);
				} else {
					i = n;
					val = code.slice(startIdx);
				}
			}
			// Comments do NOT change expectUnary (they are ignored)
			continue;
		}

		// 3. Numbers
		// Check for digit OR (dot followed by digit)
		// Also check for Negative Number context:
		// If expectUnary is true AND current char is '-' AND next is digit/dot...
		// Wait, '-' is an operator logic path usually.
		// Let's handle '-' in the operator section but peek for number?

		let isNumberStart = /\d/.test(char);
		if (!isNumberStart && char === '.' && i + 1 < n && /\d/.test(code[i + 1])) {
			isNumberStart = true;
		}

		// Negative number check
		let isNegativeNumber = false;
		if (char === '-' && expectUnary) {
			// Check if next (ignoring space?) NO, user said "number's before (-) is part of number"
			// usually implied no space for "part of number" in token counts?
			// "1e17 is 1+2. e or . is not operator"
			// "-x is 2 tokens, -1 is 1 token"
			// If I have `- 1`, is that 1 token?
			// Usually lexers treat `-` and `1` separate unless it's a specific signed literal.
			// But the user's rule implies "negative number" concept.
			// Let's assume closely bound: `-` followed immediately by digit or dot.
			if (
				i + 1 < n &&
				(/\d/.test(code[i + 1]) || (code[i + 1] === '.' && i + 2 < n && /\d/.test(code[i + 2])))
			) {
				isNegativeNumber = true;
				isNumberStart = true;
			}
		}

		if (isNumberStart) {
			// Need to consume the whole number structure according to Lua
			// Then split it according to user rules.
			// Lua numbers: hex (0x...), standard float (123, 12.3, 1e5), hex float (0x1p5).
			// Let's stick to base 10 for simplicity unless hex is strictly required (user samples show mainly base 10).
			// Sample `254.031e3` uses decimal with exponent.

			// We need to capture the full raw number string first.
			// If isNegativeNumber, we start with '-'.
			const start = i;
			if (char === '-') i++; // consume sign

			// Consume digits/hex?
			// User rules don't mention hex cost, assuming standard decimal for cost logic "Numbers have an escalating token cost".
			// Let's consume standard float pattern: digits, optional dot, optional digits, optional exponent.

			// TODO: Hex support 0x... if needed.

			// Consume integer part
			while (i < n && /\d/.test(code[i])) i++;

			// Consume dot
			if (i < n && code[i] === '.') {
				i++;
				// Consume fraction digits
				while (i < n && /\d/.test(code[i])) i++;
			}

			// Consume exponent
			if (i < n && (code[i] === 'e' || code[i] === 'E')) {
				i++;
				// Exponent sign
				if (i < n && (code[i] === '+' || code[i] === '-')) i++;
				// Exponent digits
				while (i < n && /\d/.test(code[i])) i++;
			}

			const raw = code.slice(start, i);

			// Now verify split logic
			// "1e17" -> 1 token + 2 token. code size 3.
			// Split by non-digit chars that are separators?
			// "e or . is not operator so 0 token"
			// "Treat as 2 numbers"
			// So `1e17` is `1` and `17`.
			// `1.2` is `1` and `2`.
			// `-1` is one number `-1`?
			// `254.031e3` -> `254`, `031`, `3`?
			// `031` as a number might be 31.

			// Proposed split logic:
			// Regex split by `[eE.]`?
			// What about `1e-5`? `1`, `-5`?
			// `1.2e3` -> `1`, `2`, `3`.
			// `-1.5` -> `-1`, `5`? Or `-` belongs to whole?
			// "254.031e3" -> `254` (val>16->2), `031` (val 31->2), `3` (val 3->1)?
			// "1e17" -> `1` (1), `17` (2) = 3.
			// `-1` -> value -1?
			// "Numbers have an escalating token cost ... 0-16 -> 1 ... "
			// The table starts at 0. Magnitude.
			// Assume abs value for cost? Or does sign matter?
			// Rule: "Magnitude of a number determines its token count."
			// "0 - 16 : 1"
			// If negative, `-1`, magnitude is 1. Cost 1.

			// Splitting implementation:
			// Regex match all number-chunks.
			// A number chunk is a sequence of digits, potentially with a sign if it's the very start (e.g. -1) OR if it's an exponent part (`e-5`).
			// Actually `e` is the separator. content after `e` is a number. content before `e` is a number?
			// separators: `.`, `e`, `E`.
			// `1e-5`: `1` and `-5`.
			// `1.5`: `1` and `5`.
			// `-1.5`: `-1` and `5`.
			// `254.031e3`: `254`, `031`, `3`.

			// Logic:
			// 1. Check if raw starts with `-`. If so, that `-` belongs to the first chunk.
			// 2. Split by `.` or `e` or `E`.
			// 3. For chunks after `e`/`E`, if they start with `+` or `-`, include it?
			// `1e+5` -> `1` and `+5` (which is 5).
			// `1e-5` -> `1` and `-5`.

			let parts: string[] = [];
			// We can't just split string because we need to handle signs attached to parts.
			// Manual scan of the raw token:
			// Splitters are `.` and `e/E`.
			// Be careful to keep sign with the number it precedes.

			// Actually, Regex `/[^.eE]+/g` might work but we need to verify sign attachment.
			// `1e-5`. Split `e`. `1`, `-5`. Correct.
			// `1.5`. Split `.`. `1`, `5`. Correct.
			// `254.031e3`. Split `.` -> `254`, `031e3`. Split `e`. -> `031`, `3`.

			const rawParts = raw.split(/[.eE]/);
			// removing empty parts if any? .05 -> ``, `05`.
			// `.00000000000001` -> 1 token.
			// Split: `` and `00000000000001`.
			// Empty string is not a number.

			for (const p of rawParts) {
				if (p === '') continue;
				// `+5` -> `5`. `-5` -> `-5`.
				const val = parseFloat(p); // parseFloat handles '031' as 31.
				// "001" -> 1.
				// Cost calculation
				const cost = getNumberCost(Math.abs(val));

				// Add token
				tokens.push({
					value: p,
					type: 'number',
					cost: cost,
					original: raw // tracking full orig for debug if needed
				});
			}

			expectUnary = false; // After a number, we expect an operator next
			continue;
		}

		// 4. Identifiers / Keywords
		// Starts with letter or `_`
		if (/[a-zA-Z_]/.test(char)) {
			// Read until non-word
			const start = i;
			while (i < n && /[a-zA-Z0-9_]/.test(code[i])) i++;
			const word = code.slice(start, i);

			// Check if keyword
			const isKw = isKeyword(word);

			// Cost: keywords are 1 token. Identifiers are 1 token.
			// "Keywords ... identifier ... operator ... number ... - Whitespace, closing elements not counted"
			// "Keywords like if then end ... are 1"

			// Wait, "Closing elements such as ) } ] are not counted".
			// `end` is a closing keyword? usually `end` counts as 1 in example "return 11 ...".
			// The example list: "if", "then", "end" are listed as tokens.
			// So `end` counts. Only `) } ]` symbols don't.

			tokens.push({
				value: word,
				type: isKw ? 'keyword' : 'identifier',
				cost: 1
			});

			expectUnary = false; // After identifier/keyword (like `true`), expect operator.
			// Exception: `if`, `while`, `function` etc might expect expression (unary).
			// Keywords that start a statement or expression reset expectUnary to TRUE.
			// `return` -> expects expr -> true.
			// `if` -> true.
			// `then` -> true (start of block).
			// `else` -> true.
			// `end` -> false (end of block, acts like closing paren kinda, but usually followed by stat separator or nothing).
			// `and`/`or`/`not` -> `not` is unary, `and/or` binary.

			if (
				[
					'if',
					'elseif',
					'while',
					'do',
					'function',
					'repeat',
					'return',
					'local',
					'then',
					'else',
					'in',
					'not'
				].includes(word)
			) {
				expectUnary = true;
			} else if (
				word === 'end' ||
				word === 'break' ||
				word === 'true' ||
				word === 'false' ||
				word === 'nil'
			) {
				expectUnary = false;
			} else {
				// Generic identifier: usually a value
				expectUnary = false;
			}
			// What about `function f(x)`? `function` -> expectUnary=true?
			// `f` -> identifier. expectUnary=false.
			// `(` -> op. expectUnary=true.

			continue;
		}

		// 5. Strings
		if (char === '"' || char === "'") {
			const quote = char;
			const start = i;
			i++;
			while (i < n) {
				if (code[i] === quote && code[i - 1] !== '\\') {
					// end of string
					i++;
					break;
				}
				i++;
			}
			const strVal = code.slice(start, i);
			// String content length (without quotes?)
			// "The length of a string determines its token count."
			// "String (text) values".
			// Usually means content.
			// Let's assume content inside quotes.
			const content = strVal.slice(1, -1);
			const cost = getStringCost(content.length);

			tokens.push({
				value: strVal,
				type: 'string',
				cost
			});
			expectUnary = false;
			continue;
		}

		// Multiline strings [[ ... ]]
		if (char === '[' && (code[i + 1] === '[' || code[i + 1] === '=')) {
			// Check for long string [[ or [=[
			const match = code.slice(i).match(/^\[(=*)\[/);
			if (match) {
				const eqs = match[1];
				const close = `]${eqs}]`;
				const start = i;
				i += match[0].length;
				const closeIdx = code.indexOf(close, i);
				let content = '';
				if (closeIdx !== -1) {
					content = code.slice(i, closeIdx);
					i = closeIdx + close.length;
				} else {
					content = code.slice(i);
					i = n;
				}
				const cost = getStringCost(content.length);
				tokens.push({
					value: code.slice(start, i),
					type: 'string',
					cost
				});
				expectUnary = false;
				continue;
			}
		}

		// 6. Operators / Punctuation
		// Handle multi-char operators `==`, `<=`, `>=`, `~=`, `..`, `::`, `//`, `<<`, `>>`
		// 3-char `...` ?

		// Peek logic
		let op = char;
		if (i + 1 < n) {
			const two = code.slice(i, i + 2);
			if (['==', '~=', '<=', '>=', '..', '//', '<<', '>>', '::'].includes(two)) {
				op = two;
			} else if (two === '..' && i + 2 < n && code[i + 2] === '.') {
				op = '...';
			}
		}
		// Adjust i
		i += op.length;

		// Determine cost
		// "Closing elements such as ) } ] are not counted"
		let cost = 1;
		if ([')', '}', ']'].includes(op)) {
			cost = 0;
			// logic for expectUnary after closing?
			// `(x)` -> `)` end of expr. expect op.
			expectUnary = false;
		} else {
			// Opening `(`, `{`, `[` -> expect value (unary)
			// Operators `+`, `-`, ... -> expect value
			// Comma `,` -> expect value
			// Semicolon `;` -> restart stat? -> expectUnary = true?
			if (
				[
					'(',
					'[',
					'{',
					',',
					';',
					':',
					'.',
					'..',
					'...',
					'+',
					'-',
					'*',
					'/',
					'%',
					'^',
					'#',
					'==',
					'~=',
					'<=',
					'>=',
					'<',
					'>',
					'=',
					'and',
					'or',
					'..',
					'//',
					'<<',
					'>>',
					'&',
					'|',
					'~'
				].includes(op)
			) {
				expectUnary = true;
			} else {
				// Unknown op?
				expectUnary = true; // safe default
			}
		}

		tokens.push({
			value: op,
			type: 'operator',
			cost
		});
	}

	return tokens;
}

function getNumberCost(val: number): number {
	// 0 - 16   1
	// 17 - 256   2
	// 257 - 4096   4
	// 4097 - 65536   8
	// 65537 - 1048576   16

	// Logic: ranges are powers of 16?
	// 16^1 = 16. (0-16 -> 1)
	// 16^2 = 256. (17-256 -> 2)
	// 16^3 = 4096. (257-4096 -> 4)
	// 16^4 = 65536. (4097-... -> 8)

	// Base cost 1. Multiplier 2 for each step.
	// Step 0: val <= 16. Cost 1.
	// Step 1: val <= 256. Cost 2.
	// Step 2: val <= 4096. Cost 4.

	// Thresholds: 16, 256, 4096 ...
	// 16 = 16^1
	// 256 = 16^2
	// 4096 = 16^3

	// If val <= 16, return 1.
	// Else check next.

	if (val <= 16) return 1;

	let limit = 16;
	let cost = 1;

	while (val > limit) {
		limit *= 16;
		cost *= 2;
	}
	return cost;
}

function getStringCost(length: number): number {
	// 0 - 1   1
	// 2 - 3   2
	// 4 - 5   4
	// 6 - 7   8

	// Pattern:
	// l=0,1 -> 1 (2^0)
	// l=2,3 -> 2 (2^1)
	// l=4,5 -> 4 (2^2)
	// l=6,7 -> 8 (2^3)

	// Formula: cost = 2 ^ floor(length / 2)

	return Math.pow(2, Math.floor(length / 2));
}

function isKeyword(w: string): boolean {
	const keywords = new Set([
		'and',
		'break',
		'do',
		'else',
		'elseif',
		'end',
		'false',
		'for',
		'function',
		'if',
		'in',
		'local',
		'nil',
		'not',
		'or',
		'repeat',
		'return',
		'then',
		'true',
		'until',
		'while'
	]);
	return keywords.has(w);
}
