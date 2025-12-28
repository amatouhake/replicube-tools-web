import { calculateLuaSize } from './luaSize';
import { samples } from '../lua-size/samples';

console.log('Running Lua Size Verification...');

let passed = 0;
let failed = 0;

samples.forEach((sample, idx) => {
	const result = calculateLuaSize(sample.code);
	if (result.total === sample.size) {
		console.log(`Test #${idx + 1} PASSED. Size: ${result.total}`);
		passed++;
	} else {
		console.error(`Test #${idx + 1} FAILED. Expected ${sample.size}, got ${result.total}`);
		console.log('Code Snippet:');
		console.log(sample.code);
		console.log('Tokens:');
		result.tokens.forEach((t) => console.log(`  [${t.type}] '${t.value}' (cost: ${t.cost})`));
		failed++;
	}
});

console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
