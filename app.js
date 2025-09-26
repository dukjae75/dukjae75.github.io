// 전역 변수들
let isRecording = false;
let isCalibrating = false;
let calibrationStep = 'none'; // 'kick', 'snare', 'hihat', 'done'
let audioContext = null;
let analyser = null;
let stream = null;
let animationFrame = null;
let targetBPM = 120;
let currentBPM = 0;
let bpmHistory = [];
let beatInterval = [];
let lastBeatTime = null;
let drumSamples = {
    kick: null,
    snare: null,
    hihat: null
};
let drumLevels = {
    kick: 0,
    snare: 0,
    hihat: 0
};
let calibrationBuffer = [];
let calibrationProgress = 0;
let bpmChartData = [];
let chartCanvas = null;
let chartCtx = null;

// DOM 요소들
const elements = {
    targetBpm: document.getElementById('targetBpm'),
    currentBpm: document.getElementById('currentBpm'),
    accuracy: document.getElementById('accuracy'),
    accuracyFill: document.getElementById('accuracyFill'),
    monitorBtn: document.getElementById('monitorBtn'),
    calibrateBtn: document.getElementById('calibrateBtn'),
    calibrationMessage: document.getElementById('calibrationMessage'),
    progressContainer: document.getElementById('progressContainer'),
    progressFill: document.getElementById('progressFill'),
    kickStatus: document.getElementById('kickStatus'),
    snareStatus: document.getElementById('snareStatus'),
    hihatStatus: document.getElementById('hihatStatus'),
    totalBeats: document.getElementById('totalBeats'),
    avgBpm: document.getElementById('avgBpm'),
    bpmDiff: document.getElementById('bpmDiff'),
    status: document.getElementById('status'),
    kickFill: document.getElementById('kickFill'),
    kickValue: document.getElementById('kickValue'),
    snareFill: document.getElementById('snareFill'),
    snareValue: document.getElementById('snareValue'),
    hihatFill: document.getElementById('hihatFill'),
    hihatValue: document.getElementById('hihatValue'),
    bpmChart: document.getElementById('bpmChart'),
    minBpm: document.getElementById('minBpm'),
    maxBpm: document.getElementById('maxBpm')
};

// 차트 초기화
function initChart() {
    chartCanvas = elements.bpmChart;
    if (!chartCanvas) return;
    
    chartCtx = chartCanvas.getContext('2d');
    
    // 고해상도 대응
    const rect = chartCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;
    chartCtx.scale(dpr, dpr);
    
    // 부드러운 선 그리기 설정
    chartCtx.lineJoin = 'round';
    chartCtx.lineCap = 'round';
}

// 차트 그리기
function drawChart() {
    if (!chartCtx || !chartCanvas) return;
    
    const rect = chartCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 캔버스 초기화
    chartCtx.clearRect(0, 0, width, height);
    
    // 배경 그리기
    chartCtx.fillStyle = '#374151';
    chartCtx.fillRect(0, 0, width, height);
    
    if (bpmChartData.length < 2) {
        // 데이터가 없을 때 안내 텍스트
        chartCtx.fillStyle = '#9ca3af';
        chartCtx.font = '14px sans-serif';
        chartCtx.textAlign = 'center';
        chartCtx.fillText('Start monitoring to see the chart', width / 2, height / 2);
        chartCtx.textAlign = 'left';
        return;
    }
    
    // 최근 30개 데이터만 표시
    const displayData = bpmChartData.slice(-30);
    const minBPM = Math.min(targetBPM - 20, Math.min(...displayData) - 5);
    const maxBPM = Math.max(targetBPM + 20, Math.max(...displayData) + 5);
    
    // BPM 범위 업데이트
    elements.minBpm.textContent = Math.round(minBPM);
    elements.maxBpm.textContent = Math.round(maxBPM);
    
    // 그리드 라인 그리기
    chartCtx.strokeStyle = '#4b5563';
    chartCtx.lineWidth = 1;
    chartCtx.setLineDash([2, 2]);
    
    // 수평 그리드 (BPM 기준선)
    for (let i = 0; i <= 4; i++) {
        const bpm = minBPM + (maxBPM - minBPM) * (i / 4);
        const y = padding + chartHeight - (i / 4) * chartHeight;
        
        chartCtx.beginPath();
        chartCtx.moveTo(padding, y);
        chartCtx.lineTo(width - padding, y);
        chartCtx.stroke();
        
        // BPM 레이블
        chartCtx.fillStyle = '#9ca3af';
        chartCtx.font = '10px sans-serif';
        chartCtx.textAlign = 'right';
        chartCtx.fillText(Math.round(bpm).toString(), padding - 5, y + 3);
    }
    
    // 수직 그리드 (시간 축)
    const timeIntervals = 6;
    for (let i = 0; i <= timeIntervals; i++) {
        const x = padding + (i / timeIntervals) * chartWidth;
        
        chartCtx.beginPath();
        chartCtx.moveTo(x, padding);
        chartCtx.lineTo(x, height - padding);
        chartCtx.stroke();
    }
    
    chartCtx.setLineDash([]);
    
    // Target BPM 라인
    const targetY = padding + chartHeight - ((targetBPM - minBPM) / (maxBPM - minBPM)) * chartHeight;
    chartCtx.strokeStyle = '#06b6d4';
    chartCtx.lineWidth = 2;
    chartCtx.setLineDash([5, 5]);
    
    chartCtx.beginPath();
    chartCtx.moveTo(padding, targetY);
    chartCtx.lineTo(width - padding, targetY);
    chartCtx.stroke();
    
    chartCtx.setLineDash([]);
    
    // Current BPM 라인 그리기
    if (displayData.length > 1) {
        chartCtx.strokeStyle = '#10b981';
        chartCtx.lineWidth = 3;
        chartCtx.beginPath();
        
        displayData.forEach((bpm, index) => {
            const x = padding + (index / (displayData.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((bpm - minBPM) / (maxBPM - minBPM)) * chartHeight;
            
            if (index === 0) {
                chartCtx.moveTo(x, y);
            } else {
                chartCtx.lineTo(x, y);
            }
        });
        
        chartCtx.stroke();
        
        // 데이터 포인트
        chartCtx.fillStyle = '#10b981';
        displayData.forEach((bpm, index) => {
            const x = padding + (index / (displayData.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((bpm - minBPM) / (maxBPM - minBPM)) * chartHeight;
            
            chartCtx.beginPath();
            chartCtx.arc(x, y, 3, 0, 2 * Math.PI);
            chartCtx.fill();
        });
        
        // 현재 BPM 강조 표시
        if (displayData.length > 0) {
            const lastIndex = displayData.length - 1;
            const lastX = padding + (lastIndex / (displayData.length - 1)) * chartWidth;
            const lastY = padding + chartHeight - ((displayData[lastIndex] - minBPM) / (maxBPM - minBPM)) * chartHeight;
            
            // 큰 원으로 현재 값 강조
            chartCtx.fillStyle = '#10b981';
            chartCtx.beginPath();
            chartCtx.arc(lastX, lastY, 6, 0, 2 * Math.PI);
            chartCtx.fill();
            
            // 외곽선
            chartCtx.strokeStyle = '#ffffff';
            chartCtx.lineWidth = 2;
            chartCtx.beginPath();
            chartCtx.arc(lastX, lastY, 6, 0, 2 * Math.PI);
            chartCtx.stroke();
        }
    }
    
    chartCtx.textAlign = 'left';
}
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // iOS Safari 호환성을 위한 사용자 제스처 후 resume
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                sampleRate: 44100,
                channelCount: 1
            } 
        });
        
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        
        return true;
    } catch (error) {
        console.error('오디오 접근 오류:', error);
        alert('Microphone access permission is required.');
        return false;
    }
}

// 교차 상관 계산
function calculateCrossCorrelation(signal1, signal2) {
    // 입력 길이 제한으로 실시간 성능 향상
    const MAX_LEN = 2048;
    const minLength = Math.min(signal1.length, signal2.length, MAX_LEN);
    const correlation = [];
    let maxCorr = 0;
    
    for (let lag = 0; lag < Math.floor(minLength / 2); lag++) {
        let sum = 0;
        for (let i = 0; i < minLength - lag; i++) {
            // 안전하게 숫자로 변환
            const a = Number(signal1[i]) || 0;
            const b = Number(signal2[i + lag]) || 0;
            sum += a * b;
        }
        correlation[lag] = sum;
        maxCorr = Math.max(maxCorr, Math.abs(sum));
    }
    
    return maxCorr > 0 ? correlation.map(val => val / maxCorr) : correlation;
}

// 드럼 패턴 매칭
function matchDrumPattern(audioBuffer, drumType) {
    if (!drumSamples[drumType] || !audioBuffer.length) return 0;

    const correlation = calculateCrossCorrelation(drumSamples[drumType], audioBuffer);
    const maxCorrelation = Math.max(...correlation.map(Math.abs));
    
    const threshold = drumType === 'kick' ? 0.3 : drumType === 'snare' ? 0.25 : 0.2;
    return maxCorrelation > threshold ? maxCorrelation : 0;
}

// 캘리브레이션 메시지 업데이트
function updateCalibrationMessage() {
    const messages = {
        'kick': 'Play kick drum for 3 seconds...',
        'snare': 'Play snare drum for 3 seconds...',
        'hihat': 'Play hi-hat for 3 seconds...',
        'done': 'Calibration Complete!'
    };
    if (elements && elements.calibrationMessage) {
        elements.calibrationMessage.textContent = messages[calibrationStep] || '';
    }
}

// 드럼 상태 업데이트
function updateDrumStatus() {
    if (elements) {
        if (elements.kickStatus) elements.kickStatus.className = drumSamples.kick ? 'drum-badge active' : 'drum-badge inactive';
        if (elements.snareStatus) elements.snareStatus.className = drumSamples.snare ? 'drum-badge active' : 'drum-badge inactive';
        if (elements.hihatStatus) elements.hihatStatus.className = drumSamples.hihat ? 'drum-badge active' : 'drum-badge inactive';

        if (elements.kickStatus) elements.kickStatus.textContent = drumSamples.kick ? 'Kick Drum ✓' : 'Kick Drum';
        if (elements.snareStatus) elements.snareStatus.textContent = drumSamples.snare ? 'Snare ✓' : 'Snare';
        if (elements.hihatStatus) elements.hihatStatus.textContent = drumSamples.hihat ? 'Hi-Hat ✓' : 'Hi-Hat';

        // 모니터링 버튼 활성화 조건
        const hasAnySample = drumSamples.kick || drumSamples.snare || drumSamples.hihat;
        if (elements.monitorBtn) elements.monitorBtn.disabled = !hasAnySample || isCalibrating;
    }
}

// 캘리브레이션 처리
function handleCalibration() {
    if (!analyser || !isCalibrating) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);
    // 오디오 데이터 수집 (안전하게 샘플레이트 기반으로 계산)
    const chunk = Array.from(dataArray);
    calibrationBuffer.push(...chunk);
    calibrationProgress += chunk.length;

    const sampleRate = audioContext && audioContext.sampleRate ? audioContext.sampleRate : 44100;
    const totalSamples = Math.floor(sampleRate * 2.5); // 2.5초 기준
    const progress = Math.min(100, (calibrationProgress / totalSamples) * 100);
    if (elements && elements.progressFill) elements.progressFill.style.width = progress + '%';

    // 버퍼가 너무 커지지 않도록 제한 (안전장치)
    const maxBuffer = sampleRate * 5; // 최대 5초치
    if (calibrationBuffer.length > maxBuffer) {
        calibrationBuffer = calibrationBuffer.slice(-maxBuffer);
    }
    
    // 충분한 데이터가 수집되었을 때
    if (calibrationProgress >= totalSamples) {
    // 마지막 1초 데이터만 사용
    const sampleData = calibrationBuffer.slice(-Math.floor(sampleRate * 1)); // 1초분 데이터
        
        drumSamples[calibrationStep] = sampleData;
        calibrationBuffer = [];
        calibrationProgress = 0;
        
        // 다음 단계로 이동
        if (calibrationStep === 'kick') {
            calibrationStep = 'snare';
        } else if (calibrationStep === 'snare') {
            calibrationStep = 'hihat';
        } else if (calibrationStep === 'hihat') {
            calibrationStep = 'done';
            isCalibrating = false;
            
            elements.calibrationMessage.style.display = 'none';
            elements.progressContainer.style.display = 'none';
            elements.calibrateBtn.textContent = 'Re-Calibrate';
            elements.calibrateBtn.disabled = false;
            
            updateDrumStatus();
            return;
        }
        
        updateCalibrationMessage();
        elements.progressFill.style.width = '0%';
    }

    if (isCalibrating) {
        animationFrame = requestAnimationFrame(handleCalibration);
    }
}

// 드럼 감지
function detectDrum() {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    const currentBuffer = Array.from(dataArray.slice(0, 1024));

    // 패턴 매칭
    let detectionScores = {
        kick: matchDrumPattern(currentBuffer, 'kick'),
        snare: matchDrumPattern(currentBuffer, 'snare'),
        hihat: matchDrumPattern(currentBuffer, 'hihat')
    };

    // UI 업데이트
    drumLevels = {
        kick: Math.round(detectionScores.kick * 100),
        snare: Math.round(detectionScores.snare * 100),
        hihat: Math.round(detectionScores.hihat * 100)
    };

    updateDrumLevels();

    // 비트 감지
    const currentTime = Date.now();
    const kickThreshold = 0.3;
    const snareThreshold = 0.25;
    const hihatThreshold = 0.2;
    
    const isKickHit = detectionScores.kick > kickThreshold;
    const isSnareHit = detectionScores.snare > snareThreshold;
    const isHihatHit = detectionScores.hihat > hihatThreshold;
    
    const shouldDetectBeat = isKickHit || isSnareHit || (isHihatHit && !isKickHit && !isSnareHit);

    if (shouldDetectBeat) {
        // 최소 200ms 간격을 두어 더블감지 방지
        if (!lastBeatTime || currentTime - lastBeatTime > 200) {
            if (lastBeatTime) {
                const interval = currentTime - lastBeatTime;
                beatInterval = [...beatInterval, interval].slice(-8);

                if (beatInterval.length >= 4) {
                    const sortedIntervals = [...beatInterval].sort((a, b) => a - b);
                    const median = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
                    const validIntervals = beatInterval.filter(i => Math.abs(i - median) < median * 0.25);

                    if (validIntervals.length >= 3) {
                        const avgInterval = validIntervals.reduce((a, b) => a + b) / validIntervals.length;
                        const newBPM = Math.round(60000 / avgInterval);

                        if (newBPM >= 60 && newBPM <= 200) {
                            currentBPM = newBPM;

                            // 차트 데이터 업데이트
                            bpmChartData.push(newBPM);
                            if (bpmChartData.length > 100) {
                                bpmChartData = bpmChartData.slice(-50); // 최근 50개만 유지
                            }

                            bpmHistory = [...bpmHistory, {
                                time: Date.now(),
                                bpm: newBPM,
                                confidence: (detectionScores.kick + detectionScores.snare + detectionScores.hihat) / 3 * 100
                            }].slice(-50);

                            updateUI();
                            drawChart(); // 차트 업데이트
                        }
                    }
                }
            }

            // 마지막으로 감지된 비트 시간은 모든 계산 후에 업데이트
            lastBeatTime = currentTime;
        }
    }

    if (isRecording) {
        animationFrame = requestAnimationFrame(detectDrum);
    }
}

// UI 업데이트
function updateUI() {
    if (!elements) return;

    if (elements.currentBpm) elements.currentBpm.textContent = currentBPM;

    const bpmDifference = Math.abs(currentBPM - targetBPM);
    const accuracy = Math.max(0, 100 - (bpmDifference * 3));
    if (elements.accuracy) elements.accuracy.textContent = accuracy.toFixed(1) + '%';
    if (elements.accuracyFill) elements.accuracyFill.style.width = accuracy + '%';

    // 색상 변경
    if (elements.currentBpm && elements.accuracyFill) {
        if (bpmDifference <= 2) {
            elements.currentBpm.style.color = '#10b981';
            elements.accuracyFill.style.background = '#10b981';
        } else if (bpmDifference <= 5) {
            elements.currentBpm.style.color = '#eab308';
            elements.accuracyFill.style.background = '#eab308';
        } else {
            elements.currentBpm.style.color = '#ef4444';
            elements.accuracyFill.style.background = '#ef4444';
        }
    }

    if (elements.totalBeats) elements.totalBeats.textContent = bpmHistory.length;
    if (elements.avgBpm) elements.avgBpm.textContent = bpmHistory.length > 0 ? Math.round(bpmHistory.reduce((a, b) => a + b.bpm, 0) / bpmHistory.length) : 0;
    if (elements.bpmDiff) elements.bpmDiff.textContent = bpmDifference;
}

// 드럼 레벨 업데이트
function updateDrumLevels() {
    if (!elements) return;
    if (elements.kickValue) elements.kickValue.textContent = drumLevels.kick + '%';
    if (elements.kickFill) elements.kickFill.style.height = drumLevels.kick + '%';

    if (elements.snareValue) elements.snareValue.textContent = drumLevels.snare + '%';
    if (elements.snareFill) elements.snareFill.style.height = drumLevels.snare + '%';

    if (elements.hihatValue) elements.hihatValue.textContent = drumLevels.hihat + '%';
    if (elements.hihatFill) elements.hihatFill.style.height = drumLevels.hihat + '%';
}

// 캘리브레이션 시작
async function startCalibration() {
    const success = await initAudio();
    if (success) {
        isCalibrating = true;
        calibrationStep = 'kick';
        calibrationBuffer = [];
        calibrationProgress = 0;
        if (elements) {
            if (elements.calibrateBtn) elements.calibrateBtn.disabled = true;
            if (elements.calibrationMessage) elements.calibrationMessage.style.display = 'block';
            if (elements.progressContainer) elements.progressContainer.style.display = 'block';
            if (elements.progressFill) elements.progressFill.style.width = '0%';
        }

        updateCalibrationMessage();
        handleCalibration();
    }
}

// 모니터링 토글
async function toggleMonitoring() {
    if (!isRecording) {
        const success = await initAudio();
        if (success) {
            isRecording = true;
            bpmHistory = [];
            bpmChartData = []; // 차트 데이터 초기화
            currentBPM = 0;
            lastBeatTime = null;
            beatInterval = [];
            
            elements.monitorBtn.textContent = '■ Stop Monitoring';
            elements.monitorBtn.classList.add('recording');
            elements.status.textContent = 'ACTIVE';
            elements.status.style.color = '#10b981';
            
            // 차트 초기화 및 그리기
            initChart();
            drawChart();
            
            detectDrum();
        }
    } else {
        isRecording = false;
        // 애니메이션 프레임 취소 및 null 처리
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        // 스트림 트랙 정리
        if (stream) {
            try {
                stream.getTracks().forEach(track => track.stop());
            } catch (e) {
                console.warn('Error stopping tracks', e);
            }
            stream = null;
        }

        // 오디오 컨텍스트 닫기
        if (audioContext) {
            try {
                audioContext.close();
            } catch (e) {
                console.warn('Error closing audioContext', e);
            }
            audioContext = null;
            analyser = null;
        }

        if (elements.monitorBtn) elements.monitorBtn.textContent = '▶ Start Monitoring';
        if (elements.monitorBtn) elements.monitorBtn.classList.remove('recording');
        if (elements.status) {
            elements.status.textContent = 'STANDBY';
            elements.status.style.color = '#ef4444';
        }
    }
}

// 이벤트 리스너
if (elements.targetBpm) {
    elements.targetBpm.addEventListener('input', (e) => {
        targetBPM = parseInt(e.target.value);
        if (isRecording) {
            drawChart(); // Target BPM이 변경되면 차트 업데이트
        }
    });
}

if (elements.calibrateBtn) elements.calibrateBtn.addEventListener('click', startCalibration);
if (elements.monitorBtn) elements.monitorBtn.addEventListener('click', toggleMonitoring);

// 화면 리사이즈 시 차트 업데이트
window.addEventListener('resize', () => {
    if (isRecording && chartCanvas) {
        setTimeout(() => {
            initChart();
            drawChart();
        }, 100);
    }
});

// PWA 설치 관련
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installButton = document.getElementById('installButton');
const closePrompt = document.getElementById('closePrompt');

// PWA 설치 가능 이벤트
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPrompt.style.display = 'flex';
});

// 설치 버튼 클릭
installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Installation choice: ${outcome}`);
        deferredPrompt = null;
        installPrompt.style.display = 'none';
    }
});

// 프롬프트 닫기
closePrompt.addEventListener('click', () => {
    installPrompt.style.display = 'none';
});

// PWA 설치 완료
window.addEventListener('appinstalled', () => {
    console.log('PWA has been installed');
    installPrompt.style.display = 'none';
});

// 서비스 워커 등록
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swCode = `
            const CACHE_NAME = 'drum-tempo-v2';
            const urlsToCache = [
                '/',
                '/index.html',
                '/app.js',
                '/manifest.json',
                '/icon-192.png'
            ];

            self.addEventListener('install', (event) => {
                event.waitUntil(
                    caches.open(CACHE_NAME).then(async (cache) => {
                        try {
                            await cache.addAll(urlsToCache);
                        } catch (e) {
                            // 일부 파일이 없을 경우 전체 설치 실패를 방지
                            console.warn('Some resources failed to cache during install', e);
                        }
                    })
                );
            });

            self.addEventListener('fetch', (event) => {
                event.respondWith(
                    caches.match(event.request).then((response) => {
                        return response || fetch(event.request).catch(() => {});
                    })
                );
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then((registration) => {
                console.log('ServiceWorker registration successful:', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// 화면 방향 및 모바일 최적화
function optimizeForMobile() {
    // 화면 방향 잠금 시도
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {
            console.log('Screen orientation lock not supported');
        });
    }
    
    // 주소창 숨기기
    setTimeout(() => {
        window.scrollTo(0, 1);
    }, 100);
    
    // iOS Safari 상단 바 최적화
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        document.body.style.paddingTop = 'env(safe-area-inset-top)';
        document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
    }
}

// 앱 상태 관리
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isRecording) {
        console.log('App moved to background but continues to run...');
    } else if (!document.hidden && isRecording) {
        console.log('Returned to foreground');
    }
});

// 터치 이벤트 최적화
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('touchmove', (e) => {
    // 페이지 스크롤 방지: 모니터링 중일 때만 전체 스크롤 차단
    try {
        if (isRecording && e.target === document.body) {
            e.preventDefault();
        }
    } catch (err) {
        // 안전하게 예외 무시
    }
}, { passive: false });

// 초기화
window.addEventListener('load', () => {
    optimizeForMobile();

    // 안전하게 요소들이 존재하는지 확인한 뒤 초기화 수행
    try {
        if (elements) {
            if (typeof updateDrumStatus === 'function') updateDrumStatus();
        }

        // 차트 초기화
        setTimeout(() => {
            initChart();
            drawChart();
        }, 100);
    } catch (err) {
        console.warn('Initialization warning:', err);
    }
});

// 오디오 컨텍스트 자동 재개 (iOS Safari 대응)
document.addEventListener('touchstart', async () => {
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
}, { once: true });
