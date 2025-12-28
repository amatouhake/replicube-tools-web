<script lang="ts">
	import { Grid, Row, Column, ClickableTile, Tile } from 'carbon-components-svelte';
	import {
		StringInteger,
		Function as FunctionIcon,
		Scale,
		SearchAdvanced,
		DataAnalytics
	} from 'carbon-icons-svelte';
</script>

<div class="dashboard-hero">
	<Grid>
		<Row>
			<Column lg={12}>
				<div class="hero-content">
					<h1 class="hero-title">Replicube Tools</h1>
					<p class="hero-subtitle">
						Generate and evaluate Replicube-style expressions. Search constants, measure code size,
						and preview results.
					</p>
				</div>
			</Column>
		</Row>
	</Grid>
</div>

<Grid padding>
	<Row>
		<Column lg={16} style="margin-bottom: 2rem;">
			<Tile kind="info" style="border-left: 4px solid #0f62fe;">
				<h4 style="margin-bottom: 0.5rem;">What is this?</h4>
				<p style="max-width: 800px; color: #c6c6c6; line-height: 1.5;">
					Whether you are optimizing bitmasks for massive structures, generating complex procedural
					functions, or searching for the perfect mathematical expression to map values, this
					toolkit provides the precision you need. Built for creators who push the limits of voxel
					logic.
				</p>
			</Tile>
		</Column>
	</Row>

	<Row>
		<Column lg={4} md={4} sm={4} class="tool-column">
			<ClickableTile href="/bitmask" class="tool-tile">
				<div class="tile-header">
					<StringInteger size={32} class="tile-icon" />
					<h3>Bitmask Gen</h3>
				</div>
				<p>Create visual bitmasks for complex voxel offsets and structures.</p>
			</ClickableTile>
		</Column>

		<Column lg={4} md={4} sm={4} class="tool-column">
			<ClickableTile href="/rvs" class="tool-tile highlight-tile">
				<div class="tile-header">
					<SearchAdvanced size={32} class="tile-icon highlight-icon" />
					<h3>Value Search</h3>
				</div>
				<p>Find the exact math expressions (Lua) to match your color/value patterns.</p>
			</ClickableTile>
		</Column>

		<Column lg={4} md={4} sm={4} class="tool-column">
			<ClickableTile href="/function" class="tool-tile">
				<div class="tile-header">
					<FunctionIcon size={32} class="tile-icon" />
					<h3>Functions</h3>
				</div>
				<p>Generate boilerplate Lua functions and logic snippets instantly.</p>
			</ClickableTile>
		</Column>

		<Column lg={4} md={4} sm={4} class="tool-column">
			<ClickableTile href="/lua-size" class="tool-tile">
				<div class="tile-header">
					<Scale size={32} class="tile-icon" />
					<h3>Size Checker</h3>
				</div>
				<p>Monitor and optimize the token count of your Replicube scripts.</p>
			</ClickableTile>
		</Column>
	</Row>
</Grid>

<style>
	:global(body) {
		background-color: #161616;
	}

	.dashboard-hero {
		background: linear-gradient(135deg, #0f62fe 0%, #393939 100%);
		padding: 4rem 0;
		margin-top: -3rem; /* Offset Content padding */
		margin-bottom: 2rem;
		border-bottom: 1px solid #393939;
	}

	.hero-content {
		max-width: 800px;
	}

	.hero-title {
		font-size: 3.5rem;
		font-weight: 800;
		color: #ffffff;
		margin-bottom: 1rem;
		letter-spacing: -1px;
	}

	.hero-subtitle {
		font-size: 1.25rem;
		color: #e0e0e0;
		line-height: 1.4;
		opacity: 0.9;
	}

	:global(.tool-tile) {
		height: 100%;
		transition:
			transform 0.2s ease,
			border-color 0.2s ease !important;
		border: 1px solid #393939 !important;
		background-color: #262626 !important;
	}

	:global(.tool-tile:hover) {
		transform: translateY(-4px);
		border-color: #0f62fe !important;
		background-color: #2d2d2d !important;
	}

	.tile-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	:global(.tile-icon) {
		color: #0f62fe;
	}

	:global(.highlight-tile) {
		border-color: #4589ff !important;
	}

	:global(.highlight-icon) {
		color: #4589ff !important;
	}

	h3 {
		margin-top: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	p {
		font-size: 0.875rem;
		color: #a8a8a8;
	}

	.tool-column {
		margin-bottom: 1rem;
	}
</style>
