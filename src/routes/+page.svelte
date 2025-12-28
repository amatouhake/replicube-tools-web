<script>
	import { Tile, ClickableTile, Grid, Row, Column } from 'carbon-components-svelte';
</script>

<h1>Welcome to Replicube Tools</h1>
<p style="margin-bottom: 2rem;">Select a tool from the sidebar to get started.</p>

<Grid>
	<Row>
		<Column lg={4} md={4} sm={4}>
			<ClickableTile href="/bitmask">
				<h3>Bitmask Generator</h3>
				<p>Create bitmasks visually for your voxel models.</p>
			</ClickableTile>
		</Column>
		<Column lg={4} md={4} sm={4}>
			<ClickableTile href="/functions">
				<h3>Function Generator</h3>
				<p>Generate Lua functions easily.</p>
			</ClickableTile>
		</Column>
		<Column lg={4} md={4} sm={4}>
			<ClickableTile href="/lua-size">
				<h3>Lua Code Size</h3>
				<p>Check the size of your Lua scripts.</p>
			</ClickableTile>
		</Column>
	</Row>
</Grid>
