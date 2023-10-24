import Source from 'ol/source/Source.js'

import { RTree, WarpedMapList } from '@allmaps/render'

import type { TransformationType } from '@allmaps/transform'
import type { Point, BBox } from '@allmaps/render'

/**
 * WarpedMapSource class. Together with a [WarpedMapLayer](#warpedmaplayer), this class
 * renders a warped map on an OpenLayers map.
 * @class WarpedMapSource
 * @extends import("ol/source/Source.js")
 */
export class WarpedMapSource extends Source {
  rtree: RTree
  warpedMapList: WarpedMapList

  constructor(imageInfoCache?: Cache) {
    super({
      interpolate: true,
      projection: undefined,
      state: 'ready',
      wrapX: true
    })

    this.rtree = new RTree()
    this.warpedMapList = new WarpedMapList(this.rtree, imageInfoCache)
  }

  async addMap(map: unknown): Promise<string | Error> {
    const result = this.warpedMapList.addMap(map)
    this.changed()

    return result
  }

  async removeMap(map: unknown): Promise<string | Error> {
    const result = this.warpedMapList.removeMap(map)
    this.changed()

    return result
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param {any} annotation - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.warpedMapList.addGeoreferenceAnnotation(annotation)
    this.changed()

    return results
  }

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param {any} annotation - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.changed()

    return results
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @param {string} annotationUrl - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    const results = this.addGeoreferenceAnnotation(annotation)

    return results
  }

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @param {string} annotationUrl - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    const results = this.removeGeoreferenceAnnotation(annotation)

    return results
  }

  /**
   * Clears the source, removes all maps
   */
  clear() {
    this.warpedMapList.clear()
    this.changed()
  }

  /**
   * Returns the WarpedMapList object that contains a list of all maps
   */
  getWarpedMapList() {
    return this.warpedMapList
  }

  /**
   * Returns a single map
   * @param {string} mapId - ID of the warped map
   */
  getMap(mapId: string) {
    return this.warpedMapList.getMap(mapId)
  }

  /**
   * Make a single map visible
   * @param {string} mapId - ID of the warped map
   */
  showMap(mapId: string) {
    this.warpedMapList.showMaps([mapId])
    this.changed()
  }

  /**
   * Make multiple maps visible
   * @param {Iterable<string>} mapIds - IDs of the warped maps
   */
  showMaps(mapIds: Iterable<string>) {
    this.warpedMapList.showMaps(mapIds)
    this.changed()
  }

  /**
   * Make a single map invisible
   * @param {string} mapId - ID of the warped map
   */
  hideMap(mapId: string) {
    this.warpedMapList.hideMaps([mapId])
    this.changed()
  }

  /**
   * Make multiple maps invisible
   * @param {Iterable<string>} mapIds - IDs of the warped maps
   */
  hideMaps(mapIds: Iterable<string>) {
    this.warpedMapList.hideMaps(mapIds)
    this.changed()
  }

  /**
   * Returns visibility of a single map
   * @returns {boolean | undefined} - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    const warpedMap = this.warpedMapList.getMap(mapId)
    return warpedMap?.visible
  }

  /**
   * Sets the resource mask of a single map
   * @param {string} mapId - ID of the warped map
   * @param {Point[]} resourceMask - new resource mask
   */
  setResourceMask(mapId: string, resourceMask: Point[]) {
    this.warpedMapList.setResourceMask(mapId, resourceMask)
    this.changed()
  }

  /**
   * Sets the transformation type of multiple maps
   * @param {Iterable<string>} mapIds - IDs of the warped maps
   * @param {TransformationType} transformation - new transformation type
   */
  setMapsTransformation(
    mapIds: Iterable<string>,
    transformation: TransformationType
  ) {
    this.warpedMapList.setMapsTransformation(mapIds, transformation)
    this.changed()
  }

  /**
   * Return the extent of all maps in the source
   * @returns {BBox | undefined} - extent of all warped maps
   */
  getExtent(): BBox | undefined {
    return this.warpedMapList.getBBox()
  }

  /**
   * Bring maps to front
   * @param {Iterable<string>} mapIds - IDs of the warped maps to bring to front
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    this.warpedMapList.bringMapsToFront(mapIds)
    this.changed()
  }

  /**
   * Send maps to back
   * @param {Iterable<string>} mapIds - IDs of the warped maps to send to back
   */
  sendMapsToBack(mapIds: string[]) {
    this.warpedMapList.sendMapsToBack(mapIds)
    this.changed()
  }

  /**
   * Bring maps forward
   * @param {Iterable<string>} mapIds - IDs of the warped maps to bring forward
   */
  bringMapsForward(mapIds: Iterable<string>) {
    this.warpedMapList.bringMapsForward(mapIds)
    this.changed()
  }

  /**
   * Send maps backward
   * @param {Iterable<string>} mapIds - IDs of the warped maps to send backward
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    this.warpedMapList.sendMapsBackward(mapIds)
    this.changed()
  }

  /**
   * Returns the z-index of a single map
   * @param {string} mapId - ID of the warped map
   * @returns {number | undefined} - z-index of the warped map
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.warpedMapList.getMapZIndex(mapId)
  }

  setImageInfoCache(cache: Cache) {
    this.warpedMapList.setImageInfoCache(cache)
  }
}
