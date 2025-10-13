import { PALETTES, PALETTE_PRESETS, PALETTE_GROUPS } from './config.js';

export class UIManager {
    constructor() {
        this.dom = {}; // DOM要素をキャッシュするオブジェクト
        this.isMobileLayout = false;
        this.originalImageAreaParent = null;
        this.mediaMatcher = null;
        this.callbacks = {}; // イベントハンドラを外部から注入
    }

    init(callbacks) {
        this.callbacks = callbacks;
        this.initDOM();
        this.addEventListeners();
        this.clearValidationMessages();
        this.applyFixedPreviewSize();
        this.updateScalePresetUI(this.dom.sliders.scale.value);
        this.updateOutputResolution(0, 0, 0);
        this.toggleDitherStrengthUI();
        this.populatePaletteSelection(callbacks.onPaletteChange);
        this.updateLayout();
    }

    initDOM() {
        this.dom.controls = document.getElementById('controls');
        this.dom.srcImg = document.getElementById('src');
        this.dom.srcPlaceholder = document.getElementById('src-placeholder');
        this.dom.outCanvas = document.getElementById('out');
        this.dom.fileInput = document.getElementById('file');
        this.dom.downloadBtn = document.getElementById('download');
        this.dom.progressBar = document.getElementById('progress-bar');
        this.dom.loadingOverlay = document.getElementById('loading-overlay');
        this.dom.loadingOverlayText = this.dom.loadingOverlay.querySelector('span');
        this.dom.imageArea = document.getElementById('image-area');
        this.dom.paletteSelectionArea = document.getElementById('paletteSelectionArea');
        this.dom.autoCorrectionInfo = document.getElementById('auto-correction-info');
        this.dom.srcLabel = document.getElementById('src-label');
        this.dom.outLabel = document.getElementById('out-label');
        this.dom.mobileImagePlaceholder = document.getElementById('mobile-image-placeholder');
        this.originalImageAreaParent = this.dom.imageArea.parentNode;
        this.dom.srcContainer = document.getElementById('src-container');
        this.dom.outContainer = document.getElementById('out-container');
        this.dom.extractPaletteBtn = document.getElementById('extractPaletteBtn');
        this.dom.extractColorCount = document.getElementById('extractColorCount');
        this.dom.extractMethod = document.getElementById('extractMethod');
        this.dom.importPaletteBtn = document.getElementById('importPaletteBtn');
        this.dom.paletteImporter = document.getElementById('paletteImporter');
        this.dom.customPaletteGroup = document.getElementById('customPaletteGroup');
        this.dom.customPaletteContainer = document.getElementById('customPaletteContainer');
        this.dom.exportPaletteBtn = document.getElementById('exportPaletteBtn');

        this.dom.sliders = {
            dotSlider: document.getElementById('dotSlider'), dotInput: document.getElementById('dotInput'),
            exposure: document.getElementById('exposure'), contrast: document.getElementById('contrast'),
            sharpen: document.getElementById('sharpen'), ditherStrength: document.getElementById('ditherStrength'),
            paletteRatio: document.getElementById('paletteRatio'), scale: document.getElementById('scale'),
        };
        this.dom.values = {
            dot: document.getElementById('dotVal'), exposure: document.getElementById('exposureVal'),
            contrast: document.getElementById('contrastVal'), sharpen: document.getElementById('sharpenVal'),
            dither: document.getElementById('ditherVal'), paletteRatio: document.getElementById('paletteRatioVal'),
            scale: document.getElementById('scaleVal'),
        };
        this.dom.errors = {
            dot: document.getElementById('dotError'), exposure: document.getElementById('exposureError'),
            contrast: document.getElementById('contrastError'), sharpen: document.getElementById('sharpenError'),
            ditherStrength: document.getElementById('ditherStrengthError'), paletteRatio: document.getElementById('paletteRatioError'),
            scale: document.getElementById('scaleError'),
        };
        
        this.dom.outputResolution = document.getElementById('output-resolution');
        this.dom.presetButtons = document.querySelectorAll('#scale-presets button');
        this.dom.ditherCheckbox = document.getElementById('dither');
        this.dom.ditherStrengthGroup = document.getElementById('dither-strength-group');
        this.dom.autoPresetCheckbox = document.getElementById('autoPreset');
        this.dom.fixedPreviewCheckbox = document.getElementById('fixedPreview');
        this.dom.correctAspectCheckbox = document.getElementById('correctAspect');
    }

    addEventListeners() {
        this.dom.fileInput.addEventListener('change', e => this.callbacks.onFileChange(e));
        
        const update = () => this.callbacks.onParamsChange();
        Object.entries(this.dom.sliders).forEach(([key, el]) => {
            el.addEventListener('input', () => {
                this.syncValues(el); this.validateInput(el);
                if (['exposure', 'contrast', 'sharpen'].includes(key)) { this.dom.autoCorrectionInfo.textContent = ''; }
                if (key === 'scale') {
                    this.updateScalePresetUI(el.value);
                    this.callbacks.onScaleChange();
                }
                update();
            });
            if (el.type === 'number') { el.addEventListener('change', () => { this.syncValues(el); this.validateInput(el); update(); }); }
        });

        this.dom.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const scale = btn.dataset.scale; this.dom.sliders.scale.value = scale;
                this.syncValues(this.dom.sliders.scale); this.updateScalePresetUI(scale);
                this.callbacks.onScaleChange();
                update();
            });
        });

        this.dom.fixedPreviewCheckbox.addEventListener('change', this.applyFixedPreviewSize.bind(this));
        this.dom.ditherCheckbox.addEventListener('change', () => { this.toggleDitherStrengthUI(); update(); });
        this.dom.correctAspectCheckbox.addEventListener('change', update);
        this.dom.downloadBtn.addEventListener('click', () => this.callbacks.onDownload());
        document.querySelectorAll('#brightness-controls button').forEach(btn => { btn.addEventListener('click', (e) => this.handleBrightnessAdjust(e.currentTarget)); });
        
        this.dom.imageArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); this.dom.imageArea.style.background = '#e9e9e9'; });
        this.dom.imageArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); this.dom.imageArea.style.background = ''; });
        this.dom.imageArea.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation(); this.dom.imageArea.style.background = '';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.dom.fileInput.files = e.dataTransfer.files;
                this.callbacks.onFileChange({ target: this.dom.fileInput });
            }
        });

        window.addEventListener('resize', this.updateRelativeImageSizes.bind(this));
        this.dom.extractPaletteBtn.addEventListener('click', () => this.callbacks.onExtractPalette());
        this.dom.importPaletteBtn.addEventListener('click', () => this.dom.paletteImporter.click());
        this.dom.paletteImporter.addEventListener('change', e => this.callbacks.onImportPalette(e));
        this.dom.exportPaletteBtn.addEventListener('click', () => this.callbacks.onExportPalette());
        this.mediaMatcher = window.matchMedia("(max-width: 768px)");
        this.mediaMatcher.addEventListener('change', this.updateLayout.bind(this));
        this.dom.imageArea.addEventListener('click', this.toggleImageView.bind(this));
    }

    setLoading(isLoading, text = "変換処理中...") {
        this.dom.controls.classList.toggle('loading', isLoading);
        this.dom.loadingOverlayText.textContent = text;
        if (isLoading) this.updateProgressBar(0);
    }

    updateProgressBar(percentage) {
        this.dom.progressBar.style.width = `${percentage}%`;
        this.dom.progressBar.textContent = `${percentage}%`;
    }

    populatePaletteSelection(onPaletteChange) {
        PALETTE_GROUPS.forEach(group => {
            const groupDiv = document.createElement('div'); groupDiv.className = 'palette-group';
            const title = document.createElement('h4'); title.textContent = group.name; groupDiv.appendChild(title);
            const container = document.createElement('div'); container.className = 'palette-container'; groupDiv.appendChild(container);
            group.palettes.forEach(p => {
                const item = document.createElement('div'); item.className = 'palette-item'; item.dataset.paletteId = p.id;
                const canvas = document.createElement('canvas'); canvas.className = 'palette-canvas'; this.drawPaletteIcon(canvas, PALETTES[p.id]);
                const textDiv = document.createElement('div'); textDiv.className = 'palette-item-text';
                const name = document.createElement('p'); name.className = 'palette-name'; name.textContent = p.name; textDiv.appendChild(name);
                const info = document.createElement('span'); info.className = 'palette-info';
                const presetDot = PALETTE_PRESETS[p.id]?.dot || 'N/A'; info.textContent = `${presetDot}px`; textDiv.appendChild(info);
                item.appendChild(canvas); item.appendChild(textDiv);
                container.appendChild(item);
                item.addEventListener('click', () => onPaletteChange(p.id));
            });
            this.dom.paletteSelectionArea.appendChild(groupDiv);
        });
    }

    addCustomPaletteUI(id, name, colors, onPaletteChange, onPaletteDelete) {
        this.dom.customPaletteGroup.style.display = 'block';
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.dataset.paletteId = id;
        const canvas = document.createElement('canvas');
        canvas.className = 'palette-canvas';
        this.drawPaletteIcon(canvas, colors);
        const textDiv = document.createElement('div'); textDiv.className = 'palette-item-text';
        const nameEl = document.createElement('p'); nameEl.className = 'palette-name'; nameEl.textContent = name; textDiv.appendChild(nameEl);
        const info = document.createElement('span'); info.className = 'palette-info'; info.textContent = `${colors.length}色`; textDiv.appendChild(info);
        item.appendChild(canvas); 
        item.appendChild(textDiv);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-palette-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'このパレットを削除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`「${name}」パレットを削除しますか？`)) {
                onPaletteDelete(id);
                item.remove();
                if (this.dom.customPaletteContainer.children.length === 0) {
                    this.dom.customPaletteGroup.style.display = 'none';
                }
            }
        });
        item.appendChild(deleteBtn);

        this.dom.customPaletteContainer.appendChild(item);
        item.addEventListener('click', () => onPaletteChange(id));
    }

    drawPaletteIcon(canvas, colors) {
        if (!colors || colors.length === 0) return;
        const ctx = canvas.getContext('2d'); canvas.width = 100; canvas.height = 40;
        const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
        const getLuminance = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        const sortedColors = [...colors].sort((hexA, hexB) => { const lumA = getLuminance(hexToRgb(hexA)); const lumB = getLuminance(hexToRgb(hexB)); return lumA - lumB; });
        const stripeWidth = canvas.width / sortedColors.length;
        sortedColors.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(i * stripeWidth, 0, Math.ceil(stripeWidth), canvas.height); });
    }
    
    updateSelectedPaletteUI(paletteId) {
        document.querySelectorAll('.palette-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.paletteId === paletteId);
        });
    }

    updateScalePresetUI(currentScale) {
        this.dom.presetButtons.forEach(btn => btn.classList.toggle('selected', btn.dataset.scale === String(currentScale)));
    }

    updateOutputResolution(baseWidth, baseHeight, scale) {
        if (baseWidth > 0 && baseHeight > 0) {
            const outW = baseWidth * scale; const outH = baseHeight * scale;
            this.dom.outputResolution.textContent = `${outW} x ${outH} px`;
        } else {
            this.dom.outputResolution.textContent = `--- x --- px`;
        }
    }

    displaySrcImage(url) {
        this.dom.srcImg.src = url;
        this.dom.srcImg.style.display = 'block';
        this.dom.srcPlaceholder.style.display = 'none';
        this.dom.srcLabel.classList.add('visible');
        this.dom.outLabel.classList.add('visible');
        this.dom.extractPaletteBtn.disabled = false;
        if (this.isMobileLayout) {
            this.dom.srcContainer.style.display = 'none';
            this.dom.outContainer.style.display = 'flex';
        }
    }

    drawOutputImage(tmpCanvas, outputScale) {
        this.dom.outCanvas.width = tmpCanvas.width * outputScale;
        this.dom.outCanvas.height = tmpCanvas.height * outputScale;
        const octx = this.dom.outCanvas.getContext('2d');
        octx.imageSmoothingEnabled = false;
        octx.clearRect(0, 0, this.dom.outCanvas.width, this.dom.outCanvas.height);
        octx.drawImage(tmpCanvas, 0, 0, this.dom.outCanvas.width, this.dom.outCanvas.height);
        this.setLoading(false);
        this.dom.downloadBtn.disabled = false;
        this.updateRelativeImageSizes();
    }

    syncValues(el) {
        const val = Number(el.value);
        const id = el.id.replace(/Slider|Input/, '');
        if (this.dom.values[id]) {
            if (id === 'exposure' || id === 'paletteRatio') {
                this.dom.values[id].textContent = val.toFixed(2);
            } else {
                this.dom.values[id].textContent = val;
            }
        }
        if (id === 'dot') {
            this.dom.sliders.dotInput.value = val;
            this.dom.sliders.dotSlider.value = val;
        }
    }

    applyPreset(preset) {
        if (!preset) return;
        Object.keys(preset).forEach(key => {
            let sliderKey = key === 'dot' ? 'dotSlider' : key === 'dither' ? 'ditherStrength' : key;
            if (this.dom.sliders[sliderKey]) {
                this.dom.sliders[sliderKey].value = preset[key];
                this.syncValues(this.dom.sliders[sliderKey]);
            }
        });
    }

    handleBrightnessAdjust(btn) {
        const step = Number(btn.dataset.step);
        this.callbacks.onBrightnessAdjust(step);
    }
    
    updateAutoCorrectionInfo(text) {
        this.dom.autoCorrectionInfo.textContent = text;
    }

    applyFixedPreviewSize() {
        const isFixed = this.dom.fixedPreviewCheckbox.checked;
        [this.dom.srcImg, this.dom.outCanvas].forEach(el => {
            el.classList.toggle('fixed-size', isFixed);
            el.style.width = '';
            el.style.height = '';
        });
        if (!isFixed) {
            this.updateRelativeImageSizes();
        }
    }

    updateRelativeImageSizes() {
        if (this.dom.fixedPreviewCheckbox.checked || !this.dom.srcImg.naturalWidth || this.dom.outCanvas.width === 0) {
            return;
        }
        const srcW = this.dom.srcImg.naturalWidth;
        const outW = this.dom.outCanvas.width;
        this.dom.srcImg.style.width = '';
        this.dom.outCanvas.style.width = '';
        if (srcW > outW) {
            this.dom.srcImg.style.width = '100%';
            const scaleRatio = outW / srcW;
            this.dom.outCanvas.style.width = `${scaleRatio * 100}%`;
        } else {
            this.dom.outCanvas.style.width = '100%';
            const scaleRatio = srcW / outW;
            this.dom.srcImg.style.width = `${scaleRatio * 100}%`;
        }
    }

    validateInput(el) {
        const id = el.id.replace(/Slider|Input/, '');
        const min = Number(el.min), max = Number(el.max);
        let val = Number(el.value), errorMsg = '';
        if (isNaN(val)) { errorMsg = "数値を入力してください。"; val = min; }
        else if (val < min) { errorMsg = `${min}以上の値を入力してください。`; val = min; }
        else if (val > max) { errorMsg = `${max}以下の値を入力してください。`; val = max; }
        if (this.dom.errors[id]) this.dom.errors[id].textContent = errorMsg;
        if (errorMsg) { el.value = val; this.syncValues(el); }
        return !errorMsg;
    }

    clearValidationMessages() {
        Object.values(this.dom.errors).forEach(el => { if (el) el.textContent = ''; });
    }

    toggleDitherStrengthUI() {
        this.dom.ditherStrengthGroup.style.display = this.dom.ditherCheckbox.checked ? 'block' : 'none';
    }

    updateLayout() {
        this.isMobileLayout = this.mediaMatcher.matches;
        if (this.isMobileLayout) {
            this.dom.mobileImagePlaceholder.appendChild(this.dom.imageArea);
            this.dom.srcContainer.style.display = 'none';
            this.dom.outContainer.style.display = 'flex';
        } else {
            this.originalImageAreaParent.appendChild(this.dom.imageArea);
            this.dom.srcContainer.style.display = 'flex';
            this.dom.outContainer.style.display = 'flex';
        }
    }

    toggleImageView(hasLoadedImage) {
        if (!this.isMobileLayout || !hasLoadedImage) return;
        const isSrcVisible = this.dom.srcContainer.style.display !== 'none';
        if (isSrcVisible) {
            this.dom.srcContainer.style.display = 'none';
            this.dom.outContainer.style.display = 'flex';
        } else {
            this.dom.srcContainer.style.display = 'flex';
            this.dom.outContainer.style.display = 'none';
        }
    }
}
