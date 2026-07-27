<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-500/30 flex flex-col">
    <!-- Top bar -->
    <header class="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="bg-blue-600 p-1.5 rounded-lg text-white">
            <ImagesIcon :size="18" />
          </div>
          <div class="leading-tight min-w-0">
            <h1 class="text-base font-semibold tracking-tight">Resizr</h1>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 -mt-0.5 truncate">Batch resize and rename</p>
          </div>
        </div>

        <div v-if="config.inputDir" class="flex items-center gap-1.5 shrink-0">
          <span v-if="trackingInfo.pendingCount > 0" class="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-500/20">
            {{ trackingInfo.pendingCount }} pending
          </span>
          <span v-else-if="trackingInfo.totalValidImages > 0" class="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20">
            All done
          </span>
          <span v-if="trackingInfo.exists" class="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
            {{ trackingInfo.processedCount }} processed
          </span>
          <button
            v-if="trackingInfo.exists"
            @click="clearTracking"
            class="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors rounded-md p-1.5 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30"
            title="Clear processed history and re-process everything"
          >
            <Trash2Icon :size="14" />
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 w-full">
      <div class="max-w-5xl mx-auto px-5 py-5 pb-28 space-y-4">
        <!-- Folders -->
        <section class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div class="grid gap-px sm:grid-cols-2 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden">
            <div class="bg-white dark:bg-slate-900 p-4 space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <FolderInputIcon :size="14" /> Input folder
              </label>
              <div class="flex gap-2">
                <input
                  v-model="config.inputDir"
                  readonly
                  placeholder="Select source…"
                  class="w-full px-2.5 h-9 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-default truncate"
                  :title="config.inputDir"
                />
                <button
                  @click="selectDir('inputDir')"
                  class="px-3 h-9 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shrink-0"
                >
                  Browse
                </button>
              </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-4 space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <FolderOutputIcon :size="14" /> Output folder
              </label>
              <div class="flex gap-2">
                <input
                  v-model="config.outputDir"
                  readonly
                  placeholder="Select destination…"
                  class="w-full px-2.5 h-9 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-default truncate"
                  :title="config.outputDir"
                />
                <button
                  @click="selectDir('outputDir')"
                  class="px-3 h-9 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shrink-0"
                >
                  Browse
                </button>
              </div>
            </div>
          </div>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Resize -->
          <section class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <h2 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <MaximizeIcon :size="14" /> Resize
            </h2>

            <div class="space-y-2">
              <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Output widths (px)</label>
              <div class="flex flex-wrap gap-1.5">
                <div v-for="(size, index) in config.sizes" :key="index" class="inline-flex items-center gap-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20 pl-2 pr-1 h-8 rounded-lg">
                  <input
                    v-model.number="size.width"
                    type="number"
                    class="w-14 bg-transparent border-none focus:ring-0 text-sm font-medium p-0"
                  />
                  <button @click="removeSize(index)" class="hover:bg-blue-200 dark:hover:bg-blue-500/30 rounded-md p-1 transition-colors">
                    <XIcon :size="13" />
                  </button>
                </div>
                <button
                  @click="addSize"
                  class="inline-flex items-center gap-1 px-2.5 h-8 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <PlusIcon :size="14" /> Add
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Format</label>
                <select
                  v-model="config.outputFormat"
                  class="w-full px-2.5 h-9 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-400"
                >
                  <option value="original">Retain original</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Quality (1–100)</label>
                <input
                  v-model.number="config.quality"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full px-2.5 h-9 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              HEIC/HEIF inputs are supported. With "Retain original" they export as JPEG.
            </p>
          </section>

          <!-- Naming + concurrency -->
          <section class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <h2 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <TypeIcon :size="14" /> Naming
            </h2>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Filename template</label>
              <input
                v-model="config.imageNameTemplate"
                class="w-full px-2.5 h-9 text-sm font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:border-blue-400"
              />
              <div class="flex flex-wrap gap-1 pt-0.5">
                <button
                  v-for="tag in namingTags"
                  :key="tag"
                  @click="insertTag(tag)"
                  class="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >{{ tag }}</button>
              </div>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed pt-0.5">
                {base} original name · {n} number (1, 2, 3…) · {date} today (YYYY-MM-DD)
              </p>
            </div>

            <div class="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div class="flex justify-between items-center">
                <label class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <GaugeIcon :size="14" /> Concurrency
                </label>
                <span class="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20 rounded-md">{{ config.concurrency }} workers</span>
              </div>
              <input
                v-model.number="config.concurrency"
                type="range"
                min="1"
                max="10"
                class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </section>
        </div>
      </div>
    </main>

    <!-- Sticky action bar -->
    <div class="sticky bottom-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-t border-slate-200 dark:border-slate-800">
      <div class="max-w-5xl mx-auto px-5 py-3 space-y-2.5">
        <div v-if="processing || progress.completed > 0" class="space-y-1.5">
          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-1.5 min-w-0">
              <Loader2Icon v-if="processing" class="animate-spin text-blue-600 dark:text-blue-400 shrink-0" :size="14" />
              <CheckCircleIcon v-else class="text-emerald-500 shrink-0" :size="14" />
              <span class="truncate text-slate-500 dark:text-slate-400">{{ currentFile || (processing ? 'Initializing…' : 'Complete!') }}</span>
            </div>
            <span class="font-semibold text-slate-700 dark:text-slate-200 tabular-nums shrink-0">{{ progress.completed }}/{{ progress.total }} · {{ Math.round(progress.percent) }}%</span>
          </div>
          <div class="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-600 transition-all duration-300 ease-out"
              :style="{ width: progress.percent + '%' }"
            ></div>
          </div>
        </div>

        <button
          v-if="!processing"
          @click="runProcessor"
          class="w-full h-11 rounded-lg font-semibold text-white transition-all active:scale-[0.99] bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <PlayIcon :size="18" />
          Start processing
        </button>
        <button
          v-else
          @click="cancelProcessor"
          class="w-full h-11 rounded-lg font-semibold text-white transition-all active:scale-[0.99] bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <XOctagonIcon :size="18" />
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import {
  ImagesIcon,
  FolderInputIcon,
  FolderOutputIcon,
  MaximizeIcon,
  TypeIcon,
  GaugeIcon,
  PlusIcon,
  XIcon,
  PlayIcon,
  Loader2Icon,
  CheckCircleIcon,
  Trash2Icon,
  XOctagonIcon
} from 'lucide-vue-next'

const namingTags = ['{base}', '{n}', '{date}', '{width}', '{ext}']

const config = reactive({
  inputDir: '',
  outputDir: '',
  sizes: [{ width: 800 }, { width: 300 }],
  imageNameTemplate: '{base}-{width}.{ext}',
  outputFormat: 'original',
  quality: 70,
  concurrency: 3
})

// Watch config for changes and save to localStorage (omitting folders)
watch(config, (newConfig) => {
  const configToSave = { ...newConfig, inputDir: '', outputDir: '' }
  localStorage.setItem('resizr_config', JSON.stringify(configToSave))
}, { deep: true })

const processing = ref(false)
const currentFile = ref('')
const progress = reactive({
  percent: 0,
  completed: 0,
  total: 0
})

const trackingInfo = ref({ exists: false, processedCount: 0, totalValidImages: 0, pendingCount: 0 })

const checkTracking = async () => {
  if (!config.inputDir) {
    trackingInfo.value = { exists: false, processedCount: 0, totalValidImages: 0, pendingCount: 0 }
    return
  }
  trackingInfo.value = await (window as any).ipcRenderer.invoke('check-tracking-file', config.inputDir, config.outputDir)
}

const clearTracking = async () => {
  if (!config.inputDir) return
  if (confirm(`Clear the processed history for this folder? The next run will process all images again.`)) {
    await (window as any).ipcRenderer.invoke('delete-tracking-file', config.inputDir)
    await checkTracking()
  }
}

// Watch inputDir and outputDir specifically to update tracking info
watch([() => config.inputDir, () => config.outputDir], () => {
  checkTracking()
})

const selectDir = async (key: 'inputDir' | 'outputDir') => {
  const path = await (window as any).ipcRenderer.invoke('select-directory')
  if (path) {
    config[key] = path
  }
}

const insertTag = (tag: string) => {
  config.imageNameTemplate += tag
}

const addSize = () => {
  config.sizes.push({ width: 500 })
}

const removeSize = (index: number) => {
  config.sizes.splice(index, 1)
}

const cancelProcessor = async () => {
  if (!confirm('Stop processing?')) return
  currentFile.value = 'Canceling…'
  await (window as any).ipcRenderer.invoke('cancel-processor')
}

const runProcessor = async () => {
  if (!config.inputDir || !config.outputDir) {
    alert('Please set input and output folders')
    return
  }

  // Every source image needs a unique output name. Without {base} or {n}, all images map
  // to the same filename; they won't overwrite each other (later ones get -2, -3…), but
  // that's rarely intended — warn before running.
  const tpl = config.imageNameTemplate
  if (!tpl.includes('{base}') && !tpl.includes('{n}')) {
    const proceed = confirm(
      'Your filename template has no {base} or {n} tag, so every image gets the same ' +
      'name (duplicates are suffixed -2, -3, … to avoid overwriting).\n\n' +
      'Add {base} to keep the original filename, or {n} for a sequential number. Continue anyway?'
    )
    if (!proceed) return
  }

  processing.value = true
  progress.percent = 0
  progress.completed = 0
  progress.total = 0
  currentFile.value = 'Preparing…'

  try {
    // Deep clone the reactive config to strip all Vue Proxy wrappers so Electron can serialize it cleanly
    const plainConfig = JSON.parse(JSON.stringify(config))
    const result = await (window as any).ipcRenderer.invoke('run-processor', plainConfig)

    if (result && result.message) {
      currentFile.value = result.message
    } else {
      currentFile.value = 'Done!'
    }
  } catch (err: any) {
    alert('Error: ' + err.message)
    currentFile.value = 'Error'
  } finally {
    processing.value = false
    await checkTracking()
  }
}

onMounted(() => {
  // Restore config on load
  const savedConfig = localStorage.getItem('resizr_config')
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig)
      Object.keys(parsed).forEach(key => {
        if (key !== 'inputDir' && key !== 'outputDir') {
          (config as any)[key] = parsed[key]
        }
      })
    } catch (e) {
      console.error('Failed to parse saved config', e)
    }
  }

  (window as any).ipcRenderer.on('processor-progress', (_event: any, data: any) => {
    progress.percent = data.progress
    progress.completed = data.completed
    progress.total = data.total
    if (data.status === 'error') {
      currentFile.value = `Error on ${data.fileName}: ${data.error}`
    } else {
      currentFile.value = data.fileName
    }
  })
})
</script>

<style>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
