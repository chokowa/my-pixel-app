import { UIManager } from './ui-manager.js';
import { PaletteManager } from './palette-manager.js';
import { PixelConverter } from './pixel-converter.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 各モジュールのインスタンスを生成
    const uiManager = new UIManager();
    const paletteManager = new PaletteManager(uiManager);
    const pixelConverter = new PixelConverter(uiManager, paletteManager, new Worker('./worker.js'));
    
    // 2. イベントハンドラのコールバックを定義
    const callbacks = {
        onFileChange: (e) => pixelConverter.handleFileChange(e),
        onParamsChange: () => pixelConverter.updateImage(),
        onScaleChange: () => pixelConverter.updateScale(),
        onDownload: () => pixelConverter.handleDownload(),
        onPaletteChange: async (paletteId) => {
            const isChanged = paletteManager.setCurrentPalette(paletteId);
            if (isChanged) {
                if (uiManager.dom.autoPresetCheckbox.checked) {
                    const preset = paletteManager.getPreset(paletteId);
                    uiManager.applyPreset(preset);
                }
                if (pixelConverter.loadedImage) {
                    pixelConverter.performAutoBrightnessCorrection();
                } else {
                    uiManager.updateAutoCorrectionInfo('');
                }
                pixelConverter.updateImage();
            }
        },
        onPaletteDelete: (paletteId) => {
            const newPaletteId = paletteManager.deleteCustomPalette(paletteId);
            if(newPaletteId) {
                callbacks.onPaletteChange(newPaletteId);
            }
        },
        onExtractPalette: async () => {
            const newPaletteId = await paletteManager.extractPaletteFromImage(pixelConverter.loadedImage);
            if (newPaletteId) {
                callbacks.onPaletteChange(newPaletteId);
            }
        },
        onImportPalette: (e) => paletteManager.handlePaletteImport(e, callbacks.onPaletteChange, callbacks.onPaletteDelete),
        onExportPalette: () => paletteManager.exportCurrentPalette(),
        onBrightnessAdjust: (step) => {
            const s = uiManager.dom.sliders;
            const preset = paletteManager.getPreset(paletteManager.getCurrentPaletteId());
            if (step === 0) {
                s.exposure.value = preset?.exposure ?? 1.0;
                s.contrast.value = preset?.contrast ?? 0;
            } else {
                const exposureStep = 0.1, contrastStep = 10;
                s.exposure.value = Math.max(Number(s.exposure.min), Math.min(Number(s.exposure.max), Number(s.exposure.value) + (step * exposureStep)));
                s.contrast.value = Math.max(Number(s.contrast.min), Math.min(Number(s.contrast.max), Number(s.contrast.value) + (step * contrastStep)));
            }
            uiManager.updateAutoCorrectionInfo('');
            uiManager.syncValues(s.exposure);
            uiManager.syncValues(s.contrast);
            pixelConverter.updateImage();
        },
    };

    // 3. アプリケーションの初期化
    uiManager.init(callbacks);
    paletteManager.init();
    pixelConverter.init();
    
    // 初期のパレット選択をUIに反映
    callbacks.onPaletteChange(paletteManager.getCurrentPaletteId());
});
