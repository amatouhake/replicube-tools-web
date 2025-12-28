<script lang="ts">
	import {
		TextArea,
		Tile,
		Grid,
		Row,
		Column,
		CodeSnippet,
		InlineNotification
	} from 'carbon-components-svelte';

	let input = $state('');

	// Parse input into unique sorted number array
	let numbers = $derived.by(() => {
		if (!input.trim()) return [];
		const nums = input
			.split(/[\s,]+/)
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !isNaN(n));
		return [...new Set(nums)].sort((a, b) => a - b);
	});

	let min = $derived(numbers.length > 0 ? numbers[0] : 0);
	let max = $derived(numbers.length > 0 ? numbers[numbers.length - 1] : 0);
	let range = $derived(max - min);
	let isValid = $derived(numbers.length === 0 || range < 32);

	let mask = $derived.by(() => {
		if (numbers.length === 0 || !isValid) return 0;
		let m = 0;
		for (const n of numbers) {
			m |= 1 << (n - min);
		}
		// Treat as unsigned 32-bit integer
		return m >>> 0;
	});

	let maskHex = $derived('0x' + mask.toString(16).toUpperCase());
	let maskBin = $derived('0b' + mask.toString(2).padStart(range + 1, '0'));

	// Lua snippets
	// Requested formats:
	// bitmask >> x-offset & 1 == 1
	// bitmask >> x-offset & 1 ~= 0
	let luaSnippet1 = $derived.by(() => {
		if (numbers.length === 0 || !isValid) return '';
		// Mask (in decimal) >> (v - Offset) & 1 == 1
		let offsetPart = 'v';
		if (min > 0) offsetPart = `(v - ${min})`;
		else if (min < 0) offsetPart = `(v + ${Math.abs(min)})`;

		return `${mask} >> ${offsetPart} & 1 == 1`;
	});

	let luaSnippet2 = $derived.by(() => {
		if (numbers.length === 0 || !isValid) return '';
		let offsetPart = 'v';
		if (min > 0) offsetPart = `(v - ${min})`;
		else if (min < 0) offsetPart = `(v + ${Math.abs(min)})`;

		return `${mask} >> ${offsetPart} & 1 ~= 0`;
	});
</script>

<h1>Bitmask Generator</h1>
<p style="margin-bottom: 2rem;">
	Enter a list of integers (separated by <strong>comma</strong> or <strong>space</strong>, e.g.,
	<strong>1, 2, 5</strong>
	or <strong>1 2 5</strong>) to generate a bitmask and Lua check.
</p>

<Grid>
	<Row>
		<Column>
			<TextArea
				labelText="Integers"
				placeholder="e.g. 1, 2, 5"
				bind:value={input}
				invalid={!isValid}
				invalidText="Range between min and max must be less than 32."
			/>
		</Column>
	</Row>

	<Row style="margin-top: 2rem;">
		<Column>
			<h3>Results</h3>
			<Tile>
				<Grid>
					<Row>
						<Column sm={4} md={2} lg={2}><strong style="line-height: 2rem;">Offset</strong></Column>
						<Column><CodeSnippet type="inline" code={min.toString()} /></Column>
					</Row>
					<Row>
						<Column sm={4} md={2} lg={2}>
							<strong style="line-height: 2rem;">Mask (Hex)</strong>
						</Column>
						<Column><CodeSnippet type="inline" code={maskHex} /></Column>
					</Row>
					<Row>
						<Column sm={4} md={2} lg={2}>
							<strong style="line-height: 2rem;">Mask (Decimal)</strong>
						</Column>
						<Column><CodeSnippet type="inline" code={mask.toString()} /></Column>
					</Row>
					<Row>
						<Column sm={4} md={2} lg={2}>
							<strong style="line-height: 2rem;">Mask (Binary)</strong>
						</Column>
						<Column><CodeSnippet type="inline" code={maskBin} /></Column>
					</Row>
				</Grid>
			</Tile>
		</Column>
	</Row>

	<Row style="margin-top: 2rem;">
		<Column>
			<h3 style="margin-bottom: 1rem;">Lua Snippets</h3>

			<Grid>
				<Row style="align-items: center; margin-bottom: 1rem;">
					<Column sm={4} md={3} lg={3}>
						<p>Variant 1 (== 1)</p>
					</Column>
					<Column>
						<CodeSnippet type="single" code={luaSnippet1} />
					</Column>
				</Row>
				<Row style="align-items: center;">
					<Column sm={4} md={3} lg={3}>
						<p>Variant 2 (~= 0)</p>
					</Column>
					<Column>
						<CodeSnippet type="single" code={luaSnippet2} />
					</Column>
				</Row>
			</Grid>
		</Column>
	</Row>
</Grid>
