# App Icons Directory

This directory should contain PNG icons in various sizes for the PWA.

## Required Icon Sizes

For optimal PWA support, you need:

### Standard Icons
- `icon-192.png` - 192x192px (minimum required)
- `icon-512.png` - 512x512px (recommended)

### Maskable Icons (Android Adaptive Icons)
- `icon-maskable-192.png` - 192x192px with safe zone
- `icon-maskable-512.png` - 512x512px with safe zone

## How to Generate Icons

### Option 1: Online Tools
1. Go to [https://www.pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator)
2. Upload `../icon.svg`
3. Download all generated icons
4. Place them in this directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then run:

# Convert SVG to PNG
convert ../icon.svg -resize 192x192 icon-192.png
convert ../icon.svg -resize 512x512 icon-512.png

# For maskable icons, add padding (safe zone)
convert ../icon.svg -resize 192x192 -gravity center -extent 192x192 -background "#0f172a" icon-maskable-192.png
convert ../icon.svg -resize 512x512 -gravity center -extent 512x512 -background "#0f172a" icon-maskable-512.png
```

### Option 3: Figma/Photoshop
1. Open `../icon.svg` in your design tool
2. Export as PNG at required sizes
3. For maskable icons, ensure the important content is within the "safe zone" (80% of canvas)

## Temporary Solution

Until proper PNG icons are generated, the PWA will use the SVG icon (`../icon.svg`) which works on most modern browsers. However, PNG icons provide better compatibility and faster loading.

## Testing Icons

After adding icons:
1. Run `npm run build`
2. Open DevTools → Application → Manifest
3. Check that all icons appear correctly
