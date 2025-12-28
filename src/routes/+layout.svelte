<script lang="ts">
	import 'carbon-components-svelte/css/all.css';
	import { Theme } from 'carbon-components-svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<Theme theme="g100" render="toggle" />
