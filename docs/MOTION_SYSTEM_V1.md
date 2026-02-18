# Motion System v1 (Scene Graph)

## Objetivo
Elevar calidad visual en SceneGraph con animaciones por capa y consistencia narrativa.

## Reglas base
- Cada capa puede declarar `enter`, `loop`, `exit`.
- `enter`: 0.25s – 0.55s (impacto inicial)
- `loop`: oscilación suave (amplitud baja)
- `exit`: 0.2s – 0.35s (limpia transición)

## Perfil por intención
- `hook`: enter `pop` con easing `spring`, loop leve, exit `fade`
- `proof`: enter `slide` o `fade`, loop mínimo, exit `fade`
- `explanation`: enter `fade`, loop mínimo, exit `fade`
- `cta`: enter `pop/slide`, loop medio, exit `fade`

## Guardrails
- Máx 8 capas por escena.
- Evitar más de 2 capas con loop simultáneo fuerte.
- Mantener `amp <= 0.03` en loop para legibilidad.
