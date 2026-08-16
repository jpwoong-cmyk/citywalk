# Downtown Three.js City

This is a plain HTML/CSS/JavaScript Three.js demo made from your uploaded
Quaternius **Downtown City MegaKit [Standard]**.

No Node.js, npm, Blender, Adobe, Unity or Unreal is required to run this version.

## Folder structure

```text
downtown_threejs_city/
├─ index.html
├─ style.css
├─ city.js
├─ ASSET_LICENSE.txt
└─ assets/
   └─ city/
      ├─ Building_Large_2.gltf
      ├─ Building_Large_2.bin
      ├─ Building_Medium_2_001.gltf
      ├─ Building_Medium_2_001.bin
      ├─ Building_Small_1.gltf
      ├─ Building_Small_1.bin
      ├─ Street_2Lane.gltf
      ├─ Street_2Lane.bin
      ├─ Street_4WayIntersection.gltf
      ├─ Street_4WayIntersection.bin
      ├─ props...
      └─ texture PNGs required by those models
```

IMPORTANT: keep the `.gltf`, `.bin`, and PNG files together in `assets/city/`.
The `.gltf` files contain references to the `.bin` and texture files.

## Easiest way for you to run it

### GitHub + Vercel

1. Create a new GitHub repository, for example `threejs-city`.
2. Upload everything INSIDE this project folder to the repository root.
3. The repository root should contain `index.html`, not another nested folder.
4. Import that repository into Vercel.
5. Framework preset: **Other**.
6. No build command is needed.
7. No output directory is needed.
8. Deploy.

Three.js and GLTFLoader are loaded from jsDelivr in `index.html`.

## Why double-clicking index.html may fail

Browsers often block `.gltf` / `.bin` file loading when a page is opened through
`file://`.

So this may NOT work correctly:

```text
C:\my-city\index.html
```

opened by double-click.

Use Vercel, GitHub Pages, or a local web server instead.

## Controls

- Mouse drag: rotate camera
- Mouse wheel: zoom
- W/A/S/D: move camera and orbit target
- R: reset view

## What the demo uses from the MegaKit

The demo deliberately copies only the assets it needs instead of the entire ~89 MB
glTF export folder.

Used:
- Building_Large_2
- Building_Medium_2_001
- Building_Small_1
- Street_2Lane
- Street_4WayIntersection
- Prop_Planter_Single
- Prop_Bollard
- Prop_ManholeCover
- their referenced BIN and PNG texture files

The supplied pack license is included as `ASSET_LICENSE.txt`.
The uploaded pack states that the assets are CC0 1.0.

## Where to edit the city

Open `city.js`.

The main layout is in:

```js
function buildCity() {
   ...
}
```

Buildings use:

```js
addBuilding("large", x, z, rotation, lotWidth, lotDepth);
```

Roads use:

```js
addRoadSegment(x, z, rotation);
```

Props use:

```js
addAsset("bollard", x, z, rotation, scale);
```

You can therefore move the city around by changing numbers instead of editing
the 3D model files themselves.
