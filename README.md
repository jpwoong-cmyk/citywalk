# Cần Thơ Street Walk

A lightweight, browser-based first-person city prototype built with Three.js and inspired by the area around **10.044179, 105.7856213** in Cần Thơ, Vietnam.

## What is included

- First-person desktop controls using WASD, arrow keys and mouse look
- Touch-friendly Up / Down / Left / Right directional pad
- Drag-to-look control for mobile
- Building and world-boundary collision
- Dense mixed-use Vietnamese-style buildings
- Procedural shopfronts, signs, balconies, awnings, air-conditioners and rooftop tanks
- Roads, sidewalks, crossings, drains, streetlights, utility poles and overhead wires
- Procedural articulated pedestrians with varied clothing, body proportions and walking cycles
- Moving and parked scooters
- Tropical trees, planters, market stalls, haze, shadows and physically based lighting
- Responsive UI and reduced-motion support

## Run locally

Because the project uses JavaScript modules, run it through a local web server instead of double-clicking `index.html`.

### Python

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

### VS Code

Use the Live Server extension and open `index.html`.

## Deploy to Vercel

1. Upload the project to a GitHub repository.
2. Import that repository into Vercel.
3. Framework preset: **Other**.
4. Build command: leave empty.
5. Output directory: leave empty or use `.`.

## Project structure

```text
index.html
css/style.css
js/main.js
js/city-builder.js
js/crowd-system.js
js/traffic-system.js
js/player-controller.js
js/materials.js
```

## Important fidelity note

This first release is a coordinate-anchored, locally inspired reconstruction. It recreates the architectural language, street density and atmosphere of Cần Thơ, but it does not claim exact building-by-building photogrammetry. Exact storefronts and footprints would require licensed source photography, an authoritative footprint dataset, or user-provided reference images.

## Technical notes

- Three.js is pinned to `0.185.0` through jsDelivr.
- All city geometry, people, signage and textures are generated procedurally at runtime.
- No third-party character or texture assets are bundled.
- Reduce `new CrowdSystem(scene, 30)` in `js/main.js` to improve performance on older phones.
- Reduce the renderer pixel-ratio cap in `js/main.js` from `1.8` to `1.25` for lower-end devices.

## Controls

| Platform | Action | Control |
|---|---|---|
| Desktop | Move | WASD or arrow keys |
| Desktop | Look | Mouse after clicking the scene |
| Desktop | Jog | Hold Shift |
| Desktop | Release cursor | Escape |
| Mobile | Move | Directional buttons |
| Mobile | Look | Drag the right-side look area |

## Licence

Project code is provided for your own project use. Three.js is distributed under the MIT licence.
