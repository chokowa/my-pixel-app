import { PALETTES, PALETTE_PRESETS } from './config.js';

export class PaletteManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentPaletteId = 'nes_standard';
        this.palettes = PALETTES; // 動的に変更可能なようにコピー
        this.presets = PALETTE_PRESETS;
    }

    init() {
        this.uiManager.updateSelectedPaletteUI(this.currentPaletteId);
    }
    
    getCurrentPaletteId() {
        return this.currentPaletteId;
    }

    getCurrentPalette() {
        return this.palettes[this.currentPaletteId];
    }
    
    getPreset(paletteId) {
        return this.presets[paletteId];
    }

    setCurrentPalette(paletteId) {
        if (this.currentPaletteId === paletteId) return;
        this.currentPaletteId = paletteId;
        this.uiManager.updateSelectedPaletteUI(paletteId);
        this.uiManager.dom.exportPaletteBtn.disabled = !paletteId.startsWith('custom_');
        return true; // 変更があったことを通知
    }

    async extractPaletteFromImage(loadedImage) {
        if (!loadedImage) return;

        const colorCount = parseInt(this.uiManager.dom.extractColorCount.value, 10);
        const method = this.uiManager.dom.extractMethod.value;
        this.uiManager.setLoading(true, "パレット抽出中...");
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const MAX_PIXELS = 100 * 100;
            let w = loadedImage.width, h = loadedImage.height;
            if (w * h > MAX_PIXELS) { const ratio = Math.sqrt(MAX_PIXELS / (w * h)); w = Math.floor(w * ratio); h = Math.floor(h * ratio); }
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(loadedImage, 0, 0, w, h);
            const imageData = tempCtx.getImageData(0, 0, w, h).data;
            
            let paletteColors;
            if (method === 'medianCut') {
                paletteColors = this.extractPaletteByMedianCut(imageData, colorCount);
            } else {
                paletteColors = this.extractPaletteByFrequency(imageData, colorCount);
            }

            if (!paletteColors || paletteColors.length === 0) {
                alert("画像から色を抽出できませんでした。");
                return null;
            }

            const paletteId = `custom_${Date.now()}`;
            const methodName = method === 'medianCut' ? "メディアンカット" : "出現頻度";
            const name = `抽出(${methodName}, ${colorCount}色)`;
            this.addCustomPalette(paletteId, name, paletteColors);
            return paletteId;

        } catch (error) {
            console.error("Palette extraction failed:", error);
            alert("パレットの抽出中にエラーが発生しました。");
            return null;
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    extractPaletteByFrequency(imageData, colorCount) {
        const colorCounts = {};
        for (let i = 0; i < imageData.length; i += 4) {
            if (imageData[i + 3] < 128) continue;
            const r = Math.round(imageData[i] / 16) * 16, g = Math.round(imageData[i + 1] / 16) * 16, b = Math.round(imageData[i + 2] / 16) * 16;
            const key = `${r},${g},${b}`; colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
        const sortedColors = Object.entries(colorCounts).sort(([, countA], [, countB]) => countB - countA).slice(0, colorCount);
        const toHex = (c) => ('0' + c.toString(16)).slice(-2);
        return sortedColors.map(([rgbStr]) => { const [r, g, b] = rgbStr.split(','); return `#${toHex(Number(r))}${toHex(Number(g))}${toHex(Number(b))}`; });
    }

    extractPaletteByMedianCut(imageData, colorCount) {
        const pixels = [];
        for (let i = 0; i < imageData.length; i += 4) { if (imageData[i + 3] < 128) continue; pixels.push([imageData[i], imageData[i + 1], imageData[i + 2]]); }
        if (pixels.length === 0) return [];
        const splitCount = Math.ceil(Math.log2(colorCount)); let buckets = [pixels];
        for (let i = 0; i < splitCount; i++) {
            if (buckets.length >= colorCount) break;
            const newBuckets = [];
            for (const bucket of buckets) {
                if (bucket.length === 0) continue;
                let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
                for (const p of bucket) { minR = Math.min(minR, p[0]); maxR = Math.max(maxR, p[0]); minG = Math.min(minG, p[1]); maxG = Math.max(maxG, p[1]); minB = Math.min(minB, p[2]); maxB = Math.max(maxB, p[2]); }
                const rangeR = maxR - minR, rangeG = maxG - minG, rangeB = maxB - minB;
                let axis = 0;
                if (rangeG >= rangeR && rangeG >= rangeB) axis = 1; else if (rangeB >= rangeR && rangeB >= rangeG) axis = 2;
                bucket.sort((a, b) => a[axis] - b[axis]);
                const mid = Math.ceil(bucket.length / 2);
                newBuckets.push(bucket.slice(0, mid)); newBuckets.push(bucket.slice(mid));
            }
            buckets = newBuckets;
        }
        const palette = []; const toHex = (c) => ('0' + Math.round(c).toString(16)).slice(-2);
        for (const bucket of buckets) {
            if (bucket.length === 0) continue;
            let r = 0, g = 0, b = 0;
            for (const p of bucket) { r += p[0]; g += p[1]; b += p[2]; }
            const len = bucket.length; palette.push(`#${toHex(r/len)}${toHex(g/len)}${toHex(b/len)}`);
        }
        return palette.slice(0, colorCount);
    }
    
    addCustomPalette(id, name, colors, onPaletteChange, onPaletteDelete) {
        this.palettes[id] = colors;
        const s = this.uiManager.dom.sliders;
        this.presets[id] = {
            dot: Number(s.dotSlider.value), exposure: Number(s.exposure.value),
            contrast: Number(s.contrast.value), sharpen: Number(s.sharpen.value),
            dither: Number(s.ditherStrength.value), paletteRatio: Number(s.paletteRatio.value),
        };
        this.uiManager.addCustomPaletteUI(id, name, colors, onPaletteChange, onPaletteDelete);
    }
    
    deleteCustomPalette(id) {
        delete this.palettes[id];
        delete this.presets[id];
        if (this.currentPaletteId === id) {
            return 'nes_standard'; // デフォルトに戻す必要あり
        }
        return null;
    }

    handlePaletteImport(e, onPaletteChange, onPaletteDelete) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const colors = JSON.parse(event.target.result);
                if (!Array.isArray(colors) || !colors.every(c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))) { throw new Error("無効なパレットファイル形式です。HEXカラーコードの配列である必要があります。"); }
                const name = file.name.replace(/\.[^/.]+$/, "") || "インポート";
                const paletteId = `custom_${Date.now()}`;
                this.addCustomPalette(paletteId, name, colors, onPaletteChange, onPaletteDelete);
                onPaletteChange(paletteId);
            } catch (error) { alert(`パレットの読み込みに失敗しました: ${error.message}`); }
        };
        reader.onerror = () => alert("ファイルの読み込みに失敗しました。");
        reader.readAsText(file);
        e.target.value = ''; // 同じファイルを再度選択できるように
    }

    exportCurrentPalette() {
        if (!this.currentPaletteId.startsWith('custom_')) return;
        const palette = this.palettes[this.currentPaletteId]; if (!palette) return;
        const paletteItem = this.uiManager.dom.customPaletteContainer.querySelector(`[data-palette-id="${this.currentPaletteId}"]`);
        const paletteName = paletteItem ? paletteItem.querySelector('.palette-name').textContent : 'custom_palette';
        const jsonString = JSON.stringify(palette, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${paletteName}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
}
