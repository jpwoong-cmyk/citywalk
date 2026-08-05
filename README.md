# Cần Thơ Realistic Street Walk

A first-person Three.js reconstruction centred on **10.044179, 105.7856213** in Cần Thơ, Vietnam.

## What changed from the prototype

- Replaced the broad toy-like layout with live OpenStreetMap road and building geometry when available.
- Rebuilt buildings from extruded footprints with weathered materials, recessed windows, shopfronts, balconies, awnings and air-conditioning units.
- Added a restrained physically based lighting setup, environmental reflections, soft shadows, fog and desktop SSAO.
- Replaced the original capsule crowd with animated glTF pedestrians streamed from the official Three.js examples. A local articulated fallback is included if those assets cannot load.
- Rebuilt parked scooters, utility poles, hanging cables, pavements, drains, trees and planters with more detailed geometry.
- Reduced the crowd count so the people feel less like a marching clone army and perform better in a browser.

## Run locally

The project uses JavaScript modules, so serve the folder through a local web server.

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## Controls

- `WASD` or arrow keys: move
- Mouse: look around after clicking the scene
- `Shift`: jog
- `Esc`: release pointer lock
- Mobile: directional pad and drag-to-look zone

## Data and external assets

- Rendering: Three.js r185
- Map geometry: OpenStreetMap through the public Overpass API, with a bundled fallback layout
- Animated people: `Xbot.glb`, `Michelle.glb` and `readyplayer.me.glb` from the official Three.js examples

The scene does not download, copy or package Google Maps imagery. It uses the supplied coordinates as the centre point and reconstructs the area from open geometry plus original procedural detail.

## Deployment

This is a static site and can be deployed directly to Vercel, GitHub Pages or another static host. Keep the folder structure unchanged.

## Performance

Desktop devices with at least 4 GB reported device memory receive SSAO. Mobile and lower-memory devices render without the extra post-processing pass. Pixel ratio is capped to avoid unnecessary GPU load.
