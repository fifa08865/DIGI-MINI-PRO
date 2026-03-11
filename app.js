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

// ==================== IMAGE ANALYSIS ====================

function analyzeImage() {
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

    // Process image on canvas
    const canvas = document.getElementById('analysisCanvas');
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        // Scale down for performance
        const maxSize = 300;
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

        const imageData = ctx.getImageData(0, 0, w, h);
        const result = analyzeBananaRipeness(imageData);

        // Finish loading animation
        clearInterval(loadingInterval);
        loadingFill.style.width = '100%';

        setTimeout(() => {
            document.getElementById('loadingSection').classList.add('hidden');
            displayResults(result, previewImage.src);
        }, 500);
    };
    img.src = previewImage.src;
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
 * Analyze banana ripeness from image data using HSV color space
 */
function analyzeBananaRipeness(imageData) {
    const data = imageData.data;
    const totalPixels = data.length / 4;

    // Color counters
    let greenPixels = 0;
    let yellowGreenPixels = 0;
    let yellowPixels = 0;
    let brownPixels = 0;
    let bananaPixels = 0;

    // Dominant color tracking
    let avgH = 0, avgS = 0, avgV = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const hsv = rgbToHsv(r, g, b);

        // Filter out background pixels (very dark, very bright white, very low saturation)
        const isBananaCandidate = hsv.s > 15 && hsv.v > 15 && hsv.v < 97;

        // Banana-like colors: green to yellow to brown range
        const isBananaColor = (
            (hsv.h >= 15 && hsv.h <= 160 && hsv.s > 20 && hsv.v > 20) ||
            // Brown/overripe
            (hsv.h >= 15 && hsv.h <= 45 && hsv.s > 15 && hsv.v > 10 && hsv.v < 60)
        );

        if (isBananaCandidate && isBananaColor) {
            bananaPixels++;
            avgH += hsv.h;
            avgS += hsv.s;
            avgV += hsv.v;

            // Green (Unripe): H 70-150, high saturation
            if (hsv.h >= 70 && hsv.h <= 160 && hsv.s > 25) {
                greenPixels++;
            }
            // Yellow-Green (Ripening): H 50-75
            else if (hsv.h >= 48 && hsv.h < 70 && hsv.s > 25) {
                yellowGreenPixels++;
            }
            // Yellow (Ripe): H 30-55, high saturation, high brightness
            else if (hsv.h >= 30 && hsv.h < 55 && hsv.s > 35 && hsv.v > 50) {
                yellowPixels++;
            }
            // Brown (Overripe): low brightness or low saturation in yellow-orange range
            else if (
                (hsv.h >= 15 && hsv.h <= 50 && (hsv.v < 45 || hsv.s < 30)) ||
                (hsv.h >= 15 && hsv.h <= 40 && hsv.v < 55)
            ) {
                brownPixels++;
            }
        }
    }

    // Calculate averages
    if (bananaPixels > 0) {
        avgH /= bananaPixels;
        avgS /= bananaPixels;
        avgV /= bananaPixels;
    }

    // Calculate percentages
    const total = Math.max(bananaPixels, 1);
    const greenPct = (greenPixels / total) * 100;
    const yellowGreenPct = (yellowGreenPixels / total) * 100;
    const yellowPct = (yellowPixels / total) * 100;
    const brownPct = (brownPixels / total) * 100;

    // Determine ripeness level
    let status, statusClass, emoji, description, tips;
    const bananaRatio = bananaPixels / totalPixels;

    // Confidence based on how many banana-like pixels we found
    const confidence = Math.min(Math.round(bananaRatio * 300), 95);

    // Determine ripeness by finding the category with the highest percentage
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

    document.getElementById('previewImage').src = '';
    document.getElementById('fileInput').value = '';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
