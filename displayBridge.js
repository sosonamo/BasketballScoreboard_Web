const CHANNEL_NAME = 'basketball-scoreboard-local-display-v1';
const MESSAGE_VERSION = 1;
const PRESENTATION_MESSAGE_TYPE = 'basketball-scoreboard-state';

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

function parsePresentationMessage(data) {
    try {
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        if (!message || message.version !== MESSAGE_VERSION) return null;
        return message;
    } catch (error) {
        console.warn('Display 메시지를 해석하지 못했습니다.', error);
        return null;
    }
}

/**
 * Presentation API를 지원하는 브라우저에서 조작 화면은 휴대폰에 남겨 두고,
 * display.html만 HDMI/무선 외부 화면으로 보냅니다.
 */
export function createPresentationControllerBridge({ getState }) {
    const isSupported = typeof globalThis.PresentationRequest !== 'undefined';
    let connection = null;
    let request = null;
    let isClosed = false;

    const publish = () => {
        if (isClosed || connection?.state !== 'connected' || typeof getState !== 'function') {
            return false;
        }

        try {
            connection.send(JSON.stringify({
                version: MESSAGE_VERSION,
                type: PRESENTATION_MESSAGE_TYPE,
                state: getState(),
                sentAt: Date.now()
            }));
            return true;
        } catch (error) {
            console.warn('외부 모니터로 상태를 보내지 못했습니다.', error);
            return false;
        }
    };

    const bindConnection = (nextConnection) => {
        connection = nextConnection;

        connection.addEventListener('connect', publish);
        connection.addEventListener('message', (event) => {
            const message = parsePresentationMessage(event.data);
            if (message?.type === 'STATE_REQUEST') publish();
        });
        connection.addEventListener('close', () => {
            if (connection === nextConnection) connection = null;
        });
        connection.addEventListener('terminate', () => {
            if (connection === nextConnection) connection = null;
        });

        publish();
        return connection;
    };

    return {
        isSupported,
        get isConnected() {
            return connection?.state === 'connected';
        },
        async start(url) {
            if (!isSupported) {
                throw new DOMException('Presentation API를 지원하지 않습니다.', 'NotSupportedError');
            }
            if (connection?.state === 'connected') {
                publish();
                return connection;
            }

            isClosed = false;
            request = new PresentationRequest(url);
            return bindConnection(await request.start());
        },
        publish,
        close() {
            isClosed = true;
            if (connection?.state === 'connected') connection.close();
            connection = null;
            request = null;
        }
    };
}

/** Presentation API로 열린 display.html에서 컨트롤러의 상태를 받습니다. */
export function createPresentationReceiverBridge({ onState }) {
    const receiver = globalThis.navigator?.presentation?.receiver;
    const connections = new Set();
    let isClosed = false;

    const bindConnection = (connection) => {
        if (!connection || connections.has(connection) || isClosed) return;
        connections.add(connection);

        const requestState = () => {
            if (connection.state !== 'connected') return;
            try {
                connection.send(JSON.stringify({
                    version: MESSAGE_VERSION,
                    type: 'STATE_REQUEST',
                    sentAt: Date.now()
                }));
            } catch (error) {
                console.warn('외부 모니터에서 현재 상태를 요청하지 못했습니다.', error);
            }
        };

        connection.addEventListener('message', (event) => {
            const message = parsePresentationMessage(event.data);
            if (message?.type === PRESENTATION_MESSAGE_TYPE && message.state) {
                onState?.(message.state, message);
            }
        });

        const forgetConnection = () => connections.delete(connection);
        connection.addEventListener('close', forgetConnection);
        connection.addEventListener('terminate', forgetConnection);
        connection.addEventListener('connect', requestState);

        requestState();
    };

    if (receiver) {
        receiver.connectionList
            .then((list) => list.connections.forEach(bindConnection))
            .catch((error) => console.warn('외부 모니터 연결 목록을 확인하지 못했습니다.', error));
        receiver.addEventListener('connectionavailable', (event) => bindConnection(event.connection));
    }

    return {
        isSupported: !!receiver,
        close() {
            isClosed = true;
            connections.forEach((connection) => {
                if (connection.state === 'connected') connection.close();
            });
            connections.clear();
        }
    };
}
