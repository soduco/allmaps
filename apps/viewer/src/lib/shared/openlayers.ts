import { Stroke, Fill, Style } from 'ol/style'

import type { SVGPolygon } from '@allmaps/render'

export function invisiblePolygonStyle() {
  return new Style({
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.0)'
    })
  })
}

export function outlinePolygonStyle() {
  return new Style({
    stroke: new Stroke({
      color: '#ff0800',
      width: 1
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.0)'
    })
  })
}

export function selectedPolygonStyle() {
  return new Style({
    stroke: new Stroke({
      color: '#ff0800',
      width: 3
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.0)'
    })
  })
}

export function maskToPolygon(pixelMask: SVGPolygon) {
  return [
    [
      ...pixelMask.map((coordinate) => [coordinate[0], -coordinate[1]]),
      [pixelMask[0][0], -pixelMask[0][1]]
    ]
  ]
}
