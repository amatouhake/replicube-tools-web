<script lang="ts">
	import {
		Grid,
		Row,
		Column,
		TextArea,
		TextInput,
		NumberInput,
		Button,
		Tile,
		Dropdown,
		DataTable,
		Checkbox,
		InlineNotification
	} from 'carbon-components-svelte';
	import { untrack } from 'svelte';
	import { Add, PlayFilled, StopFilled, Copy, TrashCan } from 'carbon-icons-svelte';
	import { randomSearch, hillClimb } from '$lib/rvs/Searcher';
	import { COLOR_MAP } from '$lib/rvs/Evaluator';
	import type { RvsConfig, RvsResult, Condition, ParameterConfig } from '$lib/rvs/types';

	let template = $state('(x & A) >> B');
	let parameters = $state<ParameterConfig[]>([
		{ name: 'A', maxSize: 2 },
		{ name: 'B', maxSize: 1 }
	]);
	let conditions = $state<Condition[]>([
		{ rawExpression: '8 <= x <= 20', expectedType: 'color', expectedValue: 8 }
	]);

	let options = $state({
		treatMinusOneAsBlank: true,
		floorOutput: true,
		preferFewerColors: false
	});

	let isSearching = $state(false);
	let results = $state<RvsResult[]>([]);

	// Strictly match parameters to template
	$effect(() => {
		const found = template.match(/[A-Z]/g);
		const unique = Array.from(new Set(found || []));

		untrack(() => {
			parameters = unique.map((name) => {
				const existing = parameters.find((p) => p.name === name);
				return existing ? { ...existing } : { name, maxSize: 1 };
			});
		});
	});

	async function startSearch() {
		isSearching = true;
		results = [];

		const config: RvsConfig = {
			template,
			parameters,
			conditions,
			options
		};

		// 2500 iterations for better chance
		const randomResults = randomSearch(config, 2500);
		const optimizedResults = randomResults.map((seed) => hillClimb(config, seed, 20));

		results = optimizedResults.sort((a, b) => a.score - b.score);
		isSearching = false;
	}

	function stopSearch() {
		isSearching = false;
	}

	function addCondition() {
		conditions = [
			...conditions,
			{ rawExpression: 'x == 0', expectedType: 'color', expectedValue: 1 }
		];
	}

	function removeCondition(index: number) {
		conditions = conditions.filter((_, i) => i !== index);
	}

	function loadUserExample() {
		template = 'A^x // B';
		conditions = [
			{ rawExpression: '2 <= x <= 4', expectedType: 'color', expectedValue: 1 },
			{ rawExpression: '0 <= x <= 1', expectedType: 'color', expectedValue: 2 },
			{ rawExpression: '-2 <= x <= -1', expectedType: 'color', expectedValue: 3 }
		];
		parameters = [
			{ name: 'A', maxSize: 4 },
			{ name: 'B', maxSize: 4 }
		];
	}

	const colorItems = Object.entries(COLOR_MAP).map(([val, info]) => ({
		id: val.toString(),
		text: info.name
	}));

	const sizeItems = [
		{ id: '1', text: '1 (0-16, .01...)' },
		{ id: '2', text: '2 (0-256, 0.1...)' },
		{ id: '4', text: '4' },
		{ id: '8', text: '8' }
	];

	const typeItems = [
		{ id: 'color', text: 'Color' },
		{ id: 'number', text: 'Number' }
	];

	function copyToClipboard(res: RvsResult) {
		let code = template;
		const raw = (res as any).rawParameters || {};
		for (const [key, val] of Object.entries(raw)) {
			const rel = new RegExp(`\\b${key}\\b`, 'g');
			code = code.replace(rel, val as string);
		}
		navigator.clipboard.writeText(code);
	}
</script>

<Grid padding>
	<Row>
		<Column>
			<div
				style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;"
			>
				<h1>Random Value Searcher (RVS)</h1>
				<Button kind="tertiary" size="small" on:click={loadUserExample}
					>Load Example (.8^x // .4)</Button
				>
			</div>
		</Column>
	</Row>

	<Row>
		<Column lg={8}>
			<Tile style="margin-bottom: 1rem;">
				<TextArea
					labelText="Expression Template"
					placeholder="(x & A) >> B"
					bind:value={template}
					helperText="Operators: ^ (power), // (floor div), ~ (XOR), &, |, <<, >>"
				/>
			</Tile>

			<Tile style="margin-bottom: 1rem;">
				<h3>Parameters</h3>
				<Grid condensed>
					{#each parameters as p}
						<Row style="align-items: center; margin-bottom: 0.5rem;">
							<Column sm={1}><strong>{p.name}</strong></Column>
							<Column sm={3}>
								<Dropdown
									label="Max Token Size"
									size="sm"
									selectedId={p.maxSize.toString()}
									items={sizeItems}
									on:select={(e) => (p.maxSize = parseInt(e.detail.selectedId))}
								/>
							</Column>
						</Row>
					{/each}
				</Grid>
			</Tile>

			<Tile style="margin-bottom: 1rem; padding: 1rem;">
				<div
					style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;"
				>
					<h3 style="margin: 0;">Conditions</h3>
					<Button size="small" kind="ghost" icon={Add} on:click={addCondition}>Add Condition</Button
					>
				</div>

				<div style="border: 1px solid #e0e0e0; border-radius: 4px; background: #fff;">
					<!-- Header Row -->
					<div
						style="background: #f4f4f4; border-bottom: 1px solid #e0e0e0; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: bold; color: #555;"
					>
						<Grid condensed padding={false}>
							<Row>
								<Column sm={4} md={3}>Condition (e.g. 2 &lt;= x &lt;= 4)</Column>
								<Column sm={1} md={1}>Type</Column>
								<Column sm={2} md={3}>Expectation</Column>
								<Column sm={1} md={1}></Column>
							</Row>
						</Grid>
					</div>

					{#each conditions as cond, i}
						<div
							style="padding: 0.5rem; border-bottom: {i === conditions.length - 1
								? 'none'
								: '1px solid #e0e0e0'};"
						>
							<Grid condensed padding={false}>
								<Row style="align-items: center;">
									<Column sm={4} md={3}>
										<TextArea
											hideLabel
											rows={1}
											placeholder="x == 0 or 2 <= x <= 4"
											bind:value={cond.rawExpression}
										/>
									</Column>
									<Column sm={1} md={1}>
										<Dropdown
											hideLabel
											size="sm"
											selectedId={cond.expectedType}
											items={typeItems}
											on:select={(e) => {
												cond.expectedType = e.detail.selectedId as any;
											}}
										/>
									</Column>
									<Column sm={2} md={3}>
										{#if cond.expectedType === 'color'}
											<Dropdown
												hideLabel
												size="sm"
												selectedId={cond.expectedValue.toString()}
												items={colorItems}
												on:select={(e) => {
													const id = e.detail.selectedId;
													cond.expectedValue = id === 'blank' ? 'blank' : parseInt(id);
												}}
											/>
										{:else}
											<NumberInput hideLabel bind:value={cond.expectedValue as any} size="sm" />
										{/if}
									</Column>
									<Column sm={1} md={1} style="display: flex; justify-content: flex-end;">
										<Button
											kind="danger-ghost"
											iconDescription="Delete"
											icon={TrashCan}
											size="small"
											on:click={() => removeCondition(i)}
										/>
									</Column>
								</Row>
							</Grid>
						</div>
					{/each}
				</div>
			</Tile>
		</Column>

		<Column lg={8}>
			<Tile style="margin-bottom: 1rem;">
				<h3>Search Strategy</h3>
				<div style="margin: 1rem 0;">
					<InlineNotification
						lowContrast
						kind="info"
						title="Scoring System:"
						subtitle="10000 per Mismatch + 100 per Token Size. Mismatch count is the absolute priority."
					/>
				</div>
				<Checkbox labelText="Prefer fewer colors" bind:checked={options.preferFewerColors} />
				<Checkbox labelText="Floor output before compare" bind:checked={options.floorOutput} />

				<div style="margin-top: 2rem;">
					{#if !isSearching}
						<Button icon={PlayFilled} on:click={startSearch}>Start Search</Button>
					{:else}
						<Button kind="danger" icon={StopFilled} on:click={stopSearch}>Stop Search</Button>
					{/if}
				</div>
			</Tile>

			<Tile style="min-height: 400px;">
				<h3>Results</h3>
				<DataTable
					size="short"
					headers={[
						{ key: 'expr', empty: true },
						{ key: 'score', value: 'Score' },
						{ key: 'size', value: 'Size' },
						{ key: 'mismatch', value: 'Err' },
						{ key: 'actions', empty: true }
					]}
					rows={results.map((r, i) => ({
						id: i,
						expr: Object.entries((r as any).rawParameters || r.parameters)
							.map(([k, v]) => `${k}=${v}`)
							.join(', '),
						score: Math.floor(r.score),
						size: r.size,
						mismatch: r.mismatchCount,
						raw: r
					}))}
				>
					<svelte:fragment slot="cell" let:row let:cell>
						{#if cell.key === 'expr'}
							<div style="font-family: monospace; font-size: 0.8rem;">{cell.value}</div>
						{:else if cell.key === 'actions'}
							<div style="display: flex; gap: 0.5rem;">
								<Button
									kind="ghost"
									size="small"
									icon={Copy}
									on:click={() => copyToClipboard(row.raw as any)}
								/>
							</div>
						{:else}
							{cell.value}
						{/if}
					</svelte:fragment>
				</DataTable>
			</Tile>
		</Column>
	</Row>
</Grid>
