class AppleGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectionBox = document.getElementById('selectionBox');
        
        // Game configuration - changed to portrait orientation for better mobile/desktop experience
        this.COLS = 10;  // 가로 10개
        this.ROWS = 17;  // 세로 17개
        this.APPLE_SIZE = 32;
        this.APPLE_SPACING = 38;
        this.GAME_TIME = 60;
        
        // Apple images
        this.appleImages = {};
        this.imagesLoaded = false;
        
        // Game state
        this.board = [];
        this.score = 0;
        this.timeLeft = this.GAME_TIME;
        this.gameRunning = false;
        this.gameTimer = null;
        this.clickCount = 0;
        
        // New features
        this.combo = 0;
        this.maxCombo = 0;
        this.skillsRemaining = {
            hint: 3,
            timeStop: 1,
            shuffle: 2
        };
        this.isTimeStopActive = false;
        
        // Selection state
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.selectedApples = new Set();
        
        this.initCanvas();
        this.loadImages();
        this.bindEvents();
        this.initBoard();
        this.render();
        this.startRenderLoop();
    }
    
    initCanvas() {
        // Determine if mobile based on viewport
        const isMobile = window.innerWidth <= 768;
        
        // Fixed spacing and sizes for consistent gameplay
        if (isMobile) {
            // Mobile: Smaller apples, tighter spacing
            this.APPLE_SPACING = 28;
            this.APPLE_SIZE = 24;
        } else {
            // Desktop: Larger apples, normal spacing  
            this.APPLE_SPACING = 38;
            this.APPLE_SIZE = 32;
        }
        
        // Calculate canvas dimensions based on grid
        const canvasWidth = this.COLS * this.APPLE_SPACING + 40;
        const canvasHeight = this.ROWS * this.APPLE_SPACING + 40;
        
        // Get device pixel ratio for high-DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Set canvas internal resolution (scaled for high-DPI)
        this.canvas.width = canvasWidth * devicePixelRatio;
        this.canvas.height = canvasHeight * devicePixelRatio;
        
        // Get container width to scale canvas display size
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        
        // Calculate scale to fit container while maintaining aspect ratio
        const maxDisplayWidth = Math.min(containerWidth * 0.95, 600);
        const scale = Math.min(maxDisplayWidth / canvasWidth, 1);
        
        // Set display size while maintaining aspect ratio
        this.canvas.style.width = (canvasWidth * scale) + 'px';
        this.canvas.style.height = (canvasHeight * scale) + 'px';
        
        // Scale the context to match device pixel ratio
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        
        // Store scale for mouse position calculations
        this.displayScale = scale;
        this.devicePixelRatio = devicePixelRatio;
    }
    
    loadImages() {
        const imageTypes = ['normal', 'golden', 'time', 'wild', 'bomb'];
        let loadedCount = 0;
        
        imageTypes.forEach(type => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === imageTypes.length) {
                    this.imagesLoaded = true;
                    this.render(); // Re-render when all images are loaded
                }
            };
            img.src = `apple-${type}.png`;
            this.appleImages[type] = img;
        });
    }
    
    initBoard() {
        this.board = [];
        for (let row = 0; row < this.ROWS; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.COLS; col++) {
                const appleData = this.generateApple(col, row);
                this.board[row][col] = appleData;
            }
        }
    }
    
    updateApplePositions() {
        // Update apple positions when canvas is resized
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const apple = this.board[row][col];
                apple.x = col * this.APPLE_SPACING + 20;
                apple.y = row * this.APPLE_SPACING + 20;
            }
        }
    }
    
    generateApple(col, row) {
        const rand = Math.random();
        let appleType = 'normal';
        let value = Math.floor(Math.random() * 9) + 1;
        
        // Special apple probabilities
        if (rand < 0.01) { // 1% - Bomb apple
            appleType = 'bomb';
            value = Math.floor(Math.random() * 9) + 1; // Normal number but special effect
        } else if (rand < 0.03) { // 2% - Wild apple
            appleType = 'wild';
            value = Math.floor(Math.random() * 9) + 1; // Normal number but acts as any value
        } else if (rand < 0.06) { // 3% - Time apple
            appleType = 'time';
            value = Math.floor(Math.random() * 9) + 1; // Normal number but gives time bonus
        } else if (rand < 0.11) { // 5% - Golden apple
            appleType = 'golden';
            // value already set above for golden apples
        }
        
        return {
            value: value,
            x: col * this.APPLE_SPACING + 20,
            y: row * this.APPLE_SPACING + 20,
            visible: true,
            selected: false,
            falling: false,
            type: appleType
        };
    }
    
    bindEvents() {
        const startBtn = document.getElementById('startBtn');
        startBtn.addEventListener('click', () => this.startGame());
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Window resize event for responsive canvas
        window.addEventListener('resize', () => {
            this.initCanvas();
            this.updateApplePositions();
            this.render();
        });
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {},
                type: 'touchstart'
            });
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {},
                type: 'touchmove'
            });
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.onMouseUp({
                preventDefault: () => {},
                type: 'touchend'
            });
        }, { passive: false });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    startGame() {
        this.gameRunning = true;
        this.score = 0;
        this.timeLeft = this.GAME_TIME;
        this.clickCount = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.skillsRemaining = { hint: 3, timeStop: 1, shuffle: 2 };
        this.isTimeStopActive = false;
        this.updateDisplay();
        
        document.getElementById('startBtn').textContent = '게임 중...';
        document.getElementById('startBtn').disabled = true;
        
        this.initBoard();
        this.render();
        
        this.gameTimer = setInterval(() => {
            if (!this.isTimeStopActive) {
                this.timeLeft--;
                this.updateDisplay();
                
                if (this.timeLeft <= 0) {
                    this.endGame();
                }
            }
        }, 1000);
    }
    
    endGame() {
        this.gameRunning = false;
        clearInterval(this.gameTimer);
        
        document.getElementById('startBtn').textContent = '게임 시작';
        document.getElementById('startBtn').disabled = false;
        
        this.showGameOver();
    }
    
    showGameOver() {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.className = 'game-over';
        gameOverDiv.id = 'gameOverScreen';
        const playedTime = this.GAME_TIME - this.timeLeft;
        const efficiency = this.clickCount > 0 ? Math.round((this.score / (this.clickCount * 10)) * 100) : 0;
        
        gameOverDiv.innerHTML = `
            <div class="game-over-content">
                <h2>🍮 게임 끝! 🍮</h2>
                <div class="final-stats">
                    <div class="stat-item">
                        <span class="stat-label">최종 점수</span>
                        <span class="stat-value">${this.score}점</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">플레이 시간</span>
                        <span class="stat-value">${playedTime}초</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">클릭 횟수</span>
                        <span class="stat-value">${this.clickCount}회</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">효율성</span>
                        <span class="stat-value">${efficiency}%</span>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="share-btn" onclick="window.gameInstance.shareResult()">📤 공유하기</button>
                    <button class="restart-btn" onclick="location.reload()">🔄 다시 시작</button>
                </div>
            </div>
        `;
        document.body.appendChild(gameOverDiv);
    }
    
    async shareResult() {
        try {
            // HTML2Canvas 라이브러리가 없으므로 캔버스 스크린샷 사용
            const gameContainer = document.querySelector('.game-container');
            
            // Canvas 스크린샷 생성
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 고해상도로 설정
            const scale = 2;
            canvas.width = 400 * scale;
            canvas.height = 600 * scale;
            ctx.scale(scale, scale);
            
            // 배경 그리기
            const gradient = ctx.createLinearGradient(0, 0, 400, 600);
            gradient.addColorStop(0, '#ff9a9e');
            gradient.addColorStop(1, '#fecfef');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 400, 600);
            
            // 제목
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🍮 젤리게임 결과 🍮', 200, 60);
            
            // 통계 박스
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(40, 100, 320, 400);
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 100, 320, 400);
            
            // 통계 텍스트
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            
            const playedTime = this.GAME_TIME - this.timeLeft;
            const efficiency = this.clickCount > 0 ? Math.round((this.score / (this.clickCount * 10)) * 100) : 0;
            
            ctx.fillText('📊 최종 통계', 60, 150);
            ctx.font = '20px Arial';
            ctx.fillText(`최종 점수: ${this.score}점`, 60, 200);
            ctx.fillText(`플레이 시간: ${playedTime}초`, 60, 240);
            ctx.fillText(`클릭 횟수: ${this.clickCount}회`, 60, 280);
            ctx.fillText(`효율성: ${efficiency}%`, 60, 320);
            
            // 사과 아이콘들
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.ellipse(80 + i * 60, 380, 20, 22, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#2d5016';
                ctx.fillRect(78 + i * 60, 360, 4, 8);
            }
            
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('사과게임에서 플레이했어요!', 200, 450);
            
            // Canvas를 blob으로 변환
            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'apple-game-result.png', { type: 'image/png' });
                
                // Web Share API 지원 확인
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: '🍎 사과게임 결과',
                        text: `점수: ${this.score}점, 시간: ${playedTime}초, 클릭: ${this.clickCount}회, 효율성: ${efficiency}%`,
                        files: [file]
                    });
                } else {
                    // 폴백: 다운로드
                    const link = document.createElement('a');
                    link.download = 'apple-game-result.png';
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    
                    // 텍스트 공유를 위한 클립보드 복사
                    const shareText = `🍎 사과게임 결과!\n점수: ${this.score}점\n시간: ${playedTime}초\n클릭: ${this.clickCount}회\n효율성: ${efficiency}%\n\n사과게임에서 플레이했어요! 🎮`;
                    
                    if (navigator.clipboard) {
                        await navigator.clipboard.writeText(shareText);
                        alert('결과가 클립보드에 복사되었습니다! 스크린샷도 다운로드됩니다.');
                    } else {
                        alert('스크린샷이 다운로드됩니다!');
                    }
                }
            }, 'image/png');
            
        } catch (error) {
            console.error('공유 중 오류:', error);
            alert('공유 기능을 사용할 수 없습니다. 스크린샷을 직접 찍어 주세요.');
        }
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('timer').textContent = this.timeLeft;
        document.getElementById('combo').textContent = this.combo;
        
        // Update timer progress bar
        const progress = (this.timeLeft / this.GAME_TIME) * 100;
        const timerProgress = document.getElementById('timerProgress');
        timerProgress.style.width = progress + '%';
        
        // Update skill counts
        document.getElementById('hintCount').textContent = this.skillsRemaining.hint;
        document.getElementById('timeStopCount').textContent = this.skillsRemaining.timeStop;
        document.getElementById('shuffleCount').textContent = this.skillsRemaining.shuffle;
        
        // Disable buttons when no uses left
        document.getElementById('hintBtn').disabled = this.skillsRemaining.hint <= 0;
        document.getElementById('timeStopBtn').disabled = this.skillsRemaining.timeStop <= 0;
        document.getElementById('shuffleBtn').disabled = this.skillsRemaining.shuffle <= 0;
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    onMouseDown(e) {
        if (!this.gameRunning) return;
        
        const pos = this.getMousePos(e);
        this.isSelecting = true;
        this.startX = pos.x;
        this.startY = pos.y;
        this.currentX = pos.x;
        this.currentY = pos.y;
        
        this.clearSelection();
        this.updateSelectionBox();
    }
    
    onMouseMove(e) {
        if (!this.isSelecting || !this.gameRunning) return;
        
        const pos = this.getMousePos(e);
        this.currentX = pos.x;
        this.currentY = pos.y;
        
        this.updateSelectionBox();
        this.updateSelectedApples();
    }
    
    onMouseUp(e) {
        if (!this.isSelecting || !this.gameRunning) return;
        
        this.isSelecting = false;
        this.selectionBox.style.display = 'none';
        this.clickCount++; // Count each selection attempt
        
        this.processSelection();
    }
    
    updateSelectionBox() {
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        // Position relative to the game board container
        const container = document.querySelector('.game-board-container');
        const containerRect = container.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Apply scale to convert from canvas coordinates to display coordinates
        const scaleX = canvasRect.width / this.canvas.width;
        const scaleY = canvasRect.height / this.canvas.height;
        
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = (canvasRect.left - containerRect.left + left * scaleX) + 'px';
        this.selectionBox.style.top = (canvasRect.top - containerRect.top + top * scaleY) + 'px';
        this.selectionBox.style.width = (width * scaleX) + 'px';
        this.selectionBox.style.height = (height * scaleY) + 'px';
    }
    
    updateSelectedApples() {
        this.clearSelection();
        
        const selectionRect = {
            left: Math.min(this.startX, this.currentX),
            top: Math.min(this.startY, this.currentY),
            right: Math.max(this.startX, this.currentX),
            bottom: Math.max(this.startY, this.currentY)
        };
        
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const apple = this.board[row][col];
                if (!apple.visible || apple.falling) continue;
                
                const appleRect = {
                    left: apple.x,
                    top: apple.y,
                    right: apple.x + this.APPLE_SIZE,
                    bottom: apple.y + this.APPLE_SIZE
                };
                
                if (this.isRectIntersect(selectionRect, appleRect)) {
                    apple.selected = true;
                    this.selectedApples.add(`${row}-${col}`);
                }
            }
        }
        
        this.render();
    }
    
    isRectIntersect(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    clearSelection() {
        this.selectedApples.clear();
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                this.board[row][col].selected = false;
            }
        }
    }
    
    processSelection() {
        if (this.selectedApples.size < 2) {
            this.clearSelection();
            this.render();
            return;
        }
        
        let sum = 0;
        const selectedPositions = [];
        let hasSpecialApples = false;
        let specialEffects = [];
        
        // First pass: collect all apples and calculate sum without wild apples
        const normalApples = [];
        const wildApples = [];
        
        for (const pos of this.selectedApples) {
            const [row, col] = pos.split('-').map(Number);
            const apple = this.board[row][col];
            selectedPositions.push({row, col, apple});
            
            if (apple.type === 'wild') {
                wildApples.push({row, col, apple});
                hasSpecialApples = true;
            } else if (apple.type === 'bomb') {
                // Bomb apple - explodes and removes surrounding area
                specialEffects.push({type: 'bomb', row, col});
                sum += parseInt(apple.value) || 0;
                hasSpecialApples = true;
            } else if (apple.type === 'time') {
                // Time apple - adds time bonus
                specialEffects.push({type: 'time', row, col});
                sum += parseInt(apple.value) || 0;
                hasSpecialApples = true;
            } else {
                sum += parseInt(apple.value) || 0;
                normalApples.push({row, col, apple});
            }
        }
        
        // Handle wild apples: they collectively make the total sum = 10
        if (wildApples.length > 0) {
            const neededTotal = 10 - sum; // How much we need from all wild apples combined
            
            if (neededTotal >= wildApples.length && neededTotal <= wildApples.length * 9) {
                // We can distribute the needed total among wild apples (each wild = 1-9)
                sum = 10; // Wild apples will make it exactly 10
            } else {
                // Cannot make exactly 10, keep original sum from normal apples only
                // Wild apples will use their actual values
                wildApples.forEach(wild => {
                    sum += parseInt(wild.apple.value) || 1;
                });
            }
        }
        
        if (sum === 10) {
            // Success! Apply combo and special effects
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            
            // Calculate score with combo multiplier
            let baseScore = selectedPositions.length * 10;
            let comboMultiplier = 1;
            if (this.combo >= 2) comboMultiplier = 1.5;
            if (this.combo >= 4) comboMultiplier = 2;
            if (this.combo >= 6) comboMultiplier = 2.5;
            if (this.combo >= 8) comboMultiplier = 3;
            
            // Golden apple bonus
            selectedPositions.forEach(({apple}) => {
                if (apple.type === 'golden') {
                    baseScore *= 2;
                }
            });
            
            const finalScore = Math.round(baseScore * comboMultiplier);
            this.score += finalScore;
            
            // Apply special effects
            specialEffects.forEach(effect => {
                if (effect.type === 'time') {
                    this.timeLeft += 5;
                    this.showAppleEffect('+5초!', '#4ade80', effect.row, effect.col, '⏰');
                } else if (effect.type === 'bomb') {
                    this.explodeBomb(effect.row, effect.col);
                }
            });
            
            // Show golden apple effects at their positions
            selectedPositions.forEach(({row, col, apple}) => {
                if (apple.type === 'golden') {
                    this.showAppleEffect('2X점수!', '#ffd700', row, col, '✨');
                }
            });
            
            // Show combo and score
            if (this.combo > 1) {
                this.showCombo(this.combo, comboMultiplier);
            }
            
            this.removeApples(selectedPositions.map(p => ({row: p.row, col: p.col})));
            this.updateDisplay();
        } else {
            // Failed - reset combo
            this.combo = 0;
        }
        
        this.clearSelection();
        this.render();
        
        // Check game end conditions
        setTimeout(() => {
            if (this.gameRunning) {
                if (this.areAllApplesGone()) {
                    this.endGame();
                } else if (!this.hasPossibleMoves()) {
                    this.shuffleRemainingApples();
                }
            }
        }, 1000);
    }
    
    removeApples(positions) {
        // Play pop sound effect
        this.playPopSound();
        
        // Start pop animation
        positions.forEach(({row, col}, index) => {
            const apple = this.board[row][col];
            apple.falling = true;
            apple.selected = false;
            apple.animationStartTime = Date.now() + (index * 50); // Very quick stagger
        });
        
        // Remove apples after animation
        setTimeout(() => {
            positions.forEach(({row, col}) => {
                this.board[row][col].visible = false;
                this.board[row][col].falling = false;
                this.board[row][col].value = 0;
                delete this.board[row][col].animationStartTime;
            });
            
            this.render();
        }, 400); // Quick snappy animation
    }
    
    playPopSound() {
        // Create audio context for pop sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Pop sound parameters
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Fallback for browsers that don't support Web Audio API
            console.log('Pop!');
        }
    }
    
    
    areAllApplesGone() {
        // Check if any visible apples remain
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[row][col].visible) {
                    return false;
                }
            }
        }
        return true;
    }
    
    hasPossibleMoves() {
        // Check all possible rectangular selections for sum of 10
        for (let startRow = 0; startRow < this.ROWS; startRow++) {
            for (let startCol = 0; startCol < this.COLS; startCol++) {
                for (let endRow = startRow; endRow < this.ROWS; endRow++) {
                    for (let endCol = startCol; endCol < this.COLS; endCol++) {
                        const apples = [];
                        
                        // Collect apples in this rectangular selection
                        for (let row = startRow; row <= endRow; row++) {
                            for (let col = startCol; col <= endCol; col++) {
                                if (this.board[row][col].visible) {
                                    apples.push(this.board[row][col].value);
                                }
                            }
                        }
                        
                        // Check if this selection can make sum of 10
                        if (apples.length >= 2 && apples.reduce((sum, val) => sum + val, 0) === 10) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    shuffleRemainingApples() {
        // Show shuffle notification
        this.showShuffleNotification();
        
        // Collect all visible apples positions
        const visibleApples = [];
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[row][col].visible) {
                    visibleApples.push({row, col});
                }
            }
        }
        
        // Generate new random values for visible apples
        visibleApples.forEach(({row, col}) => {
            this.board[row][col].value = Math.floor(Math.random() * 9) + 1;
        });
        
        // Add shuffle animation
        setTimeout(() => {
            this.render();
        }, 500);
    }
    
    showShuffleNotification() {
        // Create shuffle notification
        const notification = document.createElement('div');
        notification.className = 'shuffle-notification';
        notification.innerHTML = `
            <div class="shuffle-content">
                <span class="shuffle-icon">🔄</span>
                <span class="shuffle-text">사과 재배치!</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }
    
    explodeBomb(centerRow, centerCol) {
        // Show explosion visual effect
        this.showExplosion(centerRow, centerCol);
        
        // Remove 3x3 area around bomb
        const bombPositions = [];
        for (let row = centerRow - 1; row <= centerRow + 1; row++) {
            for (let col = centerCol - 1; col <= centerCol + 1; col++) {
                if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
                    if (this.board[row][col].visible) {
                        bombPositions.push({row, col});
                        this.board[row][col].falling = true;
                        this.board[row][col].selected = false;
                        this.board[row][col].animationStartTime = Date.now();
                    }
                }
            }
        }
        
        // Remove exploded apples after animation
        setTimeout(() => {
            bombPositions.forEach(({row, col}) => {
                this.board[row][col].visible = false;
                this.board[row][col].falling = false;
                this.board[row][col].value = 0;
            });
            this.render();
        }, 400);
        
        this.showBombExplosion('BOOM!', '#ff6b6b', centerRow, centerCol);
    }
    
    showExplosion(centerRow, centerCol) {
        // Create explosion effect on canvas
        const apple = this.board[centerRow][centerCol];
        const centerX = apple.x + this.APPLE_SIZE / 2;
        const centerY = apple.y + this.APPLE_SIZE / 2;
        
        // Draw explosion effect
        this.ctx.save();
        this.ctx.globalAlpha = 0.8;
        
        // Multiple explosion rings
        for (let ring = 0; ring < 3; ring++) {
            const radius = 30 + ring * 15;
            const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, '#fff200');
            gradient.addColorStop(0.3, '#ff6b00');
            gradient.addColorStop(0.7, '#ff0000');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    showCombo(combo, multiplier) {
        const comboDiv = document.createElement('div');
        comboDiv.className = 'combo-display';
        comboDiv.innerHTML = `
            <div class="combo-text">
                <div class="combo-number">${combo} COMBO!</div>
                <div class="combo-multiplier">${multiplier}x</div>
            </div>
        `;
        document.body.appendChild(comboDiv);
        
        setTimeout(() => {
            if (comboDiv.parentNode) {
                comboDiv.parentNode.removeChild(comboDiv);
            }
        }, 2000);
    }
    
    showBonus(text, color) {
        const bonusDiv = document.createElement('div');
        bonusDiv.className = 'bonus-display';
        bonusDiv.style.color = color;
        bonusDiv.textContent = text;
        document.body.appendChild(bonusDiv);
        
        setTimeout(() => {
            if (bonusDiv.parentNode) {
                bonusDiv.parentNode.removeChild(bonusDiv);
            }
        }, 2000);
    }
    
    showBombExplosion(text, color, row, col) {
        const apple = this.board[row][col];
        const canvasRect = this.canvas.getBoundingClientRect();
        const centerX = apple.x + this.APPLE_SIZE / 2;
        const centerY = apple.y + this.APPLE_SIZE / 2;
        
        const explosionDiv = document.createElement('div');
        explosionDiv.className = 'bomb-explosion-display';
        explosionDiv.innerHTML = `
            <div class="bomb-explosion-content">
                <span class="bomb-explosion-icon">💥</span>
                <span class="bomb-explosion-text">${text}</span>
            </div>
        `;
        
        // Position at bomb location
        explosionDiv.style.position = 'fixed';
        explosionDiv.style.left = (canvasRect.left + centerX) + 'px';
        explosionDiv.style.top = (canvasRect.top + centerY) + 'px';
        explosionDiv.style.transform = 'translate(-50%, -50%)';
        explosionDiv.style.zIndex = '2500';
        explosionDiv.style.pointerEvents = 'none';
        
        document.body.appendChild(explosionDiv);
        
        setTimeout(() => {
            if (explosionDiv.parentNode) {
                explosionDiv.parentNode.removeChild(explosionDiv);
            }
        }, 1500);
    }
    
    showAppleEffect(text, color, row, col, icon = '') {
        const apple = this.board[row][col];
        const canvasRect = this.canvas.getBoundingClientRect();
        const centerX = apple.x + this.APPLE_SIZE / 2;
        const centerY = apple.y + this.APPLE_SIZE / 2;
        
        const effectDiv = document.createElement('div');
        effectDiv.className = 'apple-effect-display';
        effectDiv.innerHTML = `
            <div class="apple-effect-content">
                ${icon && `<span class="apple-effect-icon">${icon}</span>`}
                <span class="apple-effect-text">${text}</span>
            </div>
        `;
        
        // Position at apple location
        effectDiv.style.position = 'fixed';
        effectDiv.style.left = (canvasRect.left + centerX) + 'px';
        effectDiv.style.top = (canvasRect.top + centerY - 20) + 'px'; // Slightly above the apple
        effectDiv.style.transform = 'translate(-50%, -100%)';
        effectDiv.style.zIndex = '2400';
        effectDiv.style.pointerEvents = 'none';
        effectDiv.style.color = color;
        
        document.body.appendChild(effectDiv);
        
        setTimeout(() => {
            if (effectDiv.parentNode) {
                effectDiv.parentNode.removeChild(effectDiv);
            }
        }, 1200);
    }
    
    // Skill system
    useHint() {
        if (this.skillsRemaining.hint <= 0 || !this.gameRunning) return;
        
        this.skillsRemaining.hint--;
        this.updateDisplay();
        
        // Find and highlight a possible solution
        outerLoop: for (let startRow = 0; startRow < this.ROWS; startRow++) {
            for (let startCol = 0; startCol < this.COLS; startCol++) {
                for (let endRow = startRow; endRow < this.ROWS; endRow++) {
                    for (let endCol = startCol; endCol < this.COLS; endCol++) {
                        const apples = [];
                        const positions = [];
                        
                        for (let row = startRow; row <= endRow; row++) {
                            for (let col = startCol; col <= endCol; col++) {
                                if (this.board[row][col].visible) {
                                    apples.push(this.board[row][col].value);
                                    positions.push({row, col});
                                }
                            }
                        }
                        
                        if (apples.length >= 2 && apples.reduce((sum, val) => sum + (parseInt(val) || 0), 0) === 10) {
                            // Highlight hint apples
                            positions.forEach(({row, col}) => {
                                this.board[row][col].hint = true;
                            });
                            
                            // Remove hint after 3 seconds
                            setTimeout(() => {
                                positions.forEach(({row, col}) => {
                                    if (this.board[row] && this.board[row][col]) {
                                        this.board[row][col].hint = false;
                                    }
                                });
                                this.render();
                            }, 3000);
                            
                            this.render();
                            break outerLoop;
                        }
                    }
                }
            }
        }
        
        this.showBonus('💡 힌트!', '#fbbf24');
    }
    
    useTimeStop() {
        if (this.skillsRemaining.timeStop <= 0 || !this.gameRunning) return;
        
        this.skillsRemaining.timeStop--;
        this.isTimeStopActive = true;
        this.updateDisplay();
        
        this.showBonus('⏸️ 시간 정지!', '#8b5cf6');
        
        // Stop time for 5 seconds
        setTimeout(() => {
            this.isTimeStopActive = false;
            this.showBonus('⏯️ 시간 재개!', '#10b981');
        }, 5000);
    }
    
    useMagicShuffle() {
        if (this.skillsRemaining.shuffle <= 0 || !this.gameRunning) return;
        
        this.skillsRemaining.shuffle--;
        this.updateDisplay();
        this.shuffleRemainingApples();
        this.showBonus('🎲 매직 셔플!', '#f59e0b');
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background grid
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.COLS; i++) {
            const x = i * this.APPLE_SPACING + 20;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 20);
            this.ctx.lineTo(x, this.ROWS * this.APPLE_SPACING + 20);
            this.ctx.stroke();
        }
        
        for (let i = 0; i <= this.ROWS; i++) {
            const y = i * this.APPLE_SPACING + 20;
            this.ctx.beginPath();
            this.ctx.moveTo(20, y);
            this.ctx.lineTo(this.COLS * this.APPLE_SPACING + 20, y);
            this.ctx.stroke();
        }
        
        // Draw apples
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const apple = this.board[row][col];
                if (!apple.visible) continue;
                
                this.drawApple(apple, row, col);
            }
        }
    }
    
    drawStar(centerX, centerY, points, outerRadius, innerRadius) {
        this.ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + Math.cos(angle - Math.PI / 2) * radius;
            const y = centerY + Math.sin(angle - Math.PI / 2) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
    }
    
    drawApple(apple, row, col) {
        if (!this.imagesLoaded) return; // Wait until images are loaded
        
        const centerX = apple.x + this.APPLE_SIZE / 2;
        const centerY = apple.y + this.APPLE_SIZE / 2;
        
        this.ctx.save();
        
        // Apply pop animation if needed
        if (apple.falling) {
            const now = Date.now();
            const animationStartTime = apple.animationStartTime || now;
            const elapsed = (now - animationStartTime) / 1000; // seconds
            
            if (elapsed >= 0) { // Start animation after delay
                const animationDuration = 0.4; // Shorter, snappier animation
                const progress = Math.min(elapsed / animationDuration, 1); // 0 to 1
                
                // Move to apple center before scaling
                this.ctx.translate(centerX, centerY);
                
                if (progress < 0.2) {
                    // Phase 1: Quick pop effect (20% of animation)
                    const popProgress = progress / 0.2; // 0 to 1 over first 20%
                    const scale = 1 + 0.4 * Math.sin(popProgress * Math.PI); // Pop up to 1.4x then back
                    this.ctx.scale(scale, scale);
                } else {
                    // Phase 2: Shrink to dot and fade out (80% of animation)
                    const shrinkProgress = (progress - 0.2) / 0.8; // 0 to 1 over remaining 80%
                    const scale = Math.max(0.05, 1 - shrinkProgress); // Scale from 1 to tiny dot (not 0)
                    const alpha = Math.max(0, 1 - shrinkProgress * shrinkProgress); // Fade out with easing
                    
                    this.ctx.globalAlpha = alpha;
                    this.ctx.scale(scale, scale);
                }
                
                // Move back to origin for drawing
                this.ctx.translate(-centerX, -centerY);
            }
        }
        
        // Draw apple image
        const img = this.appleImages[apple.type];
        if (img && img.complete) {
            // Add special effects for selected or hint apples
            if (apple.selected) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#ffd700';
            } else if (apple.hint) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#00ff00';
            }
            
            // Draw image centered with aspect ratio maintained
            // Use the original image's aspect ratio
            const aspectRatio = img.width / img.height;
            let drawWidth = this.APPLE_SIZE;
            let drawHeight = this.APPLE_SIZE;
            
            // Maintain aspect ratio
            if (aspectRatio > 1) {
                // Image is wider than tall
                drawHeight = this.APPLE_SIZE / aspectRatio;
            } else {
                // Image is taller than wide
                drawWidth = this.APPLE_SIZE * aspectRatio;
            }
            
            // Center the image
            const offsetX = (this.APPLE_SIZE - drawWidth) / 2;
            const offsetY = (this.APPLE_SIZE - drawHeight) / 2;
            
            this.ctx.drawImage(img, apple.x + offsetX, apple.y + offsetY, drawWidth, drawHeight);
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
        }
        
        // Number overlay (only for non-wild apples)
        if (apple.type !== 'wild') {
            this.ctx.fillStyle = apple.selected ? '#ffd700' : '#fff';
            this.ctx.strokeStyle = '#000';
            
            // Adjust font size based on device
            const isMobile = window.innerWidth <= 768;
            const fontSize = isMobile ? 10 : 16;
            this.ctx.font = `bold ${fontSize}px Arial`;
            
            this.ctx.lineWidth = 2;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.strokeText(apple.value, centerX, centerY);
            this.ctx.fillText(apple.value, centerX, centerY);
        }
        
        this.ctx.restore();
    }
    
    startRenderLoop() {
        const renderFrame = () => {
            if (this.gameRunning) {
                // Check if any apples are animating
                let hasAnimatingApples = false;
                for (let row = 0; row < this.ROWS; row++) {
                    for (let col = 0; col < this.COLS; col++) {
                        if (this.board[row][col].falling) {
                            hasAnimatingApples = true;
                            break;
                        }
                    }
                    if (hasAnimatingApples) break;
                }
                
                if (hasAnimatingApples) {
                    this.render();
                }
            }
            requestAnimationFrame(renderFrame);
        };
        requestAnimationFrame(renderFrame);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new AppleGame();
});