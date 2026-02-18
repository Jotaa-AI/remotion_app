# Scene Quality v1

## Qué hace
`server-v2/scene-quality.js` aplica una capa previa al render para:
- Evaluar calidad por escena (`score 0-1`)
- Reducir clutter automáticamente
- Activar fallback desde overlays si el plan de escenas es inválido o de baja calidad

## Reglas anti-clutter
- Máximo 8 capas por escena
- Máximo 2 capas con `loop`
- `loop.params.amp` limitado a `0.004 - 0.03`

## Score v1
Penaliza:
- Exceso de capas
- Demasiadas capas de texto
- Exceso de loops
- Textos largos y poca legibilidad (font-size bajo / maxWidth alto)

## Fallbacks
- `scene-plan-invalid-schema` -> fallback desde `eventsToScenes`
- `scene-plan-low-quality-fallback` -> fallback si media < 0.55

## Persistencia
Se guarda en job:
- `sceneQuality.averageScore`
- `sceneQuality.sceneScores[]`
- `sceneQuality.warnings[]`
