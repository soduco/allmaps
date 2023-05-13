import { z } from 'zod'

import { AnnotationSchema, AnnotationPageSchema } from './schemas/annotation.js'

import { MapSchema, MapsSchema } from './schemas/map.js'

type Annotation = z.infer<typeof AnnotationSchema>
type AnnotationPage = z.infer<typeof AnnotationPageSchema>

type Map = z.infer<typeof MapSchema>

export function validateAnnotation(
  annotation: unknown
): Annotation | AnnotationPage {
  if (
    annotation &&
    typeof annotation === 'object' &&
    'type' in annotation &&
    annotation.type === 'AnnotationPage'
  ) {
    const parsedAnnotationPage = AnnotationPageSchema.parse(annotation)
    return parsedAnnotationPage
  } else {
    const parsedAnnotation = AnnotationSchema.parse(annotation)
    return parsedAnnotation
  }
}

export function validateMap(mapOrMaps: unknown): Map | Map[] {
  if (Array.isArray(mapOrMaps)) {
    const parsedMaps = MapsSchema.parse(mapOrMaps)
    return parsedMaps
  } else {
    const parsedMap = MapSchema.parse(mapOrMaps)
    return parsedMap
  }
}
