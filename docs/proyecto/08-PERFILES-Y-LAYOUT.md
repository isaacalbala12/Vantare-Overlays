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
| `displayMode` | `racing`, `edit`, (futuro `streaming`) | Comportamiento ventana |
| `monitorIndex` | 0, 1, … | Monitor para origin layout |
| `widgets[].position` | x, y, w, h | Pixeles lógicos en edit; bbox en racing |
| `widgets[].updateHz` | número | Objetivo refresh widget (F7 refina) |

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

- `window.Manager` calcula bbox de widgets + padding.
- Ventana frameless, transparente, always-on-top.
- `SetIgnoreMouseEvents` — click-through al sim.

### Edit

- Ventana fullscreen en monitor del perfil.
- Widgets arrastrables en `CompositeApp`.
- `SaveLayout` persiste posiciones al JSON activo.

### Flag `-edit`

Fuerza edit mode aunque el JSON diga `racing`:

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
| `ActivateProfile(idOrFile)` | LoadActiveProfile + ApplyToWindow + EmitLoaded |

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
Usuario click "Activar" en hub
  → JS Emit hub:activate { id, file }
  → Go HubService.ActivateProfile(file)
  → ProfileService.LoadActiveProfile(absolutePath)
  → ApplyToWindow + EmitLoaded
  → Overlay recibe profile:loaded
  → Widgets re-posicionan según nuevo JSON
```

---

## Crear perfil nuevo

Default widgets en posiciones preset (delta top-center, relative bottom-left, standings top-right). Modo `edit` por defecto en create — usuario puede activar y pasar a racing desde hub o editando JSON.

---

## Pitfalls (lecciones code review)

1. No asumir `{id}.json` — usar `file` del listado.
2. Tras activate, SaveLayout debe escribir al perfil activo (`LoadActiveProfile`).
3. Sanitizar IDs — rechazar `..` y paths absolutos.
4. No sobrescribir silenciosamente en Create — comprobar existencia.
