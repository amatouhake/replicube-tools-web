<script lang="ts">
	import { calculateLuaSize, type Token } from '$lib/utils/luaSize';
	import {
		Grid,
		Row,
		Column,
		TextArea,
		Tile,
		Tag,
		Accordion,
		AccordionItem,
		UnorderedList,
		ListItem
	} from 'carbon-components-svelte';

	let code = $state('');
	let result = $derived.by(() => {
		try {
			if (!code.trim()) return null;
			return calculateLuaSize(code);
		} catch (e) {
			return null;
		}
	});

	function getTokenColor(
		type: string
	):
		| 'purple'
		| 'cool-gray'
		| 'teal'
		| 'green'
		| 'blue'
		| 'gray'
		| 'magenta'
		| 'cyan'
		| 'red'
		| 'warm-gray' {
		switch (type) {
			case 'keyword':
				return 'purple';
			case 'operator':
				return 'cool-gray';
			case 'number':
				return 'teal';
			case 'string':
				return 'green';
			case 'identifier':
				return 'blue';
			case 'comment':
				return 'gray';
			default:
				return 'gray';
		}
	}
</script>

<Grid padding>
	<Row>
		<Column>
			<h1 style="margin-bottom: 2rem;">Lua Code Size Checker</h1>
		</Column>
	</Row>

	<Row>
		<Column lg={8} md={8} sm={4}>
			<TextArea
				placeholder="Paste your Lua code here..."
				rows={30}
				bind:value={code}
				helperText="Comments and whitespace are not counted. Closing brackets ) ] {'}'} are 0 tokens."
				style="font-family: 'IBM Plex Mono', monospace;"
			/>
		</Column>

		<Column lg={8} md={8} sm={4}>
			<Tile style="height: 100%; display: flex; flex-direction: column; min-height: 600px;">
				<div style="margin-bottom: 2rem; text-align: center;">
					<h2 style="font-size: 1rem; color: var(--cds-text-secondary); margin-bottom: 0.5rem;">
						TOTAL TOKEN SIZE
					</h2>
					<p style="font-size: 4rem; font-weight: bold; color: var(--cds-support-02);">
						{result?.total ?? 0}
					</p>
				</div>

				<div
					style="flex: 1; overflow-y: auto; border-top: 1px solid var(--cds-ui-03); padding-top: 1rem;"
				>
					<h3
						style="font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; color: var(--cds-text-secondary);"
					>
						TOKEN BREAKDOWN
					</h3>
					<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-content: flex-start;">
						{#if result}
							{#each result.tokens as token}
								<div class="token-container">
									<Tag type={getTokenColor(token.type)} size="sm">
										{token.value}
									</Tag>
									<span class="token-cost">{token.cost}</span>
								</div>
							{/each}
						{:else}
							<p style="color: var(--cds-text-placeholder); font-style: italic;">
								Enter code to see details...
							</p>
						{/if}
					</div>
				</div>
			</Tile>
		</Column>
	</Row>

	<Row style="margin-top: 2rem;">
		<Column>
			<Accordion>
				<AccordionItem title="Rules Reference" open>
					<Grid condensed>
						<Row>
							<Column lg={8}>
								<UnorderedList>
									<ListItem>
										<strong>Basic Tokens:</strong> Keywords, Identifiers, Operators (Cost: 1)
									</ListItem>
									<ListItem>
										<strong>Closing Elements:</strong> <code>) {'}'} ]</code> (Cost: 0)
									</ListItem>
									<ListItem>
										<strong>Whitespace & Comments:</strong> Not counted (Cost: 0)
									</ListItem>
								</UnorderedList>
							</Column>
							<Column lg={8}>
								<UnorderedList>
									<ListItem>
										<strong>Numbers:</strong> Escalating cost based on magnitude.
										<div style="margin-left: 1rem; color: var(--cds-text-secondary);">
											(0-16: 1, 17-256: 2, 257-4096: 4, etc.)
										</div>
									</ListItem>
									<ListItem>
										<strong>Strings:</strong> Cost doubles every 2 characters.
										<div style="margin-left: 1rem; color: var(--cds-text-secondary);">
											(0-1: 1, 2-3: 2, 4-5: 4, 6-7: 8, etc.)
										</div>
									</ListItem>
								</UnorderedList>
							</Column>
						</Row>
					</Grid>
				</AccordionItem>
			</Accordion>
		</Column>
	</Row>
</Grid>

<style>
	:global(.bx--text-area) {
		font-family: 'IBM Plex Mono', monospace !important;
	}

	.token-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--cds-ui-02);
		border: 1px solid var(--cds-ui-03);
		border-radius: 4px;
		padding: 2px;
	}

	.token-cost {
		font-size: 0.7rem;
		color: var(--cds-text-secondary);
		border-top: 1px solid var(--cds-ui-03);
		width: 100%;
		text-align: center;
		padding-top: 2px;
		margin-top: 2px;
	}
</style>
