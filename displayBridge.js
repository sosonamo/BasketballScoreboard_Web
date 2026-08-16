const CHANNEL_NAME = 'basketball-scoreboard-local-display-v1';
const MESSAGE_VERSION = 1;

function createSenderId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 같은 브라우저 프로필과 origin에서 열린 조작 화면/Display 사이의 로컬 통신 브리지입니다.
 * Firebase나 다른 네트워크 요청을 사용하지 않습니다.
 */
export function createLocalDisplayBridge({
    role,
    getTeamId,
    getState,
    onState
}) {
    const isSupported = typeof BroadcastChannel !== 'undefined';

    if (!isSupported) {
        return {
            isSupported: false,
            publish: () => false,
            requestState: () => false,
            close: () => {}
        };
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);
    const senderId = createSenderId();
    let isClosed = false;

    const resolveTeamId = () => String(getTeamId?.() || '').trim();

    const post = (type, payload = {}) => {
        if (isClosed) return false;

        const teamId = resolveTeamId();
        if (!teamId) return false;

        channel.postMessage({
            version: MESSAGE_VERSION,
            type,
            role,
            senderId,
            teamId,
            sentAt: Date.now(),
            ...payload
        });
        return true;
    };

    const publish = () => {
        if (role !== 'controller' || typeof getState !== 'function') return false;
        return post('STATE_UPDATE', { state: getState() });
    };

    const requestState = () => {
        if (role !== 'display') return false;
        return post('STATE_REQUEST');
    };

    channel.addEventListener('message', (event) => {
        const message = event.data;
        if (!message || message.version !== MESSAGE_VERSION) return;
        if (message.senderId === senderId) return;
        if (message.teamId !== resolveTeamId()) return;

        if (role === 'controller' && message.type === 'STATE_REQUEST') {
            publish();
            return;
        }

        if (role === 'display' && message.type === 'STATE_UPDATE' && message.state) {
            onState?.(message.state, message);
        }
    });

    return {
        isSupported: true,
        publish,
        requestState,
        close() {
            if (isClosed) return;
            isClosed = true;
            channel.close();
        }
    };
}
