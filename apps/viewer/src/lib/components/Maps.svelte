<script lang="ts">
  import WarpedMap from './WarpedMap.svelte'
  import IIIFImage from './IIIFImage.svelte'
  import MapSelector from './MapSelector.svelte'

  import type { Map as MapType } from '@allmaps/annotation'

  // import { trackHostnames } from './lib/umami.js'

  export let maps: MapType[]

  // trackHostnames(maps)

  let selectedMap = 0

  $: map = maps[selectedMap]
  $: tab = 'map'

  function updateSelectedMap (event) {
    selectedMap = event.detail.selectedMap
  }
</script>

<div class="maps">
  {#if tab === 'map'}
    <div class="ol-container">
      <WarpedMap maps={maps} />
    </div>
  {:else if tab === 'iiif'}
    <div class="ol-container">
      <IIIFImage map={map} />
    </div>
  {/if}

  <div class="tabs is-toggle">
    <ul>
      <li class:is-active={tab === 'map'}>
        <a on:click={() => tab = 'map'}>
          <span>Warped map</span>
        </a>
      </li>
      <li class:is-active={tab === 'iiif'}>
        <a on:click={() => tab = 'iiif'}>
          <span>Original image</span>
        </a>
      </li>
    </ul>
  </div>
</div>

{#if maps.length > 1}
  <MapSelector maps={maps} selectedMap={selectedMap}
    on:update={updateSelectedMap}/>
{/if}

<style scoped>
.maps {
  height: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.tabs {
  top: 0;
  right: 0;
  position: absolute;
  padding: 0.5em;
}

.tabs li a {
  background: white;
}

.ol-container {
  flex-grow: 1;
  height: 100%;
  position: relative;
}
</style>
