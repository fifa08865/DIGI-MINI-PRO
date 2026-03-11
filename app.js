/* ============================
   BANANA RIPENESS DETECTOR
   Core Application Logic
   ============================ */

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initDropzone();
    loadHistory();
});

// ==================== BACKGROUND PARTICLES ====================

function initParticles() {
    const container = document.getElementById('bgParticles');
    const emojis = ['🍌', '🍃', '✨', '🌿'];
    const count = 15;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        particle.className = 'particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.fontSize = (14 + Math.random() * 18) + 'px';
        particle.style.animationDuration = (15 + Math.random() * 25) + 's';
        particle.style.animationDelay = (Math.random() * 20) + 's';
        container.appendChild(particle);
    }
}

// ==================== TAB SWITCHING ====================

function switchTab(tab) {
    const tabUpload = document.getElementById('tabUpload');
    const tabCamera = document.getElementById('tabCamera');
    const uploadContent = document.getElementById('uploadContent');
    const cameraContent = document.getElementById('cameraContent');

    if (tab === 'upload') {
        tabUpload.classList.add('active');
        tabCamera.classList.remove('active');
        uploadContent.classList.add('active');
        cameraContent.classList.remove('active');
        stopCamera();
    } else {
        tabCamera.classList.add('active');
        tabUpload.classList.remove('active');
        cameraContent.classList.add('active');
        uploadContent.classList.remove('active');
    }
}

// ==================== DROPZONE / FILE UPLOAD ====================

function initDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        showPreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showPreview(imageSrc) {
    const previewImage = document.getElementById('previewImage');
    previewImage.src = imageSrc;

    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('previewSection').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
}

// ==================== CAMERA ====================

let cameraStream = null;

async function startCamera() {
    try {
        const video = document.getElementById('cameraVideo');
        const container = video.closest('.camera-container');
        const startBtn = document.getElementById('startCameraBtn');

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
        });

        video.srcObject = cameraStream;
        container.classList.add('active');
        startBtn.style.display = 'none';
    } catch (err) {
        alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง');
        console.error('Camera error:', err);
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        const container = document.querySelector('.camera-container');
        const startBtn = document.getElementById('startCameraBtn');
        container.classList.remove('active');
        startBtn.style.display = '';
    }
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    showPreview(imageSrc);
}

// ==================== ROBOFLOW API CONFIG ====================

const ROBOFLOW_MODEL = 'banana-ripeness-classification';
const ROBOFLOW_VERSION = '1';
const ROBOFLOW_API_URL = `https://classify.roboflow.com/${ROBOFLOW_MODEL}/${ROBOFLOW_VERSION}`;

function getApiKey() {
    return localStorage.getItem('roboflowApiKey') || '';
}

function saveApiKey(key) {
    localStorage.setItem('roboflowApiKey', key.trim());
}

function showApiKeyPrompt() {
    const current = getApiKey();
    const key = prompt(
        '🔑 กรุณาใส่ Roboflow API Key\n\n' +
        'สมัครฟรีที่: https://app.roboflow.com/settings/api\n\n' +
        '(API Key จะถูกเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น)',
        current
    );
    if (key !== null && key.trim() !== '') {
        saveApiKey(key);
        return key.trim();
    }
    return null;
}

// ==================== IMAGE ANALYSIS ====================

async function analyzeImage() {
    const previewImage = document.getElementById('previewImage');

    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.remove('hidden');

    // Animate loading bar
    const loadingFill = document.getElementById('loadingBarFill');
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        loadingFill.style.width = progress + '%';
    }, 200);

    // Check for API key
    let apiKey = getApiKey();
    if (!apiKey) {
        clearInterval(loadingInterval);
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('previewSection').classList.remove('hidden');
        apiKey = showApiKeyPrompt();
        if (!apiKey) return;
        // Restart analysis
        analyzeImage();
        return;
    }

    try {
        // Convert image to base64
        const canvas = document.getElementById('analysisCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const base64Data = await new Promise((resolve) => {
            img.onload = () => {
                // Scale for API (max 640px)
                const maxSize = 640;
                let w = img.width;
                let h = img.height;
                if (w > h) {
                    if (w > maxSize) { h = h * maxSize / w; w = maxSize; }
                } else {
                    if (h > maxSize) { w = w * maxSize / h; h = maxSize; }
                }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
            };
            img.src = previewImage.src;
        });

        // Call Roboflow API
        const response = await fetch(`${ROBOFLOW_API_URL}?api_key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: base64Data
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('roboflowApiKey');
                throw new Error('API Key ไม่ถูกต้อง กรุณาใส่ใหม่');
            }
            throw new Error(`API Error: ${response.status}`);
        }

        const apiResult = await response.json();

        // Parse Roboflow classification response
        const result = parseRoboflowResult(apiResult);

        // Finish loading
        clearInterval(loadingInterval);
        loadingFill.style.width = '100%';

        setTimeout(() => {
            document.getElementById('loadingSection').classList.add('hidden');
            if (!result.bananaDetected) {
                document.getElementById('noBananaSection').classList.remove('hidden');
                document.getElementById('noBananaSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                displayResults(result, previewImage.src);
            }
        }, 500);

    } catch (error) {
        clearInterval(loadingInterval);
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('previewSection').classList.remove('hidden');
        alert('❌ เกิดข้อผิดพลาด: ' + error.message);
        console.error('Analysis error:', error);
    }
}

/**
 * Parse Roboflow classification API response into display format
 */
function parseRoboflowResult(apiResult) {
    // Roboflow classification response format:
    // { predicted_classes: ["ripe"], predictions: [{ class: "ripe", confidence: 0.95 }, ...] }
    // or { top: "ripe", confidence: 0.95, ... }

    let predictions = {};
    let topClass = '';
    let topConfidence = 0;

    if (apiResult.predictions && Array.isArray(apiResult.predictions)) {
        for (const pred of apiResult.predictions) {
            predictions[pred.class] = pred.confidence;
            if (pred.confidence > topConfidence) {
                topConfidence = pred.confidence;
                topClass = pred.class;
            }
        }
    } else if (apiResult.top) {
        topClass = apiResult.top;
        topConfidence = apiResult.confidence || 0;
        // Try to get all class predictions
        if (apiResult.predictions) {
            for (const [cls, conf] of Object.entries(apiResult.predictions)) {
                predictions[cls] = conf;
            }
        }
    }

    // Normalize class names (lowercase)
    topClass = topClass.toLowerCase().trim();

    // Map class names to our ripeness levels
    const classMapping = {
        'unripe': 'unripe',
        'ripe': 'ripe',
        'overripe': 'overripe',
        'green': 'unripe',
        'yellow': 'ripe',
        'brown': 'overripe',
        'freshripe': 'ripe',
        'freshunripe': 'unripe',
        'rotten': 'overripe',
        'spotted': 'overripe',
    };

    const RIPENESS_DATA = {
        'unripe': {
            status: 'ยังไม่สุก',
            statusClass: 'unripe',
            emoji: '🟢🍌',
            description: 'กล้วยยังเขียวอยู่ ต้องรออีกหลายวันกว่าจะสุก',
            tips: 'เก็บกล้วยไว้ในอุณหภูมิห้อง (25-28°C) เพื่อให้สุกเร็วขึ้น หรือใส่ถุงกระดาษปิดสนิทร่วมกับผลไม้ที่ปล่อยก๊าซเอทิลีน เช่น แอปเปิ้ล'
        },
        'ripe': {
            status: 'สุกแล้ว',
            statusClass: 'ripe',
            emoji: '🟠🍌',
            description: 'กล้วยสุกพอดี พร้อมรับประทาน! 🎉',
            tips: 'กล้วยสุกพอดีอุดมไปด้วยโพแทสเซียม วิตามินบี 6 และเส้นใยอาหาร เหมาะสำหรับรับประทานเลยตอนนี้ หรือเก็บในตู้เย็นเพื่อยืดอายุอีก 2-3 วัน'
        },
        'overripe': {
            status: 'สุกเกินไป',
            statusClass: 'overripe',
            emoji: '🟤🍌',
            description: 'กล้วยสุกเกินไปแล้ว มีจุดน้ำตาล เหมาะทำขนม',
            tips: 'กล้วยสุกเกินไปเหมาะสำหรับทำขนมปัง กล้วยทอด สมูทตี้ หรือไอศกรีมกล้วย! หากยังไม่ได้ใช้ ให้แกะเปลือกแล้วแช่แข็งเก็บไว้'
        }
    };

    const mappedClass = classMapping[topClass] || 'ripe';
    const info = RIPENESS_DATA[mappedClass];
    const confidence = Math.round(topConfidence * 100);

    // Build breakdown from predictions
    const breakdown = { unripe: 0, ripening: 0, ripe: 0, overripe: 0 };
    const colors = { green: 0, yellowGreen: 0, yellow: 0, brown: 0 };

    for (const [cls, conf] of Object.entries(predictions)) {
        const mapped = classMapping[cls.toLowerCase().trim()] || cls.toLowerCase().trim();
        const pct = Math.round(conf * 100);
        if (mapped === 'unripe') {
            breakdown.unripe += pct;
            colors.green += pct;
        } else if (mapped === 'ripe') {
            breakdown.ripe += pct;
            colors.yellow += pct;
        } else if (mapped === 'overripe') {
            breakdown.overripe += pct;
            colors.brown += pct;
        }
    }

    return {
        ...info,
        confidence,
        bananaDetected: topConfidence > 0.1,
        bananaScore: confidence,
        colors,
        breakdown,
        avgHue: 0,
        avgSaturation: 0,
        avgBrightness: 0,
        bananaPixelRatio: confidence
    };
}

// ==================== COLOR ANALYSIS ENGINE ====================

/**
 * Convert RGB to HSV
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{h: number, s: number, v: number}} HSV values (H: 0-360, S: 0-100, V: 0-100)
 */
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;

    return { h, s, v };
}

/**
 * Check if a pixel is banana-colored (HSV-based)
 * Banana colors: green (unripe), yellow-green, yellow (ripe), brown (overripe)
 */
function isBananaPixel(r, g, b) {
    const hsv = rgbToHsv(r, g, b);
    // Filter out background (too dark, too white, too desaturated)
    if (hsv.s <= 20 || hsv.v <= 15 || hsv.v >= 97) return false;
    // Banana hue range: 20-90 covers yellow-green to yellow to orange
    // Plus green range for unripe: 60-140
    // Plus brown for overripe: 15-45 with low brightness
    const isYellowRange = hsv.h >= 25 && hsv.h <= 65 && hsv.s > 30 && hsv.v > 40;
    const isGreenRange = hsv.h >= 60 && hsv.h <= 140 && hsv.s > 25 && hsv.v > 20;
    const isBrownRange = hsv.h >= 15 && hsv.h <= 45 && hsv.s > 15 && hsv.v > 10 && hsv.v < 60;
    return isYellowRange || isGreenRange || isBrownRange;
}

/**
 * Detect if there's actually a banana in the image using spatial analysis
 * Returns { detected: boolean, score: number, bananaGrid: 2D array }
 */
function detectBanana(imageData) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;

    // Step 1: Create a grid map of banana-colored pixels
    // Use a coarser grid (4x4 blocks) for performance
    const blockSize = 4;
    const gridW = Math.ceil(w / blockSize);
    const gridH = Math.ceil(h / blockSize);
    const grid = Array.from({ length: gridH }, () => new Uint8Array(gridW));

    // For each block, check if majority of pixels are banana-colored
    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            let bananaCount = 0;
            let totalCount = 0;
            const startX = gx * blockSize;
            const startY = gy * blockSize;
            const endX = Math.min(startX + blockSize, w);
            const endY = Math.min(startY + blockSize, h);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const idx = (y * w + x) * 4;
                    totalCount++;
                    if (isBananaPixel(data[idx], data[idx + 1], data[idx + 2])) {
                        bananaCount++;
                    }
                }
            }
            // Mark block as banana if >50% of its pixels are banana-colored
            grid[gy][gx] = (bananaCount / totalCount > 0.5) ? 1 : 0;
        }
    }

    // Step 2: Find connected components using flood-fill
    const visited = Array.from({ length: gridH }, () => new Uint8Array(gridW));
    const regions = [];

    function floodFill(startGy, startGx) {
        const region = { cells: [], minX: gridW, maxX: 0, minY: gridH, maxY: 0 };
        const stack = [[startGy, startGx]];
        visited[startGy][startGx] = 1;

        while (stack.length > 0) {
            const [cy, cx] = stack.pop();
            region.cells.push([cy, cx]);
            region.minX = Math.min(region.minX, cx);
            region.maxX = Math.max(region.maxX, cx);
            region.minY = Math.min(region.minY, cy);
            region.maxY = Math.max(region.maxY, cy);

            // 4-connected neighbors
            const neighbors = [[cy-1,cx],[cy+1,cx],[cy,cx-1],[cy,cx+1]];
            for (const [ny, nx] of neighbors) {
                if (ny >= 0 && ny < gridH && nx >= 0 && nx < gridW &&
                    !visited[ny][nx] && grid[ny][nx] === 1) {
                    visited[ny][nx] = 1;
                    stack.push([ny, nx]);
                }
            }
        }
        return region;
    }

    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            if (grid[gy][gx] === 1 && !visited[gy][gx]) {
                regions.push(floodFill(gy, gx));
            }
        }
    }

    // Step 3: Analyze the largest region
    if (regions.length === 0) {
        return { detected: false, score: 0 };
    }

    regions.sort((a, b) => b.cells.length - a.cells.length);
    const largest = regions[0];

    const regionW = largest.maxX - largest.minX + 1;
    const regionH = largest.maxY - largest.minY + 1;
    const regionArea = regionW * regionH;
    const regionPixels = largest.cells.length;
    const totalGridCells = gridW * gridH;

    // Solidity: how filled is the bounding box (bananas are ~0.4-0.8)
    const solidity = regionPixels / Math.max(regionArea, 1);

    // Aspect ratio: bananas are elongated (ratio > 1.3 typically)
    const aspectRatio = Math.max(regionW, regionH) / Math.max(Math.min(regionW, regionH), 1);

    // Region size relative to image
    const sizeRatio = regionPixels / totalGridCells;

    // Step 4: Calculate banana score (0-100)
    let score = 0;

    // Size: banana should occupy at least 5% of the image
    if (sizeRatio >= 0.05) score += 25;
    else if (sizeRatio >= 0.03) score += 15;

    // Solidity: banana regions have moderate solidity (not too sparse, not a perfect rectangle)
    if (solidity >= 0.3 && solidity <= 0.95) score += 25;
    else if (solidity >= 0.2) score += 10;

    // Aspect ratio: elongated shapes are more banana-like
    if (aspectRatio >= 1.5 && aspectRatio <= 8) score += 25;
    else if (aspectRatio >= 1.2) score += 15;
    // Also accept round-ish banana bunches
    else if (sizeRatio >= 0.15) score += 20;

    // Color concentration: banana pixels should be concentrated, not scattered
    // Check how many of the top 3 regions account for total banana pixels
    const top3Size = regions.slice(0, 3).reduce((sum, r) => sum + r.cells.length, 0);
    const totalBananaCells = regions.reduce((sum, r) => sum + r.cells.length, 0);
    const concentration = top3Size / Math.max(totalBananaCells, 1);
    if (concentration >= 0.7) score += 25;
    else if (concentration >= 0.5) score += 15;

    // Banana detected if score >= 50
    return { detected: score >= 50, score };
}

/**
 * Analyze banana ripeness from image data using HSV color space
 */
function analyzeBananaRipeness(imageData) {
    const data = imageData.data;
    const totalPixels = data.length / 4;
    const w = imageData.width;
    const h = imageData.height;

    // Step 1: Detect if there's a banana in the image
    const detection = detectBanana(imageData);

    // Step 2: Color analysis for ripeness
    let greenPixels = 0;
    let yellowGreenPixels = 0;
    let yellowPixels = 0;
    let brownPixels = 0;
    let bananaPixels = 0;
    let avgH = 0, avgS = 0, avgV = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (isBananaPixel(r, g, b)) {
            const hsv = rgbToHsv(r, g, b);
            bananaPixels++;
            avgH += hsv.h;
            avgS += hsv.s;
            avgV += hsv.v;

            // Green (Unripe): H 70-140
            if (hsv.h >= 70 && hsv.h <= 140 && hsv.s > 25) {
                greenPixels++;
            }
            // Yellow-Green (Ripening): H 50-70
            else if (hsv.h >= 48 && hsv.h < 70 && hsv.s > 25) {
                yellowGreenPixels++;
            }
            // Yellow (Ripe): H 30-55, high saturation, high brightness
            else if (hsv.h >= 25 && hsv.h < 55 && hsv.s > 30 && hsv.v > 40) {
                yellowPixels++;
            }
            // Brown (Overripe): low brightness or low saturation
            else if (
                (hsv.h >= 15 && hsv.h <= 50 && (hsv.v < 45 || hsv.s < 30)) ||
                (hsv.h >= 15 && hsv.h <= 40 && hsv.v < 55)
            ) {
                brownPixels++;
            }
        }
    }

    if (bananaPixels > 0) {
        avgH /= bananaPixels;
        avgS /= bananaPixels;
        avgV /= bananaPixels;
    }

    const total = Math.max(bananaPixels, 1);
    const greenPct = (greenPixels / total) * 100;
    const yellowGreenPct = (yellowGreenPixels / total) * 100;
    const yellowPct = (yellowPixels / total) * 100;
    const brownPct = (brownPixels / total) * 100;

    // Ripeness determination
    let status, statusClass, emoji, description, tips;
    const bananaRatio = bananaPixels / totalPixels;
    const confidence = Math.min(Math.round(detection.score + bananaRatio * 100), 95);

    const categories = [
        { key: 'unripe',   pct: greenPct },
        { key: 'ripening', pct: yellowGreenPct },
        { key: 'ripe',     pct: yellowPct },
        { key: 'overripe', pct: brownPct }
    ];
    const dominant = categories.reduce((a, b) => a.pct >= b.pct ? a : b);

    if (dominant.key === 'unripe') {
        status = 'ยังไม่สุก';
        statusClass = 'unripe';
        emoji = '🟢🍌';
        description = 'กล้วยยังเขียวอยู่ ต้องรออีกหลายวันกว่าจะสุก';
        tips = 'เก็บกล้วยไว้ในอุณหภูมิห้อง (25-28°C) เพื่อให้สุกเร็วขึ้น หรือใส่ถุงกระดาษปิดสนิทร่วมกับผลไม้ที่ปล่อยก๊าซเอทิลีน เช่น แอปเปิ้ล';
    } else if (dominant.key === 'ripening') {
        status = 'กำลังสุก';
        statusClass = 'ripening';
        emoji = '🟡🍌';
        description = 'กล้วยกำลังสุก เริ่มเปลี่ยนจากเขียวเป็นเหลือง';
        tips = 'อีกประมาณ 1-2 วัน กล้วยจะสุกเต็มที่ ถ้าต้องการชะลอการสุก ให้เก็บในตู้เย็น ผิวอาจจะดำแต่เนื้อข้างในจะยังคงสภาพดี';
    } else if (dominant.key === 'overripe') {
        status = 'สุกเกินไป';
        statusClass = 'overripe';
        emoji = '🟤🍌';
        description = 'กล้วยสุกเกินไปแล้ว มีจุดน้ำตาล เหมาะทำขนม';
        tips = 'กล้วยสุกเกินไปเหมาะสำหรับทำขนมปัง กล้วยทอด สมูทตี้ หรือไอศกรีมกล้วย! หากยังไม่ได้ใช้ ให้แกะเปลือกแล้วแช่แข็งเก็บไว้';
    } else {
        status = 'สุกแล้ว';
        statusClass = 'ripe';
        emoji = '🟠🍌';
        description = 'กล้วยสุกพอดี พร้อมรับประทาน! 🎉';
        tips = 'กล้วยสุกพอดีอุดมไปด้วยโพแทสเซียม วิตามินบี 6 และเส้นใยอาหาร เหมาะสำหรับรับประทานเลยตอนนี้ หรือเก็บในตู้เย็นเพื่อยืดอายุอีก 2-3 วัน';
    }

    return {
        status,
        statusClass,
        emoji,
        description,
        tips,
        confidence,
        bananaDetected: detection.detected,
        bananaScore: detection.score,
        colors: {
            green: Math.round(greenPct),
            yellowGreen: Math.round(yellowGreenPct),
            yellow: Math.round(yellowPct),
            brown: Math.round(brownPct)
        },
        breakdown: {
            unripe: Math.round(greenPct),
            ripening: Math.round(yellowGreenPct),
            ripe: Math.round(yellowPct),
            overripe: Math.round(brownPct)
        },
        avgHue: Math.round(avgH),
        avgSaturation: Math.round(avgS),
        avgBrightness: Math.round(avgV),
        bananaPixelRatio: Math.round(bananaRatio * 100)
    };
}

// ==================== DISPLAY RESULTS ====================

function displayResults(result, imageSrc) {
    const section = document.getElementById('resultsSection');
    section.classList.remove('hidden');

    // Main result
    document.getElementById('resultEmoji').textContent = result.emoji;
    
    const statusEl = document.getElementById('resultStatus');
    statusEl.textContent = result.status;
    statusEl.className = 'result-status ' + result.statusClass;

    document.getElementById('resultDescription').textContent = result.description;
    document.getElementById('resultsConfidence').textContent = `ความมั่นใจ ${result.confidence}%`;

    // Color bars
    const colorBars = document.getElementById('colorBars');
    colorBars.innerHTML = '';

    const colorData = [
        { label: 'เขียว', value: result.colors.green, class: 'green' },
        { label: 'เหลือง', value: result.colors.yellow + result.colors.yellowGreen, class: 'yellow' },
        { label: 'น้ำตาล', value: result.colors.brown, class: 'brown' }
    ];

    colorData.forEach(item => {
        const el = document.createElement('div');
        el.className = 'color-bar-item';
        el.innerHTML = `
            <div class="color-bar">
                <div class="color-bar-fill ${item.class}" style="width: 0%"></div>
            </div>
            <div class="color-bar-value">${item.value}%</div>
            <div class="color-bar-label">${item.label}</div>
        `;
        colorBars.appendChild(el);
    });

    // Animate color bars after a small delay
    setTimeout(() => {
        document.querySelectorAll('.color-bar-fill').forEach((bar, i) => {
            bar.style.width = colorData[i].value + '%';
        });
    }, 100);

    // Ripeness breakdown
    const breakdownItems = document.getElementById('breakdownItems');
    breakdownItems.innerHTML = '';

    const breakdownData = [
        { label: 'ยังไม่สุก', value: result.breakdown.unripe, class: 'unripe', icon: '🟢' },
        { label: 'กำลังสุก', value: result.breakdown.ripening, class: 'ripening', icon: '🟡' },
        { label: 'สุกแล้ว', value: result.breakdown.ripe, class: 'ripe', icon: '🟠' },
        { label: 'สุกเกินไป', value: result.breakdown.overripe, class: 'overripe', icon: '🟤' }
    ];

    breakdownData.forEach(item => {
        const el = document.createElement('div');
        el.className = 'breakdown-item';
        el.innerHTML = `
            <div class="breakdown-icon ${item.class}">${item.icon}</div>
            <div class="breakdown-info">
                <div class="breakdown-label">${item.label}</div>
                <div class="breakdown-bar">
                    <div class="breakdown-bar-fill ${item.class}" style="width: 0%"></div>
                </div>
            </div>
            <div class="breakdown-percent ${item.class}">${item.value}%</div>
        `;
        breakdownItems.appendChild(el);
    });

    // Animate breakdown bars
    setTimeout(() => {
        document.querySelectorAll('.breakdown-bar-fill').forEach((bar, i) => {
            bar.style.width = breakdownData[i].value + '%';
        });
    }, 300);

    // Tips
    document.getElementById('tipsText').textContent = result.tips;

    // Save to history
    saveToHistory(result, imageSrc);

    // Scroll to results
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== HISTORY ====================

function saveToHistory(result, imageSrc) {
    let history = JSON.parse(localStorage.getItem('bananaHistory') || '[]');

    // Create smaller thumbnail
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        canvas.width = 96;
        canvas.height = 96;
        // Center crop
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 96, 96);
        const thumb = canvas.toDataURL('image/jpeg', 0.6);

        history.unshift({
            status: result.status,
            statusClass: result.statusClass,
            emoji: result.emoji,
            confidence: result.confidence,
            thumbnail: thumb,
            timestamp: new Date().toISOString()
        });

        // Keep only last 10
        if (history.length > 10) history = history.slice(0, 10);

        localStorage.setItem('bananaHistory', JSON.stringify(history));
        renderHistory(history);
    };
    img.src = imageSrc;
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('bananaHistory') || '[]');
    renderHistory(history);
}

function renderHistory(history) {
    const list = document.getElementById('historyList');
    const clearBtn = document.getElementById('clearHistoryBtn');

    if (history.length === 0) {
        list.innerHTML = '<div class="history-empty"><p>ยังไม่มีประวัติการตรวจจับ</p></div>';
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = '';
    list.innerHTML = '';

    history.forEach(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
            <div class="history-thumb">
                <img src="${item.thumbnail}" alt="Banana">
            </div>
            <div class="history-info">
                <div class="history-status ${item.statusClass}">${item.status}</div>
                <div class="history-time">${timeStr} • ความมั่นใจ ${item.confidence}%</div>
            </div>
            <div class="history-emoji">${item.emoji}</div>
        `;
        list.appendChild(el);
    });
}

function clearHistory() {
    if (confirm('ล้างประวัติการตรวจจับทั้งหมด?')) {
        localStorage.removeItem('bananaHistory');
        loadHistory();
    }
}

// ==================== RESET ====================

function resetAll() {
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('noBananaSection').classList.add('hidden');

    document.getElementById('previewImage').src = '';
    document.getElementById('fileInput').value = '';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
