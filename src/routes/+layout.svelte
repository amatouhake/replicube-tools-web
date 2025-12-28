<script lang="ts">
	import 'carbon-components-svelte/css/g100.css';
	import {
		Header,
		HeaderUtilities,
		SideNav,
		SideNavItems,
		SideNavLink,
		Content,
		SkipToContent,
		Theme
	} from 'carbon-components-svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let isSideNavOpen = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- @ts-ignore -->
<Header platformName="Replicube Tools" bind:isSideNavOpen>
	<svelte:fragment slot="skip-to-content">
		<SkipToContent />
	</svelte:fragment>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
	<SideNavItems>
		<SideNavLink href="/" text="Dashboard" />
		<SideNavLink href="/bitmask" text="Bitmask Generator" />
		<SideNavLink href="/function" text="Function Generator" />
		<SideNavLink href="/lua-size" text="Lua Size Checker" />
		<SideNavLink href="/rvs" text="Random Value Searcher" />
	</SideNavItems>
</SideNav>

<Content>
	{@render children()}
</Content>

<Theme theme="g100" />
