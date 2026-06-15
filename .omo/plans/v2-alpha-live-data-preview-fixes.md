# Vantare v2 - Alpha Live Data + Preview Fixes

## Objetivo

Corregir dos fallos base antes de ampliar personalizacion:

1. Los overlays runtime no deben quedarse con datos mock/test y deben reinicializar datos al detectar una nueva sesion/carrera/sala.
2. La Preview del Hub debe representar el overlay real de 1920x1080 escalado proporcionalmente, no cajas reducidas con widgets sin escala interna.

## Alcance

- Separar fuente de telemetria de `editMode`.
- Introducir `sessionEpoch/sessionKey/sessionState` en snapshots de telemetria.
- Resetear `telemetry-ref` al cambiar de sesion.
- Mantener el pipeline caliente sin React state a 60 Hz.
- Refactorizar Preview a una escena logica 1920x1080 con `transform: scale(...)`.
- Mantener guardado en coordenadas reales, no escaladas.

## Fuera de alcance

- Personalizacion avanzada completa.
- Calculo avanzado de delta por sectores.
- Nuevos adaptadores iRacing/Assetto Corsa.
- Cambios en `apps/desktop/`.

## Criterios de aceptacion

- Runtime y OBS usan fuente live explicita.
- Preview usa mock explicito, sin depender semanticamente de `editMode`.
- Al cambiar `sessionEpoch`, el frontend limpia vehiculos, delta y estado antiguo antes de aplicar el nuevo snapshot.
- Una desconexion/menu no deja standings/relative antiguos en pantalla.
- Preview renderiza los widgets reales dentro de una escena 1920x1080 escalada completa.
- Fuentes, bordes y espaciados se reducen proporcionalmente.
- Drag/teclado guardan coordenadas logicas reales.

## Verificacion

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

