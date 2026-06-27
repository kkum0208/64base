/**
 * 64Base Studio - Application Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  const state = {
    // Single Encoder State
    currentFile: null,
    originalImage: null, // HTML Image element of source
    originalDataUrl: '', // Original uncompressed data URI
    currentFormat: 'original', // 'original' or specific mime type
    quality: 0.8,
    width: 0,
    height: 0,
    aspectRatio: 1,
    lockAspect: true,
    rotation: 0, // 0, 90, 180, 270
    flipH: false,
    flipV: false,
    generatedBase64: '',
    generatedMime: '',
    activeOutputTab: 'uri',
    
    // Decoder State
    decodedBase64: '',
    decodedMime: '',
    decodedImageSrc: '',
    
    // Batch State
    batchItems: [], // array of { id, file, originalSize, base64Size, base64, name, progress }
    
    // History
    history: []
  };

  // --- DOM SELECTORS ---
  const DOM = {
    // Tab switching
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Single Encoder
    encoderDropzone: document.getElementById('encoder-dropzone'),
    encoderFileInput: document.getElementById('encoder-file-input'),
    encoderWorkspace: document.getElementById('encoder-workspace'),
    encoderImagePreview: document.getElementById('encoder-image-preview'),
    imgDimBadge: document.getElementById('img-dim-badge'),
    
    // Transform Tools
    btnRotateLeft: document.getElementById('btn-rotate-left'),
    btnRotateRight: document.getElementById('btn-rotate-right'),
    btnFlipH: document.getElementById('btn-flip-h'),
    btnFlipV: document.getElementById('btn-flip-v'),
    btnResetTransform: document.getElementById('btn-reset-transform'),
    
    // Optimization Controls
    selectFormat: document.getElementById('select-format'),
    qualitySetting: document.getElementById('quality-setting'),
    qualityVal: document.getElementById('quality-val'),
    rangeQuality: document.getElementById('range-quality'),
    btnLockAspect: document.getElementById('btn-lock-aspect'),
    inputWidth: document.getElementById('input-width'),
    inputHeight: document.getElementById('input-height'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    paletteColors: document.getElementById('palette-colors'),
    
    // Outputs
    labelOrigSize: document.getElementById('label-orig-size'),
    labelBase64Size: document.getElementById('label-base64-size'),
    savingsBadge: document.getElementById('savings-badge'),
    outputTabs: document.querySelectorAll('.output-tab'),
    base64OutputTextarea: document.getElementById('base64-output-textarea'),
    btnCopyOutput: document.getElementById('btn-copy-output'),
    btnDownloadOutput: document.getElementById('btn-download-output'),
    
    // Metadata
    metaFilename: document.getElementById('meta-filename'),
    metaMime: document.getElementById('meta-mime'),
    metaDimensions: document.getElementById('meta-dimensions'),
    metaRatio: document.getElementById('meta-ratio'),
    
    // Batch
    batchDropzone: document.getElementById('batch-dropzone'),
    batchFileInput: document.getElementById('batch-file-input'),
    batchListWrapper: document.getElementById('batch-list-wrapper'),
    batchItemsQueue: document.getElementById('batch-items-queue'),
    batchGlobalActions: document.getElementById('batch-global-actions'),
    btnBatchClear: document.getElementById('btn-batch-clear'),
    btnBatchCopyJson: document.getElementById('btn-batch-copy-json'),
    btnBatchDownloadZip: document.getElementById('btn-batch-download-zip'),
    
    // Decoder
    decoderInputTextarea: document.getElementById('decoder-input-textarea'),
    btnClearDecoder: document.getElementById('btn-clear-decoder'),
    btnDecodeRun: document.getElementById('btn-decode-run'),
    decoderResultEmpty: document.getElementById('decoder-result-empty'),
    decoderResultWorkspace: document.getElementById('decoder-result-workspace'),
    decoderImagePreview: document.getElementById('decoder-image-preview'),
    decMetaMime: document.getElementById('dec-meta-mime'),
    decMetaDimensions: document.getElementById('dec-meta-dimensions'),
    decMetaSize: document.getElementById('dec-meta-size'),
    btnDownloadDecoded: document.getElementById('btn-download-decoded'),
    
    // History Drawer
    toggleHistoryBtn: document.getElementById('toggle-history-btn'),
    historyBadge: document.getElementById('history-badge'),
    historyDrawer: document.getElementById('history-drawer'),
    historyDrawerOverlay: document.getElementById('history-drawer-overlay'),
    closeHistoryBtn: document.getElementById('close-history-btn'),
    historyItemsList: document.getElementById('history-items-list'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    
    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // --- INITIALIZATION ---
  function init() {
    lucide.createIcons();
    loadHistoryFromStorage();
    setupEventListeners();
  }

  // --- TABS & NAVIGATION ---
  function setupEventListeners() {
    // Tab switching
    DOM.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        DOM.tabButtons.forEach(b => b.classList.remove('active'));
        DOM.tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${targetTab}-view`).classList.add('active');
      });
    });

    // History Toggle
    DOM.toggleHistoryBtn.addEventListener('click', toggleHistoryDrawer);
    DOM.closeHistoryBtn.addEventListener('click', toggleHistoryDrawer);
    DOM.historyDrawerOverlay.addEventListener('click', toggleHistoryDrawer);
    DOM.btnClearHistory.addEventListener('click', clearHistory);

    // --- SINGLE ENCODER LISTENERS ---
    // Drag & Drop
    setupDropzone(DOM.encoderDropzone, DOM.encoderFileInput, handleSingleFile);
    
    // Paste clipboard event
    window.addEventListener('paste', handleClipboardPaste);

    // Image modifications
    DOM.selectFormat.addEventListener('change', (e) => {
      state.currentFormat = e.target.value;
      if (state.currentFormat === 'image/jpeg' || state.currentFormat === 'image/webp') {
        DOM.qualitySetting.classList.remove('hidden');
      } else {
        DOM.qualitySetting.classList.add('hidden');
      }
      processImage();
    });

    DOM.rangeQuality.addEventListener('input', (e) => {
      state.quality = parseInt(e.target.value) / 100;
      DOM.qualityVal.textContent = `${e.target.value}%`;
    });
    
    DOM.rangeQuality.addEventListener('change', () => {
      processImage();
    });

    // Resize controls
    DOM.inputWidth.addEventListener('input', (e) => {
      if (!state.originalImage) return;
      let val = parseInt(e.target.value) || 0;
      if (val < 1) val = 1;
      state.width = val;
      if (state.lockAspect) {
        state.height = Math.round(val / state.aspectRatio);
        DOM.inputHeight.value = state.height;
      }
      debouncedProcessImage();
    });

    DOM.inputHeight.addEventListener('input', (e) => {
      if (!state.originalImage) return;
      let val = parseInt(e.target.value) || 0;
      if (val < 1) val = 1;
      state.height = val;
      if (state.lockAspect) {
        state.width = Math.round(val * state.aspectRatio);
        DOM.inputWidth.value = state.width;
      }
      debouncedProcessImage();
    });

    DOM.btnLockAspect.addEventListener('click', () => {
      state.lockAspect = !state.lockAspect;
      DOM.btnLockAspect.classList.toggle('active', state.lockAspect);
      showToast(state.lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked');
    });

    DOM.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.originalImage) return;
        const scale = parseFloat(btn.getAttribute('data-scale'));
        
        let targetW, targetH;
        // Adjust width/height based on current rotation (if rotated 90/270, dimensions are flipped)
        const isFlipped = state.rotation === 90 || state.rotation === 270;
        const origW = isFlipped ? state.originalImage.naturalHeight : state.originalImage.naturalWidth;
        const origH = isFlipped ? state.originalImage.naturalWidth : state.originalImage.naturalHeight;

        targetW = Math.round(origW * scale);
        targetH = Math.round(origH * scale);

        state.width = targetW;
        state.height = targetH;
        DOM.inputWidth.value = targetW;
        DOM.inputHeight.value = targetH;
        processImage();
      });
    });

    // Transformations
    DOM.btnRotateLeft.addEventListener('click', () => {
      state.rotation = (state.rotation - 90 + 360) % 360;
      swapDimensionsIfRotated(90);
      processImage();
    });

    DOM.btnRotateRight.addEventListener('click', () => {
      state.rotation = (state.rotation + 90) % 360;
      swapDimensionsIfRotated(90);
      processImage();
    });

    DOM.btnFlipH.addEventListener('click', () => {
      state.flipH = !state.flipH;
      processImage();
    });

    DOM.btnFlipV.addEventListener('click', () => {
      state.flipV = !state.flipV;
      processImage();
    });

    DOM.btnResetTransform.addEventListener('click', () => {
      state.rotation = 0;
      state.flipH = false;
      state.flipV = false;
      if (state.originalImage) {
        state.width = state.originalImage.naturalWidth;
        state.height = state.originalImage.naturalHeight;
        DOM.inputWidth.value = state.width;
        DOM.inputHeight.value = state.height;
      }
      processImage();
      showToast('Transformations reset');
    });

    // Copy and Download
    DOM.btnCopyOutput.addEventListener('click', copyCodeToClipboard);
    DOM.btnDownloadOutput.addEventListener('click', downloadOutputAsFile);

    // Output tab selection
    DOM.outputTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.outputTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeOutputTab = tab.getAttribute('data-format');
        renderCodeOutput();
      });
    });

    // --- BATCH LISTENERS ---
    setupDropzone(DOM.batchDropzone, DOM.batchFileInput, handleBatchFiles);
    DOM.btnBatchClear.addEventListener('click', clearBatchQueue);
    DOM.btnBatchCopyJson.addEventListener('click', copyBatchAsJson);
    DOM.btnBatchDownloadZip.addEventListener('click', downloadBatchAsZip);

    // --- DECODER LISTENERS ---
    DOM.btnDecodeRun.addEventListener('click', runDecoder);
    DOM.btnClearDecoder.addEventListener('click', () => {
      DOM.decoderInputTextarea.value = '';
      DOM.decoderResultWorkspace.classList.add('hidden');
      DOM.decoderResultEmpty.classList.remove('hidden');
    });
    DOM.btnDownloadDecoded.addEventListener('click', downloadDecodedImage);
  }

  // Helper to swap width and height input values when rotated 90 deg
  function swapDimensionsIfRotated(deg) {
    const tempW = state.width;
    state.width = state.height;
    state.height = tempW;
    state.aspectRatio = state.width / state.height;
    
    DOM.inputWidth.value = state.width;
    DOM.inputHeight.value = state.height;
  }

  // --- DROPZONE SETUP HELPER ---
  function setupDropzone(dropzoneEl, inputEl, callback) {
    // Click triggers file selector
    dropzoneEl.addEventListener('click', () => inputEl.click());
    
    inputEl.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        callback(e.target.files);
      }
    });

    // Drag events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove('dragover');
      }, false);
    });

    dropzoneEl.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        callback(files);
      }
    }, false);
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    lucide.createIcons();

    // Trigger cleanup after CSS animations complete
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // --- SINGLE FILE HANDLERS ---
  function handleSingleFile(files) {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Selected file is not an image!', 'error');
      return;
    }

    state.currentFile = file;
    state.currentFormat = 'original';
    DOM.selectFormat.value = 'original';
    DOM.qualitySetting.classList.add('hidden');
    DOM.rangeQuality.value = 80;
    state.quality = 0.8;
    DOM.qualityVal.textContent = '80%';

    // Read details
    DOM.metaFilename.textContent = file.name;
    DOM.metaMime.textContent = file.type;
    DOM.labelOrigSize.textContent = formatBytes(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      state.originalDataUrl = e.target.result;
      
      // Load into img element for processing
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;
        state.width = img.naturalWidth;
        state.height = img.naturalHeight;
        state.aspectRatio = img.naturalWidth / img.naturalHeight;
        state.rotation = 0;
        state.flipH = false;
        state.flipV = false;

        DOM.inputWidth.value = state.width;
        DOM.inputHeight.value = state.height;
        DOM.imgDimBadge.textContent = `${state.width} × ${state.height}`;
        
        DOM.metaDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
        DOM.metaRatio.textContent = calculateAspectRatioString(img.naturalWidth, img.naturalHeight);

        // UI toggles
        DOM.encoderDropzone.classList.add('hidden');
        DOM.encoderWorkspace.classList.remove('hidden');

        processImage();
        showToast('Image uploaded successfully', 'success');
      };
      img.onerror = () => {
        showToast('Error loading image object', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Clipboard paste handler
  function handleClipboardPaste(e) {
    // Only paste inside the Encoder dropzone or if the encoder is open
    const isEncoderActive = document.querySelector('[data-tab="single-encoder"]').classList.contains('active');
    if (!isEncoderActive) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        // Give it a placeholder name
        const customFile = new File([file], `pasted-image-${Date.now()}.png`, { type: file.type });
        handleSingleFile([customFile]);
        break;
      }
    }
  }

  // --- IMAGE PROCESSING (ENCODE) ---
  let debounceTimeout = null;
  function debouncedProcessImage() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(processImage, 250);
  }

  function processImage() {
    if (!state.originalImage) return;

    // SVG / Vector image handling (direct Base64 read if format is 'original' and format is SVG)
    const isSvg = state.currentFile.type === 'image/svg+xml';
    const isGif = state.currentFile.type === 'image/gif';
    
    if (state.currentFormat === 'original' && (isSvg || isGif)) {
      // Direct raw read to keep animation/vector integrity
      state.generatedBase64 = state.originalDataUrl;
      state.generatedMime = state.currentFile.type;
      
      DOM.encoderImagePreview.src = state.originalDataUrl;
      DOM.encoderImagePreview.style.transform = `rotate(${state.rotation}deg) scale(${state.flipH ? -1 : 1}, ${state.flipV ? -1 : 1})`;
      
      // Setup metadata sizes
      const base64Len = state.originalDataUrl.length;
      DOM.labelBase64Size.textContent = formatBytes(base64Len);
      DOM.savingsBadge.classList.add('hidden');
      
      renderCodeOutput();
      extractColorsFromUrl(state.originalDataUrl);
      addToHistory(state.currentFile.name, state.originalDataUrl, state.currentFile.type);
      return;
    }

    // Standard raster formats: draw on Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate dimensions based on rotation
    const isRotated90 = state.rotation === 90 || state.rotation === 270;
    
    // Canvas dimensions are matching the current resized settings
    canvas.width = state.width;
    canvas.height = state.height;

    // Save context state
    ctx.save();
    
    // Move origin to canvas center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Apply rotation
    ctx.rotate((state.rotation * Math.PI) / 180);
    
    // Apply flip
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    
    // Draw the image centered
    // If rotated 90 or 270, we swap drawing dimensions
    const drawW = isRotated90 ? canvas.height : canvas.width;
    const drawH = isRotated90 ? canvas.width : canvas.height;
    
    ctx.drawImage(state.originalImage, -drawW / 2, -drawH / 2, drawW, drawH);
    
    ctx.restore();

    // Determine target format
    let targetMime = state.currentFile.type;
    if (state.currentFormat !== 'original') {
      targetMime = state.currentFormat;
    }

    // Get Base64 URL
    let dataUrl;
    if (targetMime === 'image/jpeg' || targetMime === 'image/webp') {
      dataUrl = canvas.toDataURL(targetMime, state.quality);
    } else {
      // PNG (lossless)
      dataUrl = canvas.toDataURL('image/png');
      targetMime = 'image/png';
    }

    state.generatedBase64 = dataUrl;
    state.generatedMime = targetMime;

    // Show preview (we use the transformed canvas url so they see exact dimensions and crop)
    DOM.encoderImagePreview.src = dataUrl;
    DOM.encoderImagePreview.style.transform = 'none'; // reset preview transform since canvas already baked it in!
    DOM.imgDimBadge.textContent = `${canvas.width} × ${canvas.height}`;

    // Size tracking
    const base64Len = dataUrl.length;
    DOM.labelBase64Size.textContent = formatBytes(base64Len);

    // Calculate compression efficiency
    const savings = 1 - (base64Len / state.currentFile.size);
    if (savings > 0 && state.currentFormat !== 'original') {
      DOM.savingsBadge.textContent = `-${Math.round(savings * 100)}% Size`;
      DOM.savingsBadge.className = 'badge badge-success';
      DOM.savingsBadge.classList.remove('hidden');
    } else if (savings < 0) {
      DOM.savingsBadge.textContent = `+${Math.round(Math.abs(savings) * 100)}% overhead`;
      DOM.savingsBadge.className = 'badge btn-danger';
      DOM.savingsBadge.classList.remove('hidden');
    } else {
      DOM.savingsBadge.classList.add('hidden');
    }

    renderCodeOutput();
    extractColorsFromCanvas(canvas);
    addToHistory(state.currentFile.name, dataUrl, targetMime);
  }

  // --- OUTPUT RENDERER ---
  function renderCodeOutput() {
    if (!state.generatedBase64) return;

    let output = '';
    const cleanBase64 = state.generatedBase64.substring(state.generatedBase64.indexOf(',') + 1);
    
    switch (state.activeOutputTab) {
      case 'uri':
        output = state.generatedBase64;
        break;
      case 'raw':
        output = cleanBase64;
        break;
      case 'html':
        output = `<img src="${state.generatedBase64}" alt="${state.currentFile ? state.currentFile.name : 'image'}" />`;
        break;
      case 'css':
        output = `.image-class {\n  background-image: url("${state.generatedBase64}");\n}`;
        break;
      case 'markdown':
        output = `![${state.currentFile ? state.currentFile.name : 'Base64 Image'}](${state.generatedBase64})`;
        break;
      case 'json':
        output = JSON.stringify({
          name: state.currentFile ? state.currentFile.name : 'unnamed',
          type: state.generatedMime,
          size_bytes: Math.round(state.generatedBase64.length * 0.75),
          base64: state.generatedBase64
        }, null, 2);
        break;
    }

    DOM.base64OutputTextarea.value = output;

    // Enable buttons
    DOM.btnCopyOutput.disabled = false;
    DOM.btnDownloadOutput.disabled = false;
  }

  // --- FILE ACTIONS (COPY & DOWNLOAD) ---
  function copyCodeToClipboard() {
    const text = DOM.base64OutputTextarea.value;
    if (!text) return;

    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Code copied to clipboard!', 'success');
      })
      .catch(() => {
        // Fallback for older browsers
        DOM.base64OutputTextarea.select();
        document.execCommand('copy');
        showToast('Code copied to clipboard!', 'success');
      });
  }

  function downloadOutputAsFile() {
    if (!state.generatedBase64) return;

    let text = DOM.base64OutputTextarea.value;
    let filename = 'output.txt';
    let mimeType = 'text/plain';

    if (state.activeOutputTab === 'json') {
      filename = 'image_base64.json';
      mimeType = 'application/json';
    } else if (state.activeOutputTab === 'html') {
      filename = 'image_embed.html';
      mimeType = 'text/html';
    } else if (state.activeOutputTab === 'css') {
      filename = 'image_style.css';
      mimeType = 'text/css';
    } else if (state.activeOutputTab === 'markdown') {
      filename = 'image.md';
      mimeType = 'text/markdown';
    }

    const blob = new Blob([text], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`File ${filename} downloaded`, 'success');
  }

  // --- COLOR PALETTE EXTRACTOR ---
  function extractColorsFromCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    
    // For large images, sample smaller size to speed up color extraction
    const sampleWidth = Math.min(canvas.width, 100);
    const sampleHeight = Math.min(canvas.height, 100);
    
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleCtx = sampleCanvas.getContext('2d');
    sampleCtx.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);

    try {
      const imgData = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = imgData.data;
      const colorCounts = {};

      // Analyze pixels with step to gather popularity
      for (let i = 0; i < data.length; i += 16) { // step by 4 pixels (16 items in array: r,g,b,a * 4)
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];

        if (a < 100) continue; // ignore highly transparent pixels

        // Round RGB values to reduce palette details and cluster similar colors
        const roundR = Math.round(r / 16) * 16;
        const roundG = Math.round(g / 16) * 16;
        const roundB = Math.round(b / 16) * 16;
        const rgbKey = `${roundR},${roundG},${roundB}`;

        colorCounts[rgbKey] = (colorCounts[rgbKey] || 0) + 1;
      }

      // Sort by frequency
      const sortedColors = Object.keys(colorCounts)
        .sort((a, b) => colorCounts[b] - colorCounts[a])
        .slice(0, 5); // top 5 colors

      renderPalette(sortedColors);
    } catch (e) {
      DOM.paletteColors.innerHTML = '<p class="palette-placeholder">Unable to extract colors due to cross-origin restriction.</p>';
    }
  }

  // Fallback color extraction for raw SVG
  function extractColorsFromUrl(url) {
    // Simply draw raw image URL onto temp canvas to extract
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 100;
      canvas.height = img.naturalHeight || 100;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      extractColorsFromCanvas(canvas);
    };
    img.src = url;
  }

  function renderPalette(rgbArray) {
    DOM.paletteColors.innerHTML = '';
    
    if (rgbArray.length === 0) {
      DOM.paletteColors.innerHTML = '<p class="palette-placeholder">No colors found.</p>';
      return;
    }

    rgbArray.forEach(rgbStr => {
      const [r, g, b] = rgbStr.split(',').map(Number);
      const hex = rgbToHex(r, g, b);
      
      const item = document.createElement('div');
      item.className = 'palette-color-item';
      item.title = 'Click to copy HEX';
      
      item.innerHTML = `
        <div class="palette-color-block" style="background-color: ${hex};"></div>
        <span class="palette-color-hex">${hex}</span>
      `;

      item.addEventListener('click', () => {
        navigator.clipboard.writeText(hex)
          .then(() => showToast(`Copied color: ${hex}`, 'success'))
          .catch(() => showToast(`Color: ${hex}`, 'info'));
      });

      DOM.paletteColors.appendChild(item);
    });
  }

  // --- HISTORY DRAWER SYSTEM ---
  function toggleHistoryDrawer() {
    DOM.historyDrawer.classList.toggle('active');
  }

  function loadHistoryFromStorage() {
    try {
      const saved = localStorage.getItem('64base_history');
      if (saved) {
        state.history = JSON.parse(saved);
        updateHistoryBadge();
        renderHistoryList();
      }
    } catch (e) {
      console.error('Failed to read history from localStorage', e);
    }
  }

  function saveHistoryToStorage() {
    try {
      localStorage.setItem('64base_history', JSON.stringify(state.history));
      updateHistoryBadge();
      renderHistoryList();
    } catch (e) {
      console.warn('Storage limit reached, removing oldest history item');
      // If full, trim history size
      if (state.history.length > 5) {
        state.history = state.history.slice(0, 5);
        saveHistoryToStorage();
      }
    }
  }

  function updateHistoryBadge() {
    DOM.historyBadge.textContent = state.history.length;
  }

  function addToHistory(name, dataUrl, mimeType) {
    // Check if duplicate of recent item (first in history list)
    if (state.history.length > 0 && state.history[0].dataUrl === dataUrl) {
      return; // avoid redundant saving
    }

    // Limit base64 length stored to avoid easily exceeding localStorage 5MB limit
    // We create a smaller thumbnail to represent in history, and only store full string if it's less than 1MB
    const size = dataUrl.length;
    let base64ToStore = dataUrl;
    let isTruncated = false;

    if (size > 1.5 * 1024 * 1024) { // over 1.5 MB in characters
      // To prevent localStorage crashes, we save a truncated URL indicator
      // The user can't download full base64 from history but can see the thumbnail
      isTruncated = true;
      base64ToStore = 'TRUNCATED_MAX_LIMIT';
    }

    const historyItem = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: name,
      thumbnail: createThumbnailDataUrl(dataUrl), // extract smaller preview
      dataUrl: base64ToStore,
      isTruncated: isTruncated,
      mimeType: mimeType,
      size: size,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Unshift to front
    state.history.unshift(historyItem);

    // Max 10 items in history
    if (state.history.length > 10) {
      state.history.pop();
    }

    saveHistoryToStorage();
  }

  function renderHistoryList() {
    DOM.historyItemsList.innerHTML = '';
    
    if (state.history.length === 0) {
      DOM.historyItemsList.innerHTML = `
        <div class="history-empty">
          <i data-lucide="clock"></i>
          <p>No conversion history yet.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    state.history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item-card';
      
      const truncLabel = item.isTruncated ? ' <span style="color:var(--color-danger);font-size:0.7rem;">(Large)</span>' : '';
      
      card.innerHTML = `
        <div class="history-item-thumb">
          <img src="${item.thumbnail}" alt="thumb">
        </div>
        <div class="history-item-info">
          <span class="history-item-name">${item.name}${truncLabel}</span>
          <span class="history-item-size">${formatBytes(item.size)} • ${item.mimeType.split('/')[1].toUpperCase()}</span>
          <span class="history-item-time">${item.timestamp}</span>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-icon btn-secondary btn-sm btn-hist-copy" title="Copy Base64" ${item.isTruncated ? 'disabled' : ''}>
            <i data-lucide="copy" style="width:14px;height:14px;"></i>
          </button>
          <button class="btn btn-icon btn-danger btn-sm btn-hist-delete" title="Delete">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </div>
      `;

      // Copy click handler
      card.querySelector('.btn-hist-copy').addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.isTruncated) {
          showToast('File payload too large to fetch from history cache', 'error');
          return;
        }
        navigator.clipboard.writeText(item.dataUrl)
          .then(() => showToast('Copied Base64 from history!', 'success'))
          .catch(() => showToast('Copy failed', 'error'));
      });

      // Delete handler
      card.querySelector('.btn-hist-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      });

      // Click card itself to reload into Encoder (if not truncated)
      card.addEventListener('click', () => {
        if (item.isTruncated) {
          showToast('This cached image size is too large to load back directly.', 'error');
          return;
        }
        
        // Reconstruct File and load
        fetch(item.dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], item.name, { type: item.mimeType });
            handleSingleFile([file]);
            toggleHistoryDrawer();
          })
          .catch(() => showToast('Failed to reconstruct image from history cache', 'error'));
      });

      DOM.historyItemsList.appendChild(card);
    });
    lucide.createIcons();
  }

  function deleteHistoryItem(id) {
    state.history = state.history.filter(item => item.id !== id);
    saveHistoryToStorage();
    showToast('Item deleted from history');
  }

  function clearHistory() {
    if (confirm('Clear all conversion history?')) {
      state.history = [];
      saveHistoryToStorage();
      showToast('History cleared');
    }
  }

  // Create quick low-res base64 thumbnail for history view
  function createThumbnailDataUrl(originalUrl) {
    // If it's already an SVG, just return URL since it has no canvas width/height properties easily accessible
    if (originalUrl.includes('image/svg+xml')) return originalUrl;

    const img = new Image();
    img.src = originalUrl;
    
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    // Draw scaled representation
    ctx.drawImage(img, 0, 0, 50, 50);
    return canvas.toDataURL('image/jpeg', 0.5);
  }

  // --- BATCH CONVERTER SYSTEM ---
  function handleBatchFiles(files) {
    const filesArray = Array.from(files);
    
    if (filesArray.length === 0) return;
    
    const imageFiles = filesArray.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showToast('No valid images dropped!', 'error');
      return;
    }

    DOM.batchDropzone.classList.add('hidden');
    DOM.batchListWrapper.classList.remove('hidden');
    DOM.batchGlobalActions.classList.remove('hidden');

    imageFiles.forEach(file => {
      // Create batch object
      const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const batchItem = {
        id: batchId,
        file: file,
        name: file.name,
        originalSize: file.size,
        base64Size: 0,
        base64: '',
        dimensions: 'Loading...',
        progress: 0
      };

      state.batchItems.push(batchItem);
      renderBatchItemRow(batchItem);
      processBatchItem(batchItem);
    });
  }

  function renderBatchItemRow(item) {
    const row = document.createElement('div');
    row.className = 'batch-item-row';
    row.id = item.id;
    
    row.innerHTML = `
      <div class="batch-item-preview">
        <i data-lucide="loader-2" class="animate-spin text-dark"></i>
      </div>
      <div class="batch-item-details">
        <span class="batch-item-name" title="${item.name}">${item.name}</span>
        <span class="batch-item-dims">${item.dimensions}</span>
      </div>
      <div class="batch-item-sizes">
        <span class="batch-item-orig-size">Orig: ${formatBytes(item.originalSize)}</span>
        <span class="batch-item-b64-size">Base64: Calculating...</span>
      </div>
      <div class="batch-item-actions">
        <button class="btn btn-icon btn-secondary btn-sm btn-batch-copy" disabled title="Copy Base64">
          <i data-lucide="copy" style="width:14px;height:14px;"></i>
        </button>
        <button class="btn btn-icon btn-danger btn-sm btn-batch-delete" title="Delete">
          <i data-lucide="x" style="width:14px;height:14px;"></i>
        </button>
      </div>
    `;

    // Delete item click
    row.querySelector('.btn-batch-delete').addEventListener('click', () => {
      removeBatchItem(item.id);
    });

    DOM.batchItemsQueue.appendChild(row);
    lucide.createIcons();
  }

  function processBatchItem(item) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      item.base64 = dataUrl;
      item.base64Size = dataUrl.length;

      // Extract dimensions
      const img = new Image();
      img.onload = () => {
        item.dimensions = `${img.naturalWidth} × ${img.naturalHeight} px`;
        
        // Update UI
        const rowEl = document.getElementById(item.id);
        if (rowEl) {
          rowEl.querySelector('.batch-item-preview').innerHTML = `<img src="${dataUrl}" alt="thumb">`;
          rowEl.querySelector('.batch-item-dims').textContent = item.dimensions;
          rowEl.querySelector('.batch-item-b64-size').textContent = `Base64: ${formatBytes(item.base64Size)}`;
          
          const copyBtn = rowEl.querySelector('.btn-batch-copy');
          copyBtn.disabled = false;
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(dataUrl)
              .then(() => showToast(`Copied Base64 for ${item.name}`, 'success'))
              .catch(() => showToast('Copy failed', 'error'));
          });
        }
      };
      img.src = dataUrl;
    };
    
    reader.readAsDataURL(item.file);
  }

  function removeBatchItem(id) {
    state.batchItems = state.batchItems.filter(item => item.id !== id);
    const rowEl = document.getElementById(id);
    if (rowEl) rowEl.remove();

    if (state.batchItems.length === 0) {
      clearBatchQueue();
    }
  }

  function clearBatchQueue() {
    state.batchItems = [];
    DOM.batchItemsQueue.innerHTML = '';
    DOM.batchListWrapper.classList.add('hidden');
    DOM.batchGlobalActions.classList.add('hidden');
    DOM.batchDropzone.classList.remove('hidden');
    DOM.batchFileInput.value = '';
    showToast('Batch queue cleared');
  }

  function copyBatchAsJson() {
    if (state.batchItems.length === 0) return;

    const dataObj = state.batchItems.map(item => ({
      filename: item.name,
      mimeType: item.file.type,
      size_bytes: item.originalSize,
      base64: item.base64
    }));

    navigator.clipboard.writeText(JSON.stringify(dataObj, null, 2))
      .then(() => showToast('Batch JSON copied to clipboard!', 'success'))
      .catch(() => showToast('Copy failed', 'error'));
  }

  function downloadBatchAsZip() {
    if (state.batchItems.length === 0) return;
    
    showToast('Generating ZIP file...', 'info');
    const zip = new JSZip();

    state.batchItems.forEach(item => {
      // Base64 has prefix header (data:image/png;base64,). We strip it to add correctly as data type
      const base64Data = item.base64.substring(item.base64.indexOf(',') + 1);
      zip.file(item.name, base64Data, { base64: true });
    });

    zip.generateAsync({ type: 'blob' })
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `64base_batch_images_${Date.now()}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('ZIP downloaded successfully!', 'success');
      })
      .catch(err => {
        showToast('Failed to create ZIP archive', 'error');
        console.error(err);
      });
  }

  // --- BASE64 DECODER SYSTEM ---
  function runDecoder() {
    let input = DOM.decoderInputTextarea.value.trim();
    if (!input) {
      showToast('Please paste Base64 code first!', 'error');
      return;
    }

    let mime = '';
    let base64Data = '';

    // Handle inputs wrapped in HTML image elements or CSS url parameters
    // Check for `<img src="...">` tag
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const cssRegex = /url\(["']?([^"'\)]+)["']?\)/i;

    let matchedSrc = input.match(imgRegex);
    if (matchedSrc && matchedSrc[1]) {
      input = matchedSrc[1];
    } else {
      matchedSrc = input.match(cssRegex);
      if (matchedSrc && matchedSrc[1]) {
        input = matchedSrc[1];
      }
    }

    if (input.startsWith('data:')) {
      // Format is Data URI
      const colonIndex = input.indexOf(':');
      const semicolonIndex = input.indexOf(';');
      const commaIndex = input.indexOf(',');

      if (semicolonIndex !== -1 && commaIndex !== -1) {
        mime = input.substring(colonIndex + 1, semicolonIndex);
        base64Data = input;
      }
    } else {
      // Raw Base64 string - try to infer mime-type
      base64Data = input;
      const signature = input.substring(0, 10);
      
      if (signature.startsWith('iVBORw')) {
        mime = 'image/png';
      } else if (signature.startsWith('/9j/')) {
        mime = 'image/jpeg';
      } else if (signature.startsWith('R0lG')) {
        mime = 'image/gif';
      } else if (signature.startsWith('UklG')) {
        mime = 'image/webp';
      } else if (signature.startsWith('PHN2') || signature.startsWith('PD94')) {
        mime = 'image/svg+xml';
      } else {
        mime = 'image/png'; // default fallback
      }

      // Prepend data uri header
      base64Data = `data:${mime};base64,${input}`;
    }

    // Set preview source and verify it loads correctly
    const img = new Image();
    img.onload = () => {
      state.decodedBase64 = base64Data;
      state.decodedMime = mime;
      state.decodedImageSrc = base64Data;

      // Render workspace
      DOM.decoderImagePreview.src = base64Data;
      DOM.decMetaMime.textContent = mime;
      DOM.decMetaDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      
      // Approximate bytes from Base64 length (approx 0.75 ratio)
      const cleanLen = base64Data.substring(base64Data.indexOf(',') + 1).length;
      DOM.decMetaSize.textContent = formatBytes(Math.round(cleanLen * 0.75));

      DOM.decoderResultEmpty.classList.add('hidden');
      DOM.decoderResultWorkspace.classList.remove('hidden');
      showToast('Decoded Base64 successfully!', 'success');
    };

    img.onerror = () => {
      showToast('Invalid Base64 string or unsupported image encoding!', 'error');
    };

    img.src = base64Data;
  }

  function downloadDecodedImage() {
    if (!state.decodedBase64) return;

    const mimeParts = state.decodedMime.split('/');
    const ext = mimeParts[1] ? mimeParts[1].replace('+xml', '') : 'png';
    const filename = `decoded_image_${Date.now()}.${ext}`;

    const link = document.createElement('a');
    link.href = state.decodedBase64;
    link.download = filename;
    link.click();
    showToast(`Saved image as ${filename}`, 'success');
  }

  // --- HELPERS ---
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function calculateAspectRatioString(width, height) {
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }

  function gcd(a, b) {
    return (b === 0) ? a : gcd(b, a % b);
  }

  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  init();
});
