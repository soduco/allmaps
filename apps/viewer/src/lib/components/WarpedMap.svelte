<script lang="ts">
  import { onMount } from 'svelte'

  import Map from 'ol/Map.js'
  import VectorLayer from 'ol/layer/Vector.js'
  import TileLayer from 'ol/layer/Tile.js'
  import VectorSource from 'ol/source/Vector.js'
  import Stroke from 'ol/style/Stroke.js'
  import Style from 'ol/style/Style.js'
  import GeoJSON from 'ol/format/GeoJSON.js'
  import XYZ from 'ol/source/XYZ.js'
  import View from 'ol/View.js'
  import { fromLonLat } from 'ol/proj.js'

  import { createTransformer, polygonToWorld } from '@allmaps/transform'
  import { IIIF } from '@allmaps/iiif-parser'

  import { WarpedMapLayer, WarpedMapSource } from '@allmaps/openlayers'

  export let maps

  let ol: Map
  let warpedMapLayer: WarpedMapLayer
  let warpedMapSource: WarpedMapSource

  let vectorSource
  let vectorLayer

  let xyz: XYZ
  let baseLayer

  $: updateMaps(maps)

  async function updateMaps(maps) {
    if (ol && warpedMapSource) {
      // vectorSource.clear()

      // console.log('add map', maps)
      for (let map of maps) {
        warpedMapSource.addMap(map)
        // console.log(map)
      }

      // const transformArgs = createTransformer(map.gcps)

      // // TODO: what happens with maps without pixelMask?!
      // // Make sure annotation parser/generator always adds pixelMask!
      // if (map.pixelMask && map.pixelMask.length) {
      //   const geoMask = polygonToWorld(transformArgs, map.pixelMask)
      //   vectorSource.addFeature((new GeoJSON()).readFeature(geoMask, { featureProjection: 'EPSG:3857' }))
      // }

      // const imageUri = map.image.uri

      // const image = await fetchImage(imageUri)
      // const parsedImage = parseIiif(image)

      // const options = {
      //   parsedImage,
      //   georeferencedMap: map,
      //   source: new VectorSource()
      // }

      // warpedMapLayer = new WarpedMapLayer(options)
      // ol.addLayer(warpedMapLayer)

      // warpedMapLayer.on('tile-load-error', (event) => {
      //   TODO: this is probably a CORS error! Show these!
      //   TODO: and show other errors as well...
      // })

      // const extent = vectorSource.getExtent()

      // ol.getView().fit(extent, {
      //   // TODO: move to settings file
      //   padding: [10, 10, 10, 10],
      //   maxZoom: 18
      // })
    }
  }

  async function fetchImage(imageUri: string) {
    const response = await fetch(`${imageUri}/info.json`)
    const image = await response.json()
    return image
  }

  const tileSources = [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  ]

  let tileSourceIndex = 0

  $: {
    if (xyz) {
      const tileUrl = tileSources[tileSourceIndex].url
      xyz.setUrl(tileUrl)
    }
  }

  onMount(async () => {
    const tileUrl = tileSources[tileSourceIndex].url
    // TODO: set attribution
    xyz = new XYZ({
      url: tileUrl,
      maxZoom: 19
    })

    baseLayer = new TileLayer({
      source: xyz
    })

    // vectorSource = new VectorSource()
    // vectorLayer = new VectorLayer({
    //   source: vectorSource,
    //   style: new Style({
    //     stroke: new Stroke({
    //       color: 'rgb(248, 193, 79)',
    //       width: 3
    //     })
    //   })
    // })

    // vectorLayer.setZIndex(100)

    warpedMapSource = new WarpedMapSource()
    warpedMapLayer3 = new WarpedMapLayer3({
      source: warpedMapSource
    })

    ol = new Map({
      layers: [baseLayer, warpedMapLayer3],
      target: 'ol',
      // controls: [],
      view: new View({
        center: [-7914732, 5209134],

        // minZoom: 6,
        maxZoom: 20,
        zoom: 12
      })
    })

    updateMaps(maps)
  })

  function handleKeydown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      warpedMapLayer3.setVisible(false)
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === 'Space') {
      warpedMapLayer3.setVisible(true)
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<div id="ol" class="zoom-controls-bottom-left" />

<div class="select-container">
  <div class="select">
    <select bind:value={tileSourceIndex}>
      <option value={0}>Map</option>
      <option value={2}>Satellite</option>
    </select>
  </div>
</div>

<style>
  #ol {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .select-container {
    bottom: 0;
    right: 0;
    position: absolute;
    padding: 0.5em;
  }
</style>
