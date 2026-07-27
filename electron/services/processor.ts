import fs from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';
import { resizeImage, SizeConfig } from './imageService';
import { BrowserWindow } from 'electron';

// Supported input image extensions (HEIC/HEIF are decode-only).
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.heic', '.heif'];

// Name of the hidden tracking file written to the root of the input folder.
export const TRACKING_FILE = '.resizr_processed.json';

export async function getFiles(dir: string, excludeDir?: string): Promise<string[]> {
  const resolvedExclude = excludeDir ? path.resolve(excludeDir) : undefined;
  if (resolvedExclude && path.resolve(dir) === resolvedExclude) return [];

  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    if (resolvedExclude && res === resolvedExclude) return [];
    return dirent.isDirectory() ? getFiles(res, excludeDir) : res;
  }));
  return Array.prototype.concat(...files);
}

let isCancelled = false;

export const cancelBatchProcessor = () => {
  isCancelled = true;
};

export const getDirectoryStats = async (inputDir: string, outputDir?: string) => {
  try {
    const allFiles = await getFiles(inputDir, outputDir);

    const processedRecordPath = path.join(inputDir, TRACKING_FILE);
    let processedFiles: string[] = [];
    try {
      const data = await fs.readFile(processedRecordPath, 'utf-8');
      processedFiles = JSON.parse(data);
    } catch (e) {
      // File does not exist or is invalid
    }
    const processedSet = new Set(processedFiles);

    let totalValidImages = 0;
    let pendingCount = 0;

    allFiles.forEach((f) => {
      if (IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())) {
        totalValidImages++;
        const relPath = path.relative(inputDir, f);

        if (!processedSet.has(relPath)) {
          pendingCount++;
        }
      }
    });

    return {
      exists: processedFiles.length > 0,
      processedCount: processedSet.size,
      totalValidImages,
      pendingCount
    };
  } catch (e) {
    return { exists: false, processedCount: 0, totalValidImages: 0, pendingCount: 0 };
  }
};

export interface ProcessorOptions {
  inputDir: string;
  outputDir: string;
  sizes: SizeConfig[];
  imageNameTemplate: string;
  outputFormat: 'original' | 'jpeg' | 'png' | 'webp';
  quality: number;
  concurrency: number;
}

export const runBatchProcessor = async (
  options: ProcessorOptions,
  win: BrowserWindow | null
) => {
  isCancelled = false;

  const {
    inputDir,
    outputDir,
    sizes,
    imageNameTemplate,
    outputFormat,
    quality,
    concurrency,
  } = options;

  const limit = pLimit(concurrency);
  const writeLimit = pLimit(1); // Lock for incremental tracking file writes
  const usedOutputPaths = new Set<string>(); // Batch-wide guard against colliding output filenames

  // Current date as YYYY-MM-DD (zero-padded), computed once so the whole batch shares it.
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const allFiles = await getFiles(inputDir, outputDir);

  // Load tracking metadata for previously processed files
  const processedRecordPath = path.join(inputDir, TRACKING_FILE);
  let processedFiles: string[] = [];
  try {
    const data = await fs.readFile(processedRecordPath, 'utf-8');
    processedFiles = JSON.parse(data);
  } catch (e) {
    // File does not exist or is not valid JSON yet
  }
  const processedSet = new Set(processedFiles);

  // Number every image in the batch up front, sorted, so {n} is stable and
  // sequential regardless of processing order or resume state.
  const allImageRel = allFiles
    .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map((f) => path.relative(inputDir, f))
    .sort((a, b) => a.localeCompare(b));

  const sequenceMap = new Map<string, number>();
  allImageRel.forEach((rel, i) => sequenceMap.set(rel, i + 1));

  const imageFiles = allImageRel.filter((relPath) => !processedSet.has(relPath));

  const total = imageFiles.length;
  if (total === 0) {
    return { success: true, count: 0, message: 'No new images to process.' };
  }

  let completedCount = 0;

  const updateProgress = (fileName: string, status: string, error?: string) => {
    completedCount++;
    win?.webContents.send('processor-progress', {
      fileName,
      status,
      progress: Math.round((completedCount / total) * 100),
      completed: completedCount,
      total,
      error,
    });
  };

  const tasks = imageFiles.map((file) =>
    limit(async () => {
      if (isCancelled) return;
      try {
        const inputPath = path.join(inputDir, file);
        const relativeDir = path.dirname(file);
        const currentOutputDir = path.join(outputDir, relativeDir);

        await fs.mkdir(currentOutputDir, { recursive: true });

        // Resize Images (1:N)
        await resizeImage(
          inputPath,
          currentOutputDir,
          sizes,
          imageNameTemplate,
          outputFormat,
          quality,
          usedOutputPaths,
          sequenceMap.get(file),
          dateStr
        );

        if (isCancelled) return;

        processedSet.add(file);

        // Write tracking file incrementally using a lock (pLimit(1)) to prevent write conflicts
        await writeLimit(async () => {
          try {
            await fs.writeFile(processedRecordPath, JSON.stringify(Array.from(processedSet), null, 2));
          } catch (writeErr) {
            console.error('Failed to incrementally update tracking file:', writeErr);
          }
        });

        updateProgress(file, 'success');
      } catch (err: any) {
        console.error(`Error processing ${file}:`, err);
        updateProgress(file, 'error', err.message);
      }
    })
  );

  await Promise.all(tasks);

  // Wait for any pending incremental writes to finish, then do one final save
  await writeLimit(async () => {
    try {
      await fs.writeFile(processedRecordPath, JSON.stringify(Array.from(processedSet), null, 2));
    } catch (err) {
      console.error('Failed to write final processed metadata file:', err);
    }
  });

  return { success: true, count: completedCount };
};
