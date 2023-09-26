/* eslint-disable @typescript-eslint/no-explicit-any */
import * as L from 'leaflet'
// import { throttle, type DebouncedFunc } from 'lodash-es'

import { Annotation } from '@allmaps/annotation'
import {
  TileCache,
  World,
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  composeTransform,
  WebGL2Renderer,
  RTree
} from '@allmaps/render'

import type { Map } from 'leaflet'

import type {
  Size,
  BBox,
  Transform,
  OptionalColor,
  NeededTile
} from '@allmaps/render'

// export interfacetype GeoreferenceAnnotationLayerOptions extends LayerOptions {
//   tileSize: object
//   tileLayers: object[]
//   tileUrls: string[]
// }

// export interface GeoreferenceAnnotationLayer extends Layer {
//   GeoreferenceAnnotation: GeoreferenceAnnotationLayer
//   // constructor(options?: GeoreferenceAnnotationLayerOptions)
//   // bringToFront(): this;
//   // getTileSize(): Point;
//   // protected createTile(coords: Coords, done: DoneCallback): HTMLElement;
// }

type FrameState = {
  size: [number, number] // [width, height]
  rotation: number // rotation in radians
  resolution: number
  center: [number, number] // position
  extent: [number, number, number, number] // [minx, miny, maxx, maxy]
  coordinateToPixelTransform: Transform
}

const WarpedMapLayer = L.Layer.extend({
  options: { imageInfoCache: Cache },
  initialize: function (annotation: Annotation, options: any) {
    this.annotation = annotation
    L.setOptions(this, options)

    this.container = L.DomUtil.create('div')

    this.container.style.position = 'absolute'
    this.container.style.width = '100%'
    this.container.style.height = '100%'
    this.container.classList.add('leaflet-layer')
    this.container.classList.add('allmaps-warped-layer')

    this.canvas = L.DomUtil.create('canvas', undefined, this.container)

    this.gl = this.canvas.getContext('webgl', {
      premultipliedAlpha: true
    })

    if (!this.gl) {
      throw new Error('WebGL 2 not available')
    }

    const resizeObserver = new ResizeObserver(this.onResize.bind(this))
    resizeObserver.observe(this.canvas, { box: 'content-box' })

    this.tileCache = new TileCache()
    this.renderer = new WebGL2Renderer(this.gl, this.tileCache)

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.rendererChanged.bind(this)
    )

    this.rtree = new RTree()
    this.world = new World(this.rtree, options.imageInfoCache)

    this.world.addGeoreferenceAnnotation(annotation)

    this.viewport = new Viewport(this.world)

    this.world.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.ZINDICESCHANGES,
      this.zIndicesChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this.visibilityChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.RESOURCEMASKUPDATED,
      this.resourceMaskUpdated.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.CLEARED,
      this.worldCleared.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.TILELOADED,
      this._update.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.ALLTILESLOADED,
      this._update.bind(this)
    )

    // TODO: throttling
    // this.throttledUpdateViewportAndGetTilesNeeded = throttle(
    //   this.viewport.updateViewportAndGetTilesNeeded.bind(this.viewport),
    //   THROTTLE_WAIT_MS,
    //   THROTTLE_OPTIONS
    // )

    this.viewport.addEventListener(
      WarpedMapEventType.WARPEDMAPENTER,
      this.warpedMapEnter.bind(this)
    )
    this.viewport.addEventListener(
      WarpedMapEventType.WARPEDMAPLEAVE,
      this.warpedMapLeave.bind(this)
    )

    for (const warpedMap of this.world.getMaps()) {
      this.renderer.addWarpedMap(warpedMap)
    }
  },

  arraysEqual<T>(arr1: Array<T> | null, arr2: Array<T> | null) {
    if (!arr1 || !arr2) {
      return false
    }

    const len1 = arr1.length
    if (len1 !== arr2.length) {
      return false
    }
    for (let i = 0; i < len1; i++) {
      if (arr1[i] !== arr2[i]) {
        return false
      }
    }
    return true
  },

  warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string

      const warpedMap = this.world.getMap(mapId)

      if (warpedMap) {
        this.renderer.addWarpedMap(warpedMap)
      }

      // TODO: event
      // const olEvent = new OLWarpedMapEvent(
      //   WarpedMapEventType.WARPEDMAPADDED,
      //   mapId
      // )
      // this.dispatchEvent(olEvent)
    }

    this._update()
  },

  zIndicesChanged() {
    const sortedMapIdsInViewport = [...this.mapIdsInViewport].sort(
      (mapIdA, mapIdB) => {
        const zIndexA = this.world.getZIndex(mapIdA)
        const zIndexB = this.world.getZIndex(mapIdB)
        if (zIndexA !== undefined && zIndexB !== undefined) {
          return zIndexA - zIndexB
        }

        return 0
      }
    )

    this.mapIdsInViewport = new Set(sortedMapIdsInViewport)
    this._update()
  },

  visibilityChanged() {
    this._update()
  },

  resourceMaskUpdated(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const warpedMap = this.world.getMap(mapId)

      if (warpedMap) {
        this.renderer.updateTriangulation(warpedMap)
      }
    }
  },

  warpedMapEnter(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      this.mapIdsInViewport.add(mapId)
      this.zIndicesChanged()
    }
  },

  warpedMapLeave(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      this.mapIdsInViewport.delete(mapId)
    }
  },

  worldCleared() {
    this.renderer.clear()
    this.tileCache.clear()
  },

  rendererChanged() {
    this._update()
  },

  transformationChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const mapId of mapIds) {
        const warpedMap = this.world.getMap(mapId)

        if (warpedMap) {
          this.renderer.updateTriangulation(warpedMap, false)
        }
      }

      this.renderer.startTransformationTransition()
    }
  },

  onResize(entries: ResizeObserverEntry[]) {
    // From https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // TODO: read + understand https://web.dev/device-pixel-content-box/
    for (const entry of entries) {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      const dpr = window.devicePixelRatio

      // if (entry.devicePixelContentBoxSize) {
      //   // NOTE: Only this path gives the correct answer
      //   // The other paths are imperfect fallbacks
      //   // for browsers that don't provide anyway to do this
      //   width = entry.devicePixelContentBoxSize[0].inlineSize
      //   height = entry.devicePixelContentBoxSize[0].blockSize
      //   dpr = 1 // it's already in width and height
      // } else if (entry.contentBoxSize) {
      //   if (entry.contentBoxSize[0]) {
      //     width = entry.contentBoxSize[0].inlineSize
      //     height = entry.contentBoxSize[0].blockSize
      //   }
      // }

      const displayWidth = Math.round(width * dpr)
      const displayHeight = Math.round(height * dpr)

      this.canvasSize = [displayWidth, displayHeight]
    }
    this._update()
  },

  resizeCanvas(canvas: HTMLCanvasElement, [width, height]: [number, number]) {
    const needResize = canvas.width !== width || canvas.height !== height

    if (needResize) {
      canvas.width = width
      canvas.height = height
    }

    return needResize
  },

  hexToRgb(hex: string | undefined): OptionalColor {
    if (!hex) {
      return
    }

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [
          parseInt(result[1], 16) / 256,
          parseInt(result[2], 16) / 256,
          parseInt(result[3], 16) / 256
        ]
      : undefined
  },

  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this._update()
  },

  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this._update()
  },

  setRemoveBackground(
    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
    const color = this.hexToRgb(options.hexColor)

    this.renderer.setRemoveBackground({
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this._update()
  },

  resetRemoveBackground() {
    this.renderer.resetRemoveBackground()
    this._update()
  },

  setMapRemoveBackground(
    mapId: string,

    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
    const color = this.hexToRgb(options.hexColor)

    this.renderer.setMapRemoveBackground(mapId, {
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this._update()
  },

  resetMapRemoveBackground(mapId: string) {
    this.renderer.resetMapRemoveBackground(mapId)
  },

  setColorize(hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setColorize({ color })
      this._update()
    }
  },

  resetColorize() {
    this.renderer.resetColorize()
    this._update()
  },

  setMapColorize(mapId: string, hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setMapColorize(mapId, { color })
      this._update()
    }
  },

  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorize(mapId)
    this._update()
  },

  // disposeInternal() {
  // for (let warpedMapWebGLRenderer of this.warpedMapWebGLRenderers.values()) {
  //   warpedMapWebGLRenderer.dispose()
  // }

  // if (this.gl) {
  //   for (let uboBuffer of this.uboBuffers.values()) {
  //     this.gl.deleteBuffer(uboBuffer)
  //   }

  //   this.gl.deleteProgram(this.program)
  //   this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  // }

  // super.disposeInternal()
  // }

  // TODO: use OL's own makeProjectionTransform function?
  makeProjectionTransform(frameState: FrameState): Transform {
    const size = frameState.size
    const rotation = frameState.rotation
    const resolution = frameState.resolution
    const center = frameState.center

    return composeTransform(
      0,
      0,
      2 / (resolution * size[0]),
      2 / (resolution * size[1]),
      -rotation,
      -center[0],
      -center[1]
    )
  },

  // TODO: Use OL's renderer class, move this function there?
  prepareFrameInternal(frameState: FrameState) {
    const vectorSource = this.source
    // TODO: animation and interaction
    // const viewNotMoving =
    //   !frameState.viewHints[ViewHint.ANIMATING] &&
    //   !frameState.viewHints[ViewHint.INTERACTING]
    const extentChanged = !this.arraysEqual(
      this.previousExtent,
      frameState.extent
    )

    let sourceChanged = false
    if (vectorSource) {
      sourceChanged =
        this.lastPreparedFrameSourceRevision < vectorSource.getRevision()

      if (sourceChanged) {
        this.lastPreparedFrameSourceRevision = vectorSource.getRevision()
      }
    }

    const layerChanged =
      this.lastPreparedFrameLayerRevision < this.getRevision()

    if (layerChanged) {
      this.lastPreparedFrameLayerRevision = this.getRevision()
    }

    // TODO: interaction
    // if (layerChanged || (viewNotMoving && (extentChanged || sourceChanged))) {
    if (layerChanged || extentChanged || sourceChanged) {
      this.previousExtent = frameState.extent?.slice() || null

      const projectionTransform = this.makeProjectionTransform(frameState)
      this.renderer.updateVertexBuffers(
        projectionTransform,
        this.mapIdsInViewport.values()
      )
    }
  },

  renderInternal(frameState: FrameState, last = false): HTMLElement {
    this.prepareFrameInternal(frameState)

    const projectionTransform = this.makeProjectionTransform(frameState)

    if (frameState.extent) {
      const extent = frameState.extent as BBox

      this.renderer.setOpacity(this.getOpacity())

      const viewportSize = [
        frameState.size[0] * window.devicePixelRatio,
        frameState.size[1] * window.devicePixelRatio
      ] as Size

      let tilesNeeded: NeededTile[] | undefined
      if (last) {
        tilesNeeded = this.viewport.updateViewportAndGetTilesNeeded(
          viewportSize,
          extent,
          frameState.coordinateToPixelTransform as Transform
        )
      } else {
        tilesNeeded = this.throttledUpdateViewportAndGetTilesNeeded(
          viewportSize,
          extent,
          frameState.coordinateToPixelTransform as Transform
        )
      }

      if (tilesNeeded && tilesNeeded.length) {
        this.tileCache.setTiles(tilesNeeded)
      }

      // TODO: reset maps not in viewport, make sure these only
      // get drawn when they are visible AND when they have their buffers
      // updated.
      this.renderer.render(projectionTransform, this.mapIdsInViewport.values())
    }

    return this.container
  },

  render(frameState: FrameState): HTMLElement {
    // TODO: throttled
    // if (this.throttledRenderTimeoutId) {
    //   clearTimeout(this.throttledRenderTimeoutId)
    // }

    if (this.canvas) {
      this.resizeCanvas(this.canvas, this.canvasSize)
    }

    // TODO: throttled
    // this.throttledRenderTimeoutId = setTimeout(() => {
    //   this.renderInternal(frameState, true)
    // }, THROTTLE_WAIT_MS)

    return this.renderInternal(frameState)
  },

  computeFrameState(): FrameState {
    return {
      size: this._map.getSize(), // [number, number] // [width, height]
      rotation: 0, // number // rotation in radians
      resolution: this._map.options.crs.scale(), // number // projection units per pixel
      center: this._map.getCenter(), // [number, number] // position
      extent: this._map.getPixelBounds().map((bounds: L.Bounds) => {
        bounds.min && bounds.max
          ? [bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y]
          : new Error('Bounds error')
      }), // [number, number, number, number] // [minx, miny, maxx, maxy]
      // TODO build this from latLngToLayerPoint or latLngToContainerPoint
      coordinateToPixelTransform: [1, 0, 1, 0, 0, 0] // Transform
    }
  },

  /////////////////////

  onAdd: function (map: Map) {
    const pane = map.getPane(this.options.pane)
    if (!pane) {
      throw new Error('Pane not found')
    }
    pane.appendChild(this.container)

    this._map = map

    // TODO: check: Calculate initial position of container with `L.Map.latLngToLayerPoint()`, `getPixelOrigin()` and/or `getPixelBounds()`
    L.DomUtil.setPosition(this.canvas, map.getPixelOrigin())

    map.on('zoomend viewreset', this._update, this)
  },

  onRemove: function (map: Map) {
    this.container.remove()
    map.off('zoomend viewreset', this._update, this)
  },

  _update: function () {
    // Recalculate position of container
    // L.DomUtil.setPosition(this.canvas, map.getPixelOrigin())
    // TODO: call render function here and reference this.canvas
    this.computeFrameState()
    this.render()
  }
})

// L.Layer.georeferenceAnnotation = function () {
//   return new L.Layer.GeoreferenceAnnotation()
// }

export default WarpedMapLayer
