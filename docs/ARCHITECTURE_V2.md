# Remotion App V2 (Scene Graph, no plantillas cerradas)

## Objetivo
Pasar de `template-driven` a `scene-graph driven` para permitir animaciones personalizadas por video sin depender de plantillas fijas.

## Cambios clave
1. **Nuevo contrato de datos** en `server-v2/scene-schema.js`
   - `scenes[]`
   - `layers[]` por escena (`text`, `shape`, `metric`)
   - animaciones por capa (`enter`, `loop`, `exit`)
2. **Compiler seguro** en `server-v2/scene-compiler.js`
   - valida con Zod
   - normaliza tiempos
   - ordena capas por z-index
3. **Nuevo renderer** en Remotion
   - `remotion/primitives/PrimitiveRenderer.jsx`
   - `remotion/SceneGraphComposition.jsx`
   - composición `SceneGraphOverlay` registrada en `remotion/Root.jsx`

## Por qué esto sí permite personalización
- El LLM ya no selecciona una plantilla completa.
- El LLM define una escena con capas y parámetros visuales.
- El compilador aplica límites y guardrails.
- Remotion pinta escenas únicas en cada ejecución.

## Siguiente fase recomendada
- Añadir más primitivas (`icon`, `particle`, `caption-word`, `chart-bar`).
- Implementar animación de salida (`exit`) y bucle (`loop`) por capa.
- Integrar `SceneGraphOverlay` en `server/remotion-render.js` (toggle por feature flag).
- Añadir ranking de calidad visual y fallback automático.

## Ejemplo mínimo de Scene Plan
```json
{
  "scenes": [
    {
      "id": "s1",
      "startSec": 5.2,
      "durationSec": 3.5,
      "intent": "hook",
      "stylePack": "clean",
      "layers": [
        {
          "id": "bg-pill",
          "type": "shape",
          "shape": "pill",
          "style": {"x": 0.5, "y": 0.78, "w": 0.72, "h": 0.2, "fill": "#1e293b", "opacity": 0.88, "zIndex": 5}
        },
        {
          "id": "title",
          "type": "text",
          "text": "Sin plantillas, 100% personalizado",
          "style": {"x": 0.5, "y": 0.78, "fontSize": 64, "color": "#ffffff", "align": "center", "zIndex": 20},
          "enter": {"kind": "pop", "fromSec": 0, "durationSec": 0.5, "easing": "spring"}
        }
      ]
    }
  ]
}
```
