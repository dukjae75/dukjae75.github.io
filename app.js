// Guardians of Drum Beat - GoDB App
console.log("🛡️ GoDB v1.0.0 Loading...");

// PWA 기능
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered');
        } catch (error) {
            console.log('❌ Service Worker registration failed:', error);
        }
    });
}

// PWA 설치 프롬프트
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // 설치 버튼 추가
    const installBtn = document.createElement('button');
    installBtn.className = 'btn';
    installBtn.textContent = '📱 홈 화면에 설치';
    installBtn.onclick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('설치 선택:', outcome);
            deferredPrompt = null;
            installBtn.remove();
        }
    };
    document.body.appendChild(installBtn);
});

// 앱 설치 완료 이벤트
window.addEventListener('appinstalled', () => {
    console.log('🎉 GoDB가 설치되었습니다!');
});

// 기본 앱 기능
function startMonitoring() {
    alert('🎵 드럼 모니터링을 시작합니다!\n\n실제 드럼 감지 기능은 추후 업데이트에서 제공됩니다.');
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ GoDB 앱 준비 완료!');
    
    // 버튼 이벤트 연결
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        if (button.textContent.includes('Start Monitoring')) {
            button.onclick = startMonitoring;
        }
    });
});

// 모바일 최적화
function optimizeForMobile() {
    // iOS Safari 주소창 숨기기
    setTimeout(() => {
        window.scrollTo(0, 1);
    }, 100);
    
    // 화면 방향 잠금 시도
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {
            console.log('화면 방향 잠금 지원 안함');
        });
    }
}

window.addEventListener('load', optimizeForMobile);

console.log("🛡️ GoDB 로드 완료!");