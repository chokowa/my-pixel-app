// =====================================================================
// Web Worker コード
// =====================================================================
function nearestColorIndex(r, g, b, paletteRGB) {
    let best = 0, bestDist = 1e9;
    for (let i = 0; i < paletteRGB.length; i++) {
        const p = paletteRGB[i];
        const dr = r - p[0], dg = g - p[1], db = b - p[2], d = dr * dr + dg * dg + db * db;
        if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
}
function applyDither(pixels, w, h, paletteRGB, factor, blendRatio, reportProgress) {
    const ditherPixels = new Uint8ClampedArray(pixels);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const alpha = pixels[idx + 3];
            const oldR = ditherPixels[idx], oldG = ditherPixels[idx + 1], oldB = ditherPixels[idx + 2];
            const pi = nearestColorIndex(oldR, oldG, oldB, paletteRGB);
            const [nr, ng, nb] = paletteRGB[pi];
            const br = blendRatio;
            const r = oldR * (1 - br) + nr * br, g = oldG * (1 - br) + ng * br, b = oldB * (1 - br) + nb * br;
            const errR = oldR - r, errG = oldG - g, errB = oldB - b;
            pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = alpha;
            const push = (xx, yy, f) => {
                if (xx < 0 || xx >= w || yy < 0 || yy >= h) return;
                const j = (yy * w + xx) * 4;
                ditherPixels[j] = Math.max(0, Math.min(255, ditherPixels[j] + errR * f * factor));
                ditherPixels[j + 1] = Math.max(0, Math.min(255, ditherPixels[j + 1] + errG * f * factor));
                ditherPixels[j + 2] = Math.max(0, Math.min(255, ditherPixels[j + 2] + errB * f * factor));
            };
            push(x + 1, y, 7/16); push(x - 1, y + 1, 3/16); push(x, y + 1, 5/16); push(x + 1, y + 1, 1/16);
        }
        if (y % 10 === 0) reportProgress(30 + (70 * (y / h)));
    }
}
function quantizeNoDither(pixels, w, h, paletteRGB, blendRatio, reportProgress) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const alpha = pixels[idx + 3];
            const pi = nearestColorIndex(pixels[idx], pixels[idx + 1], pixels[idx + 2], paletteRGB);
            const [nr, ng, nb] = paletteRGB[pi];
            const br = blendRatio;
            pixels[idx] = pixels[idx] * (1 - br) + nr * br;
            pixels[idx + 1] = pixels[idx + 1] * (1 - br) + ng * br;
            pixels[idx + 2] = pixels[idx + 2] * (1 - br) + nb * br;
            pixels[idx + 3] = alpha;
        }
        if (y % 10 === 0) reportProgress(30 + (70 * (y / h)));
    }
}
self.onmessage = async (e) => {
    const { imageData, params, workerId } = e.data;
    const { targetW, targetH, exposure, contrast, sharpen, useDither, ditherStrength, paletteRGB, paletteRatio } = params;
    const data = imageData.data;
    const reportProgress = (p) => self.postMessage({ type: 'progress', percentage: Math.floor(p), workerId });
    reportProgress(0);
    for (let i = 0; i < data.length; i += 4) {
        data[i] *= exposure; data[i + 1] *= exposure; data[i + 2] *= exposure;
    }
    reportProgress(5);
    const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
        data[i] = cFactor * (data[i] - 128) + 128;
        data[i + 1] = cFactor * (data[i + 1] - 128) + 128;
        data[i + 2] = cFactor * (data[i + 2] - 128) + 128;
    }
    reportProgress(10);
    const sharpenStrength = sharpen / 100.0;
    if (sharpenStrength > 0) {
        const sourcePixels = new Uint8ClampedArray(data);
        const w = targetW;
        const h = targetH;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                let r = 0, g = 0, b = 0;
                const center = 5, neighbor = -1;
                const currentR = sourcePixels[i], currentG = sourcePixels[i + 1], currentB = sourcePixels[i + 2];
                r = currentR * center; g = currentG * center; b = currentB * center;
                if (y > 0) { const up = i - w * 4; r += sourcePixels[up] * neighbor; g += sourcePixels[up + 1] * neighbor; b += sourcePixels[up + 2] * neighbor; }
                if (y < h - 1) { const down = i + w * 4; r += sourcePixels[down] * neighbor; g += sourcePixels[down + 1] * neighbor; b += sourcePixels[down + 2] * neighbor; }
                if (x > 0) { const left = i - 4; r += sourcePixels[left] * neighbor; g += sourcePixels[left + 1] * neighbor; b += sourcePixels[left + 2] * neighbor; }
                if (x < w - 1) { const right = i + 4; r += sourcePixels[right] * neighbor; g += sourcePixels[right + 1] * neighbor; b += sourcePixels[right + 2] * neighbor; }
                data[i] = currentR * (1 - sharpenStrength) + r * sharpenStrength;
                data[i + 1] = currentG * (1 - sharpenStrength) + g * sharpenStrength;
                data[i + 2] = currentB * (1 - sharpenStrength) + b * sharpenStrength;
            }
        }
    }
    reportProgress(30);
    if (useDither) {
        applyDither(data, targetW, targetH, paletteRGB, ditherStrength / 100, paletteRatio, reportProgress);
    } else {
        quantizeNoDither(data, targetW, targetH, paletteRGB, paletteRatio, reportProgress);
    }
    reportProgress(100);
    self.postMessage({ type: 'result', imageData, workerId }, [imageData.data.buffer]);
};