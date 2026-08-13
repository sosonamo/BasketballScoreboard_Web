// boardLogic.js

// 기본 데이터 구조 (Standard Data)
export const initialTimerData = {
    gameTimeSec: 600,  // 10분
    shotClock: 24,     // 24초
    quarter: 1,
    isGameRunning: false,
    isShotClockRunning: false,
    gameInterval: null,
    shotInterval: null,
    timerInterval: null,
    gameDeadline: null,
    shotDeadline: null
};

// 타이머 관련 로직 (Timer Logic)
export const TimerLogic = {
    // 시간 포맷팅 (00:00)
    formatTime(seconds) {
        const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const min = Math.floor(safeSeconds / 60);
        const sec = safeSeconds % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    },

    // setInterval 호출 횟수가 아니라 실제 시각을 기준으로 남은 시간을 계산합니다.
    createDeadline(seconds, now = Date.now()) {
        return now + Math.max(0, Number(seconds) || 0) * 1000;
    },

    remainingSeconds(deadline, now = Date.now()) {
        if (!deadline) return 0;
        return Math.max(0, Math.ceil((deadline - now) / 1000));
    },

    // 타이머 시작/정지 토글
    toggleTimer(state) {
        state.isGameRunning = !state.isGameRunning;
        return state.isGameRunning;
    },

    // 1초마다 실행될 로직
    tick(state, onTimeOut, onShotClockOut) {
        if (!state.isGameRunning) return;

        // 게임 시간 감소
        if (state.gameTimeSec > 0) {
            state.gameTimeSec--;
        } else {
            state.isGameRunning = false;
            if (onTimeOut) onTimeOut(); // 경기 종료 콜백
        }

        // 샷클락 감소
        if (state.shotClock > 0) {
            state.shotClock--;
        } else {
            if (onShotClockOut) onShotClockOut(); // 24초 종료 콜백
        }
    },

    // 샷클락 리셋 (24초 또는 14초)
    resetShotClock(state, seconds = 24) {
        state.shotClock = seconds;
    },

    // 다음 쿼터
    nextQuarter(state) {
        if (state.quarter < 4) {
            state.quarter++;
            state.gameTimeSec = 600;
            state.shotClock = 24;
            state.isGameRunning = false;
        }
    }
};
