# 08 — Perfiles, layout y CRUD hub

---

## Schema de perfil (`pkg/config`)

Archivos JSON en `vantare-v2/configs/*.json`.

```json
{
  "id": "default-racing",
  "name": "Default Racing",
  "displayMode": "racing",
  "monitorIndex": 0,
  "widgets": [
    {
      "id": "delta",
      "type": "delta",
      "enabled": true,
      "updateHz": 30,
      "position": { "x": 760, "y": 40, "w": 400, "h": 48 },
      "props": {}
    }
  ]
}
```

### Campos importantes

| Campo | Valores | Efecto |
|-------|---------|--------|
| `displayMode` | `racing`, `edit`, `streaming` | Comportamiento ventana / OBS |
| `monitorIndex` | 0, 1, … | Monitor para origin layout |
| `widgets[].position` | x, y, w, h | Pixeles lógicos en edit; bbox en racing |
| `widgets[].updateHz` | número | Objetivo refresh widget (F7 refina) |
| `widgets[].props.appearance` | accentColor, backgroundColor, textColor, opacity | Apariencia básica editable en Preview |

---

## Archivos de ejemplo

| Archivo | id JSON | Uso |
|---------|---------|-----|
| `example-racing.json` | `default-racing` | Carrera, shrink-wrap |
| `example-edit.json` | (ver archivo) | Modo edición |

**Importante:** El **nombre de archivo** puede diferir del **`id`** interno. El hub y `HubService` resuelven ambos vía `findProfilePath()`.

---

## Modos de ventana

### Racing

- `OverlayController` crea la ventana desktop overlay a pantalla completa bajo demanda.
- Ventana frameless, transparente, always-on-top.
- `SetIgnoreMouseEvents` — click-through al sim.
- `CompositeApp` renderiza widgets y escucha telemetría; **no edita**.

### Edit

- **Deprecado en la ventana overlay desktop.** La edición de layouts ocurre ahora en la pestaña **Preview** del Hub.
- El campo `displayMode: "edit"` todavía existe en el JSON para compatibilidad, pero el runtime desktop fuerza `racing`.

### Flag `-edit`

Está deprecado. Aparece un warning en los logs indicando que se use Preview en el Hub:

```powershell
go run ./cmd/vantare -profile configs/example-racing.json -edit
```

---

## ProfileService (Go)

| Método | Descripción |
|--------|-------------|
| `Load()` | Carga path inicial del flag `-profile` |
| `LoadActiveProfile(path)` | Carga y **cambia** path de guardado |
| `SaveLayout(widgets)` | Guarda JSON + refresh bounds + `profile:loaded` |
| `SetDisplayMode(mode)` | Cambia modo + aplica ventana |
| `ApplyToWindow(skipRefresh)` | Aplica perfil al window manager |
| `EmitLoaded()` | Emite evento al frontend overlay |

---

## HubService (Go)

| Método | Descripción |
|--------|-------------|
| `ListProfiles()` | Escanea `configs/*.json` → `ProfileEntry{id, file, name, ...}` |
| `CreateProfile(name)` | Crea `custom-{slug}.json` con 3 widgets default |
| `DeleteProfile(idOrFile)` | Borra archivo (validación path) |
| `ActivateProfile(idOrFile)` | LoadActiveProfile (selection only, no window mutation) |
| `StartOverlay(idOrFile)` | LoadActiveProfile + create fresh desktop overlay window |
| `StopOverlay()` | Close desktop overlay window |

`configsDir()` en `main.go` busca `configs/` relativo al cwd o al ejecutable.

---

## UI hub — ProfilesPage

Ruta: sección **Overlays** en `HubApp`.

- Lista perfiles vía evento `hub:list` → respuesta `hub:profiles`.
- Crear: `hub:create` `{ name }`.
- Activar: `hub:activate` `{ id, file }` — preferir **file** cuando id ≠ filename.
- Eliminar: `hub:delete` `{ id, file }` + confirmación UI.
- Errores: `hub:error` `{ message }`.

---

## Flujo activar perfil

```
Usuario click "Seleccionar" en hub
  → JS Emit hub:activate { id, file }
  → Go HubService.ActivateProfile(file)
  → ProfileService.LoadActiveProfile(absolutePath)
  → EmitLoaded
  → Preview / Overlay recibe profile:loaded
```

## Flujo iniciar overlay

```
Usuario click "Iniciar" en hub
  → JS Emit overlay:start { id, file }
  → Go HubService.StartOverlay(file)
  → ProfileService.LoadActiveProfile(absolutePath)
  → OverlayController.Start(profile)
  → Se crea ventana overlay limpia, transparente, click-through
  → Overlay recibe profile:loaded tras emitir profile:request
```

## Flujo detener overlay

```
Usuario click "Detener" en hub
  → JS Emit overlay:stop
  → Go HubService.StopOverlay()
  → OverlayController.Stop()
  → Se cierra ventana overlay; Hub sigue abierto
```

---

## Modelo Hub Preview

En v2, un "overlay" visible en el Hub es un perfil/layout guardado en `configs/*.json`.

- `widgets[]` contiene todos los widgets del perfil.
- `enabled: true` significa que el widget se renderiza en runtime.
- `enabled: false` significa que el widget queda oculto en runtime, pero sigue apareciendo en Preview para poder reactivarlo.
- Preview es el editor principal: seleccionar perfil, ajustar widgets, guardar e iniciar.
- La ventana desktop overlay no se usa para editar.

## Preview editor (Hub)

La pestaña **Preview** del Hub es el workbench principal para controlar y editar perfiles sin abrir el overlay desktop:

- Selector de perfiles en la parte superior.
- Canvas 16:9 escalado (ancho adaptable, coordenadas lógicas 1920×1080).
- Lista de widgets con estado Visible/Oculto.
- Selección de widget con clic o flechas del teclado.
- Inspector con edición numérica de `x`, `y`, `w`, `h`.
- Colores básicos: `accentColor`, `textColor`, opacidad.
- Toggle `enabled` (visibilidad).
- Botones `Guardar`, `Iniciar` y `Detener`.
- Guardado vía `layout:save` → `ProfileService.SaveLayout`.
- `Iniciar` queda bloqueado mientras haya cambios sin guardar.
- La edición se bloquea mientras el overlay runtime esté iniciado.

Los cambios se guardan en `widgets[].props.appearance` y `widgets[].position` del JSON activo.

## Crear perfil nuevo

Default widgets en posiciones preset (delta top-center, relative bottom-left, standings top-right). Modo `edit` por defecto en create — usuario puede activar y pasar a racing desde hub o editando JSON.

---

## Pitfalls (lecciones code review)

1. No asumir `{id}.json` — usar `file` del listado.
2. Tras activate, SaveLayout debe escribir al perfil activo (`LoadActiveProfile`).
3. Sanitizar IDs — rechazar `..` y paths absolutos.
4. No sobrescribir silenciosamente en Create — comprobar existencia.
