export class PixelConverter {
    constructor(uiManager, paletteManager, worker) {
        this.uiManager = uiManager;
        this.paletteManager = paletteManager;
        this.worker = worker;

        this.loadedImage = null;
        this.tmpCanvas = document.createElement('canvas');
        this.tmpCtx = this.tmpCanvas.getContext('2d', { willReadFrequently: true });
        this.debounceTimer = null;
        this.workerCurrentId = 0;
        this.currentObjectURL = null;
        this.baseWidth = 0;
        this.baseHeight = 0;
    }

    init() {
        this.setupWorkerListener();
    }
    
    setupWorkerListener() {
        this.worker.onmessage = (e) => {
            const { type, workerId, imageData, percentage } = e.data;
            if (workerId !== this.workerCurrentId) return;

            if (type === 'progress') {
                this.uiManager.updateProgressBar(percentage);
            } else if (type === 'result') {
                this.tmpCanvas.width = imageData.width;
                this.tmpCanvas.height = imageData.height;
                this.tmpCtx.putImageData(imageData, 0, 0);
                const outputScale = Number(this.uiManager.dom.sliders.scale.value);
                this.uiManager.drawOutputImage(this.tmpCanvas, outputScale);
            }
        };
        this.worker.onerror = (e) => {
            console.error("Worker Error:", e);
            this.uiManager.setLoading(false);
            alert("画像処理中にエラーが発生しました: " + e.message);
        };
    }

    handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (this.currentObjectURL) {
            URL.revokeObjectURL(this.currentObjectURL);
        }

        this.uiManager.updateAutoCorrectionInfo('');
        this.uiManager.setLoading(true, "画像読み込み中...");
        this.uiManager.dom.downloadBtn.disabled = true;

        const url = URL.createObjectURL(file);
        this.currentObjectURL = url;
        const processingImage = new Image();

        processingImage.onload = () => {
            this.loadedImage = processingImage;
            this.uiManager.displaySrcImage(this.currentObjectURL);

            if (this.uiManager.dom.autoPresetCheckbox.checked && !this.paletteManager.getCurrentPaletteId().startsWith('custom_')) {
                const preset = this.paletteManager.getPreset(this.paletteManager.getCurrentPaletteId());
                this.uiManager.applyPreset(preset);
            }
            this.performAutoBrightnessCorrection();
            this.updateImage();
        };

        processingImage.onerror = () => {
            this.uiManager.setLoading(false);
            if (this.currentObjectURL) {
                URL.revokeObjectURL(this.currentObjectURL);
                this.currentObjectURL = null;
            }
            alert("画像の読み込みに失敗しました。");
        };
        processingImage.src = url;
    }

    updateImage() {
        if (!this.loadedImage) {
            this.uiManager.setLoading(false);
            this.uiManager.dom.downloadBtn.disabled = true;
            return;
        }

        if (Object.values(this.uiManager.dom.sliders).some(el => !this.uiManager.validateInput(el))) {
            return;
        }

        this.uiManager.setLoading(true);

        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
            this.workerCurrentId++;
            const s = this.uiManager.dom.sliders;

            const baseDimension = Number(s.dotSlider.value);
            const imgW = this.loadedImage.width, imgH = this.loadedImage.height;
            let targetW, targetH;

            if (this.uiManager.dom.correctAspectCheckbox.checked) {
                if (imgW < imgH) { targetW = baseDimension; targetH = baseDimension * (imgH / imgW); }
                else { targetH = baseDimension; targetW = baseDimension * (imgW / imgH); }
            } else {
                if (imgW > imgH) { targetW = baseDimension; targetH = baseDimension * (imgH / imgW); }
                else { targetH = baseDimension; targetW = baseDimension * (imgW / imgH); }
            }

            this.baseWidth = Math.max(1, Math.round(targetW));
            this.baseHeight = Math.max(1, Math.round(targetH));
            this.updateScale();

            this.tmpCanvas.width = this.baseWidth;
            this.tmpCanvas.height = this.baseHeight;
            this.tmpCtx.imageSmoothingEnabled = false;
            this.tmpCtx.drawImage(this.loadedImage, 0, 0, this.baseWidth, this.baseHeight);
            const imageData = this.tmpCtx.getImageData(0, 0, this.baseWidth, this.baseHeight);

            const hexToRgbArray = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
            const params = {
                targetW: this.baseWidth,
                targetH: this.baseHeight,
                exposure: Number(s.exposure.value),
                contrast: Number(s.contrast.value),
                sharpen: Number(s.sharpen.value),
                useDither: this.uiManager.dom.ditherCheckbox.checked,
                ditherStrength: Number(s.ditherStrength.value),
                paletteRGB: this.paletteManager.getCurrentPalette().map(hexToRgbArray),
                paletteRatio: Number(s.paletteRatio.value),
            };

            this.worker.postMessage({ imageData, params, workerId: this.workerCurrentId }, [imageData.data.buffer]);
        }, 150);
    }
    
    updateScale() {
        this.uiManager.updateOutputResolution(this.baseWidth, this.baseHeight, Number(this.uiManager.dom.sliders.scale.value));
    }

    handleDownload() {
        if (!this.loadedImage) return;
        const a = document.createElement('a');
        a.href = this.uiManager.dom.outCanvas.toDataURL('image/png');
        a.download = `retro_pixel_${this.paletteManager.getCurrentPaletteId()}.png`;
        a.click();
    }
    
    calculateAverageBrightness(image) {
        const MAX_DIMENSION = 200, TRIM_PERCENT = 0.05, DOMINANT_BG_THRESHOLD = 0.20;
        const NEAR_BLACK_THRESHOLD = 30, NEAR_WHITE_THRESHOLD = 225;
        let w = image.width, h = image.height;
        if (w > h) { if (w > MAX_DIMENSION) { h = Math.round(h * (MAX_DIMENSION / w)); w = MAX_DIMENSION; } } 
        else { if (h > MAX_DIMENSION) { w = Math.round(w * (MAX_DIMENSION / h)); h = MAX_DIMENSION; } }
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        canvas.width = w; canvas.height = h; ctx.drawImage(image, 0, 0, w, h);
        try {
            const data = ctx.getImageData(0, 0, w, h).data; const histogram = new Array(256).fill(0); let totalPixelCount = 0;
            for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 128) continue; histogram[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++; totalPixelCount++; }
            if (totalPixelCount === 0) return 128;
            let calculationHistogram = [...histogram]; let calculationPixelCount = totalPixelCount; let isDominantBgDetected = false;
            let nearBlackCount = 0; for (let i = 0; i <= NEAR_BLACK_THRESHOLD; i++) nearBlackCount += histogram[i];
            if (nearBlackCount / totalPixelCount > DOMINANT_BG_THRESHOLD) { isDominantBgDetected = true; calculationPixelCount -= nearBlackCount; for (let i = 0; i <= NEAR_BLACK_THRESHOLD; i++) calculationHistogram[i] = 0; }
            let nearWhiteCount = 0; for (let i = 255; i >= NEAR_WHITE_THRESHOLD; i--) nearWhiteCount += histogram[i];
            if (nearWhiteCount / totalPixelCount > DOMINANT_BG_THRESHOLD) { isDominantBgDetected = true; calculationPixelCount -= nearWhiteCount; for (let i = 255; i >= NEAR_WHITE_THRESHOLD; i--) calculationHistogram[i] = 0; }
            if (calculationPixelCount === 0) return 128;
            if (isDominantBgDetected) { let totalLuminance = 0; for (let i = 0; i < 256; i++) { totalLuminance += i * calculationHistogram[i]; } return totalLuminance / calculationPixelCount; } 
            else {
                const trimCount = calculationPixelCount * TRIM_PERCENT; let accumulated = 0; let minBound = 0, maxBound = 255;
                for (let i = 0; i < 256; i++) { accumulated += calculationHistogram[i]; if (accumulated >= trimCount) { minBound = i; break; } }
                accumulated = 0; for (let i = 255; i >= 0; i--) { accumulated += calculationHistogram[i]; if (accumulated >= trimCount) { maxBound = i; break; } }
                let totalLuminance = 0, finalPixelCount = 0;
                for (let i = minBound; i <= maxBound; i++) { totalLuminance += i * calculationHistogram[i]; finalPixelCount += calculationHistogram[i]; }
                return finalPixelCount > 0 ? totalLuminance / finalPixelCount : 128;
            }
        } catch (e) { console.error("輝度計算中にエラー:", e); return 128; }
    }

    autoAdjustExposure(avgBrightness, currentExposure) {
        const TARGET_BRIGHTNESS = 120, LOWER_THRESHOLD = 80, UPPER_THRESHOLD = 170;
        let newExposure = currentExposure;
        if (avgBrightness > 0 && (avgBrightness < LOWER_THRESHOLD || avgBrightness > UPPER_THRESHOLD)) {
            let correctionFactor = TARGET_BRIGHTNESS / avgBrightness;
            correctionFactor = Math.max(0.7, Math.min(1.5, correctionFactor));
            newExposure = currentExposure * correctionFactor;
            const min = Number(this.uiManager.dom.sliders.exposure.min), max = Number(this.uiManager.dom.sliders.exposure.max);
            newExposure = Math.max(min, Math.min(max, newExposure));
            this.uiManager.dom.sliders.exposure.value = newExposure; this.uiManager.syncValues(this.uiManager.dom.sliders.exposure);
        }
        const correctionAmount = newExposure - currentExposure;
        if (Math.abs(correctionAmount) > 0.01) {
            const sign = correctionAmount > 0 ? '+' : '';
            this.uiManager.updateAutoCorrectionInfo(`自動補正: ${sign}${correctionAmount.toFixed(2)}`);
        } else {
            this.uiManager.updateAutoCorrectionInfo('');
        }
    }

    performAutoBrightnessCorrection() {
        if (!this.loadedImage) return;
        const currentExposure = Number(this.uiManager.dom.sliders.exposure.value);
        const avgBrightness = this.calculateAverageBrightness(this.loadedImage);
        this.autoAdjustExposure(avgBrightness, currentExposure);
    }
}
