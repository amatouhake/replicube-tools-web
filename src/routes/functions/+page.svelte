<script lang="ts">
	import { onDestroy } from 'svelte';
	import type {
		WorkerCommand,
		WorkerResponse,
		TestCase,
		SearchConfig,
		SynthesisResult,
		UserConstraint,
		DomainSpec,
		OutputRequirement
	} from '$lib/synthesis/types';
	import { Normalizer } from '$lib/synthesis/Normalization';
	import SynthesisWorker from '$lib/synthesis/worker?worker';

	let worker: Worker | null = null;
	let isRunning = false;
	let logs: string[] = [];
	let results: SynthesisResult[] = [];
	let statusMessage = 'Ready';

	// Domain State
	let domain: DomainSpec = {
		x: [-2, 2],
		y: [-2, 2],
		z: [0, 0],
		t: [0, 0]
	};

	// Config State
	let bankLimit = 200000;
	let useBitwise = false;

	// Constraints State
	let constraints: UserConstraint[] = [
		{
			id: '1',
			conditionType: 'specific',
			targetInputs: 'x % 2 == 0',
			outputRequirement: { type: 'value', val: 1 }
		},
		{
			id: '2',
			conditionType: 'specific',
			targetInputs: 'x % 2 == 1',
			outputRequirement: { type: 'value', val: 0 }
		}
	];

	function addConstraint() {
		constraints = [
			...constraints,
			{
				id: crypto.randomUUID(),
				conditionType: 'specific',
				targetInputs: '',
				outputRequirement: { type: 'value', val: 1 }
			}
		];
	}

	function removeConstraint(id: string) {
		constraints = constraints.filter((c) => c.id !== id);
	}

	function log(msg: string) {
		logs = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logs].slice(0, 100);
	}

	function startGeneration() {
		stop();
		log('Starting worker...');

		try {
			// Normalize Cases
			const cases = Normalizer.generateTestCases(domain, constraints);
			if (cases.length === 0) {
				log('Error: No test cases generated. Check your constraints and domain.');
				return;
			}
			log(`Generated ${cases.length} test cases.`);
			if (cases.length < 50) {
				cases.forEach((c, i) => {
					log(
						`Case ${i}: (${c.input.x},${c.input.y},${c.input.z},${c.input.t}) -> val:${(c.expected as any).val ?? '?'}`
					);
				});
			}

			worker = new SynthesisWorker();

			worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
				const data = e.data;
				if (data.type === 'FOUND') {
					if (!results.find((r) => r.code === data.solution.code)) {
						results = [...results, data.solution].sort((a, b) => a.score - b.score);
						log(`FOUND: ${data.solution.code} (Score: ${data.solution.score})`);
					}
				} else if (data.type === 'DONE') {
					isRunning = false;
					statusMessage = `Done (${data.reason})`;
					log(`Worker finished: ${data.reason}`);
				} else if (data.type === 'ERROR') {
					log(`ERROR: ${data.message}`);
					statusMessage = 'Error';
				} else if (data.type === 'PROGRESS') {
					statusMessage = `Depth ${data.depth} | ${data.candidatesExplored}% scanned...`;
				}
			};

			const ops = ['+', '-', '*', '%', '==', '!='];
			if (useBitwise) {
				ops.push('&', '|', '^', '<<', '>>');
			}

			const config: SearchConfig = {
				maxDepth: 5,
				variables: ['x', 'y', 'z', 't'],
				ops,
				extraConstants: Normalizer.extractConstants(constraints),
				bankLimit
			};

			worker.postMessage({
				cmd: 'START',
				cases,
				config
			} as WorkerCommand);

			isRunning = true;
			results = [];
			statusMessage = 'Running...';
		} catch (err: any) {
			log(`Failed to start worker: ${err.message}`);
		}
	}

	function stop() {
		if (worker) {
			worker.terminate();
			worker = null;
		}
		isRunning = false;
		statusMessage = 'Stopped';
	}

	onDestroy(() => {
		stop();
	});
</script>

<div class="container">
	<header>
		<h1>Function Generator (Experimental)</h1>
		<div class="status-bar">
			<span>Status: <strong>{statusMessage}</strong></span>
		</div>
	</header>

	<div class="main-layout">
		<aside class="config-panel">
			<section class="panel-section">
				<h3>Domain</h3>
				<div class="input-row">
					<label
						>X: <input type="number" bind:value={domain.x[0]} class="num" /> ..
						<input type="number" bind:value={domain.x[1]} class="num" /></label
					>
				</div>
				<div class="input-row">
					<label
						>Y: <input type="number" bind:value={domain.y[0]} class="num" /> ..
						<input type="number" bind:value={domain.y[1]} class="num" /></label
					>
				</div>
				<div class="input-row">
					<label
						>Z: <input type="number" bind:value={domain.z[0]} class="num" /> ..
						<input type="number" bind:value={domain.z[1]} class="num" /></label
					>
				</div>
			</section>

			<section class="panel-section">
				<h3>Constraints <button on:click={addConstraint} class="btn-sm">+</button></h3>
				<div class="constraint-list">
					{#each constraints as c (c.id)}
						<div class="constraint-item">
							<div class="c-row">
								<label>If:</label>
								<input
									type="text"
									bind:value={c.targetInputs}
									placeholder="x % 2 == 0"
									class="code-input"
								/>
							</div>
							<div class="c-row">
								<label>Then:</label>
								<!-- Simple value input for MVP -->
								{#if c.outputRequirement.type === 'value'}
									<input type="number" bind:value={c.outputRequirement.val} class="num" />
								{/if}
								<button on:click={() => removeConstraint(c.id)} class="btn-del">×</button>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section class="panel-section">
				<h3>Settings</h3>
				<div class="input-row">
					<label style="width: 100px;">Bank Limit:</label>
					<input type="number" bind:value={bankLimit} class="num" style="width: 100px;" />
				</div>
				<div class="c-row">
					<label style="width: auto;">
						<input type="checkbox" bind:checked={useBitwise} /> Enable Bitwise (&, |, ^, &lt;&lt;, &gt;&gt;)
					</label>
				</div>
			</section>

			<div class="controls">
				<button on:click={startGeneration} disabled={isRunning} class="btn primary">
					Generate
				</button>
				<button on:click={stop} disabled={!isRunning} class="btn danger"> Stop </button>
			</div>
		</aside>

		<main class="results-panel">
			<h3>Results ({results.length})</h3>
			<div class="results-grid">
				{#each results as res}
					<div class="result-card">
						<code class="code">{res.code}</code>
						<div class="meta">
							<span>Len: {res.score}</span>
							<span>Ops: {res.complexity}</span>
						</div>
					</div>
				{/each}
			</div>
		</main>
	</div>

	<footer class="logs-panel">
		<h3>Logs</h3>
		<div class="logs">
			{#each logs as l}
				<div class="log-line">{l}</div>
			{/each}
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #111;
		color: #eee;
		font-family: 'Inter', sans-serif;
	}

	.container {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;
		max-height: 100vh;
	}

	header {
		padding: 1rem;
		background: #1a1a1a;
		border-bottom: 1px solid #333;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h1 {
		margin: 0;
		font-size: 1.2rem;
	}

	.main-layout {
		display: grid;
		grid-template-columns: 350px 1fr;
		overflow: hidden;
	}

	.config-panel {
		background: #151515;
		border-right: 1px solid #333;
		padding: 1rem;
		overflow-y: auto;
	}

	.panel-section {
		margin-bottom: 2rem;
	}

	h3 {
		font-size: 1rem;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
		color: #888;
		display: flex;
		justify-content: space-between;
	}

	.input-row {
		margin-bottom: 0.5rem;
	}
	.num {
		width: 50px;
		background: #222;
		border: 1px solid #444;
		color: white;
		padding: 4px;
		text-align: center;
	}
	.code-input {
		width: 100%;
		box-sizing: border-box;
		background: #222;
		border: 1px solid #444;
		color: #a5f3fc;
		padding: 4px;
		font-family: monospace;
	}

	.constraint-item {
		background: #222;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		border: 1px solid #333;
		border-radius: 4px;
	}

	.c-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 4px;
	}
	.c-row label {
		width: 40px;
		font-size: 0.8rem;
		color: #888;
	}

	.btn-sm {
		padding: 2px 8px;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.btn-del {
		margin-left: auto;
		background: none;
		border: none;
		color: #666;
		cursor: pointer;
	}
	.btn-del:hover {
		color: red;
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}
	.btn {
		flex: 1;
		padding: 0.75rem;
		border: none;
		font-weight: bold;
		cursor: pointer;
		border-radius: 4px;
	}
	.primary {
		background: #3b82f6;
		color: white;
	}
	.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.danger {
		background: #ef4444;
		color: white;
	}

	.results-panel {
		padding: 1rem;
		overflow-y: auto;
		background: #0f0f0f;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.result-card {
		background: #1a1a1a;
		border: 1px solid #333;
		padding: 1rem;
		border-radius: 4px;
		transition: transform 0.1s;
	}
	.result-card:hover {
		border-color: #555;
	}

	.code {
		color: #a5f3fc;
		display: block;
		margin-bottom: 0.5rem;
		word-break: break-all;
		font-family: 'Fira Code', monospace;
	}
	.meta {
		font-size: 0.8rem;
		color: #666;
		display: flex;
		gap: 1rem;
	}

	.logs-panel {
		height: 150px;
		background: #000;
		border-top: 1px solid #333;
		padding: 1rem;
		overflow-y: hidden;
		display: flex;
		flex-direction: column;
	}
	.logs {
		overflow-y: auto;
		flex: 1;
		font-family: monospace;
		font-size: 0.8rem;
		color: #666;
	}
</style>
