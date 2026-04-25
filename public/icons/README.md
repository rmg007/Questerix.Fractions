# PWA Icons

Place generated icon files here:

- `icon-192.png` — 192×192 px, PNG, used for Android home screen and PWA manifest
- `icon-512.png` — 512×512 px, PNG, used for splash screens and app stores

Generate from the master SVG asset (to be created by the design agent) using a tool such as:
- https://maskable.app/editor (for maskable icons)
- `sharp` CLI: `sharp -i icon-master.svg -o icon-192.png resize 192 192`

Both icons should use theme_color `#2F6FED` as the background with a white fraction graphic centered.
