# 64Base Studio

An advanced, premium-designed, client-side web application for image-to-Base64 encoding, decoding, compression, optimization, and analysis. Built completely with Vanilla HTML/CSS/JS for high performance, ease of use, and maximum security (all operations happen purely in your browser).

## Key Features

1. **Flexible Image Encoder**:
   - Convert images to Base64 strings, CSS background urls, HTML img tags, Markdown image syntax, or a JSON payload.
   - Real-time display of original file size vs. encoded size, including sizing differentials.
   - Live drag-and-drop workspace, file selector, or copy-paste (Ctrl+V) from the clipboard.

2. **On-the-fly Image Optimization**:
   - **Quality Slider**: Real-time compression adjustment for JPEG and WebP images.
   - **Dimension Resizer**: Change dimensions with width/height lock or preset scaling options (25%, 50%, 75%).
   - **Visual Transformations**: Rotate image in 90-degree steps or flip horizontally/vertically.

3. **Batch Converter**:
   - Upload and process up to 20 images concurrently.
   - View details, compressed sizing metrics, and copy specific base64 outputs.
   - Export all processed items as a single JSON file or download them collectively inside a `.ZIP` file.

4. **Base64 to Image Decoder**:
   - Paste raw Base64 strings or full Data URIs.
   - Automated mime-type inference (PNG, JPEG, WebP, GIF, SVG) from the character signature if format header is omitted.
   - Render preview, display image properties (mime-type, dimensions, estimated size), and download the decoded file.

5. **Color Palette Extractor**:
   - Client-side color analyzer detects 5 dominant colors.
   - Displays values in hex; copy hex values immediately to your clipboard with a single click.

6. **History Sidebar**:
   - Keep track of your last 10 conversions locally using `localStorage`.
   - Reload items back to the workspace or copy their Base64 directly without re-uploading.

## Tech Stack & Libraries
- **HTML5 / CSS3 / Vanilla JavaScript (ES6)**
- **Design styling**: Futuristic Dark Glassmorphism
- **Fonts**: Outfit (Google Fonts) & JetBrains Mono (Code areas)
- [Lucide Icons](https://lucide.dev/) (CDN) for icons.
- [JSZip](https://stuk.github.io/jszip/) (CDN) to bundle batch conversions into zip archives.

## How to Run Locally

Since this tool is built completely client-side, you don't need a build system or server to run it. 

### Method 1: Double-click (Direct Open)
Simply open the `index.html` file in any modern web browser.

### Method 2: Development Server (Recommended)
To run with a local server (resolves potential CORS issues if testing with advanced external features):

```bash
# If you have python installed
python -m http.server 8000

# Or using Node.js static server
npx serve .
```
Then open `http://localhost:8000` (or the address provided by `serve`) in your browser.
