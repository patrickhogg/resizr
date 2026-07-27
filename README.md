# Resizr

A fast, cross-platform desktop app for **batch resizing and renaming images**. Point it at a folder, define the sizes and naming pattern you want, and Resizr produces multiple resized copies of every image — recursively, in parallel, and with crash-safe resume. Built with Electron, Vue 3, Tailwind CSS, and `sharp`.

## Features

- **Mass Resizing (1:N):** Process an entire directory and output multiple resized versions (e.g. thumbnail, medium, large) for each source image. Each size is a max-width; aspect ratio is preserved and images are never enlarged.
- **Custom Naming Templates:** Control output filenames with simple tags:
  - `{base}` — the original filename (without extension)
  - `{n}` — a sequential number per source image (`1`, `2`, `3`…), consistent across that image's sizes
  - `{date}` — the processing date in `YYYY-MM-DD` format (e.g. `2026-07-27`)
  - `{width}` — the target width in pixels
  - `{ext}` — the output extension

  For example `{base}-{width}.{ext}` → `photo-800.jpg`, or `client-{n}-{width}.{ext}` → `client-1-800.jpg` (handy when the originals have meaningless names like camera UUIDs). If a template omits both `{base}` and `{n}`, images would share a name — Resizr keeps them unique by suffixing `-2`, `-3`, ….
- **HEIC / HEIF Input:** Read Apple `.heic`/`.heif` photos out of the box. Combined with any output format, this makes Resizr a convenient HEIC → JPEG/PNG/WebP converter.
- **Flexible Output Formats:** Retain the original format, or convert everything to JPEG, PNG, or WebP with an adjustable quality setting.
- **Recursive Directory Processing:** Automatically scans all nested subfolders in your Input Folder and mirrors the exact subfolder structure in your Output Folder, keeping batches organized.
- **Smart Incremental Processing & Crash Recovery:** Tracks processed files in a hidden, local `.resizr_processed.json` file in the root of your Input Folder.
  - **Resume Anytime:** If a batch is interrupted or cancelled, resume exactly where you left off.
  - **Crash-Proof File Locking:** Uses strict asynchronous queue locking when updating the tracking file, so progress is saved even if the app closes unexpectedly.
  - **Duplicate Prevention:** Skips files that were already processed so re-runs only handle new images.
- **Parallel Processing:** Tune a concurrency limit (1–10 workers) to match your machine.
- **Automatic Dark Mode:** The interface follows your operating system's light or dark appearance.
- **Cross-Platform:** Builds available for macOS — Apple Silicon (`arm64`) and Intel (`x64`), as `.dmg` and `.zip` — and Windows (`.exe` portable and NSIS installer).

## Supported Formats

- **Input:** JPG/JPEG, PNG, WebP, TIFF, HEIC, HEIF
- **Output:** Retain Original, JPEG, PNG, WebP

> **Note on HEIC:** HEIC/HEIF inputs are decoded with `heic-convert` (a self-contained WASM decoder) and then resized with `sharp`. There is no HEIC *output*: when the output format is set to **Retain Original**, HEIC/HEIF inputs are exported as **JPEG**. Choosing JPEG, PNG, or WebP explicitly works for HEIC sources as usual.

## Prerequisites

- Node.js (v18 or higher recommended)

## Installation & Setup

1. Open your terminal and navigate to the project directory:
   ```bash
   cd resizr
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the App in Development

Start the development server with hot-reload:
```bash
npm run dev
```

## Building for Production

Run these commands on the operating system you intend to build for (macOS builds on a Mac, Windows builds on Windows).

- **For macOS — builds both Apple Silicon (`arm64`) and Intel (`x64`) `.dmg` and `.zip`:**
  ```bash
  npm run build:mac
  ```

- **For Windows (`.exe`):**
  ```bash
  npm run build:win
  ```

- **For All Platforms:**
  ```bash
  npm run build:all
  ```

The compiled binaries are placed in the `release/` directory.

### Building for both Mac architectures (`sharp` binaries)

`sharp` ships prebuilt, architecture-specific binaries, and `npm install` only fetches the ones for the machine you're on. Building both Mac slices therefore needs the **other** architecture's binaries too. `npm run build:mac` handles this automatically — it first runs [`scripts/prepare-mac-binaries.sh`](scripts/prepare-mac-binaries.sh), which downloads any missing `@img/sharp-darwin-*` packages (the exact versions `sharp` expects) into `node_modules/@img` without disturbing your host install.

The script is idempotent (a no-op, and needs no network, once both arches are present) and re-adds the binaries after a later `npm install` prunes them. To run it on its own:

```bash
npm run prepare:mac
```

### Code signing

Builds are unsigned unless an Apple Developer ID is configured. macOS Gatekeeper will block an unsigned app on first launch — open it via **right-click → Open**, or clear the quarantine attribute:

```bash
xattr -cr /Applications/Resizr.app
```

## Usage Guide

1. Open the application.
2. Select your **Input Folder** containing the source images.
3. Select an **Output Folder** for the resized images.
4. Add one or more output sizes by defining a max-width in pixels.
5. Choose an **Output Format** and **Quality**, and adjust the **Image Naming** template if desired.
6. Set the **Concurrency Limit** to control how many images process in parallel.
7. Click **Start Image Processing**.
8. *Tip: You can cancel a batch at any time safely. Resizr uses file-locking to preserve the tracking history up to the last successfully processed image, so you can resume later.*

## Tech Stack

- **Framework:** Electron, Vue 3, Vite, Tailwind CSS 4
- **Image Processing:** Sharp (resizing/encoding), heic-convert (HEIC/HEIF decoding)
- **Concurrency:** p-limit
- **Icons:** Lucide-Vue-Next
