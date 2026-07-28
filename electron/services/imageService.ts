import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import convert from 'heic-convert';

export interface SizeConfig {
  width: number;
  suffix?: string;
}

export interface ResizeResult {
  width: number;
  fileName: string;
  fullPath: string;
}

export const resizeImage = async (
  inputPath: string,
  outputDir: string,
  sizes: SizeConfig[],
  fileNameTemplate: string,
  outputFormat: 'original' | 'jpeg' | 'png' | 'webp' = 'original',
  quality: number = 70,
  usedOutputPaths?: Set<string>,
  sequence?: number,
  dateStr?: string
): Promise<ResizeResult[]> => {
  const originalExt = path.extname(inputPath);
  const baseName = path.basename(inputPath, originalExt);
  const results: ResizeResult[] = [];

  await fs.mkdir(outputDir, { recursive: true });

  // sharp's prebuilt binaries can't decode HEVC-coded HEIC/HEIF, so decode those
  // inputs to a JPEG buffer first with heic-convert and hand that to sharp. Since
  // the source is now JPEG, "Retain Original" for these inputs falls back to JPEG.
  const isHeic = originalExt.toLowerCase() === '.heic' || originalExt.toLowerCase() === '.heif';
  let pipelineSource: string | Uint8Array = inputPath;
  if (isHeic) {
    const inputBuffer = await fs.readFile(inputPath);
    pipelineSource = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 1,
    });
  }

  // failOn: 'none' keeps benign decoder warnings (common with phone HEIC/JPEG,
  // e.g. truncated or non-standard EXIF) from aborting the whole file.
  // .rotate() with no angle auto-orients from the EXIF Orientation tag and bakes
  // it into the pixels, so photos shot vertically aren't output sideways when the
  // tag is dropped on re-encode.
  const pipeline = sharp(pipelineSource, { failOn: 'none' }).rotate();

  const effectiveFormat = outputFormat === 'original' && isHeic ? 'jpeg' : outputFormat;

  // Determine final extension based on the effective output format
  let finalExt = originalExt;
  if (effectiveFormat === 'jpeg') finalExt = '.jpg';
  if (effectiveFormat === 'png') finalExt = '.png';
  if (effectiveFormat === 'webp') finalExt = '.webp';

  for (const size of sizes) {
    const targetWidth = size.width;
    
    // {n} is a per-source sequential index (same for every size of one image),
    // useful when the original filenames are meaningless (e.g. camera UUIDs).
    let outputFileName = fileNameTemplate
      .split('{base}').join(baseName)
      .split('{date}').join(dateStr ?? '')
      .split('{width}').join(targetWidth.toString())
      .split('{ext}').join(finalExt.replace('.', ''))
      .split('{n}').join(sequence !== undefined ? sequence.toString() : '');

    if (!outputFileName) {
      outputFileName = `${baseName}-${targetWidth}${finalExt}`;
    }

    let outputPath = path.join(outputDir, outputFileName);

    // Prevent overwriting the exact same source file
    if (path.resolve(outputPath) === path.resolve(inputPath)) {
      const parsedPath = path.parse(outputPath);
      outputPath = path.join(parsedPath.dir, `${parsedPath.name}_resized${parsedPath.ext}`);
      outputFileName = path.basename(outputPath);
    }

    // Guarantee a unique destination across the whole batch. Without this, a naming
    // template lacking {base} (e.g. "fetzer-{width}.{ext}") maps every source image to
    // the same file — causing overwrites and, under concurrency, write races
    // ("Bad file descriptor") when multiple workers hit the same path at once.
    if (usedOutputPaths) {
      const key = (p: string) => path.resolve(p).toLowerCase();
      if (usedOutputPaths.has(key(outputPath))) {
        const parsed = path.parse(outputPath);
        let counter = 2;
        let candidate = outputPath;
        while (usedOutputPaths.has(key(candidate))) {
          candidate = path.join(parsed.dir, `${parsed.name}-${counter}${parsed.ext}`);
          counter++;
        }
        outputPath = candidate;
        outputFileName = path.basename(outputPath);
      }
      // Reserve synchronously (before any await) so concurrent workers never collide.
      usedOutputPaths.add(key(outputPath));
    }

    let op = pipeline.clone().resize({
      width: targetWidth,
      withoutEnlargement: true,
    });

    // Apply format and quality
    const formatToApply = effectiveFormat === 'original'
      ? originalExt.toLowerCase().replace('.', '')
      : effectiveFormat;

    if (formatToApply === 'jpeg' || formatToApply === 'jpg') {
      op = op.jpeg({ quality });
    } else if (formatToApply === 'png') {
      // For PNG, 'quality' only applies when palette=true. 
      // User might mean compressionLevel (0-9). If quality is low (e.g. 7), treat as compressionLevel.
      const compressionLevel = quality <= 9 ? quality : Math.floor((100 - quality) / 10);
      op = op.png({ quality: quality <= 100 ? quality : 100, compressionLevel });
    } else if (formatToApply === 'webp') {
      op = op.webp({ quality });
    } else if (formatToApply === 'tiff') {
      op = op.tiff({ quality });
    }

    await op.toFile(outputPath);

    results.push({
      width: targetWidth,
      fileName: outputFileName,
      fullPath: outputPath,
    });
  }

  return results;
};
