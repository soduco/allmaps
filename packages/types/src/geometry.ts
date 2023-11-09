export type Point = [number, number]

export type Line = [Point, Point]

export type Rectangle = [Point, Point, Point, Point]

// Note:
// - At least 2 points
// - No duplicate points
export type LineString = Point[]

// Note:
// - At least 3 points
// - No duplicate points
// - Unclosed: last element is not a repetition of the first
// - So far no requirement on self-intersection although that may be useful in future
// - So far no requirement on winding order. This is only applied when exporting to geojson
export type Ring = Point[]

export type Polygon = Point[][]

export type Geometry = Point | LineString | Polygon

export type Gcp = { resource: Point; geo: Point }

/**
 * Bboxx. Defined as [minx, miny, maxx, maxy]
 *
 * @export
 * @typedef {Bbox}
 */
export type Bbox = [number, number, number, number]

export type Size = [number, number]

/**
 * Two numbers indicating the exent of a Bbox. Alternatively, two numbers indicating the minimum and maximum of, for example, an Array of numbers
 *
 * @export
 * @typedef {Extent}
 */
export type Extent = [number, number]

// TODO: change name to something like 'helmert transformation signature'
export type Transform = [number, number, number, number, number, number]

export type Matrix4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]
