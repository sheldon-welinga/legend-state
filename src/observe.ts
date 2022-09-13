import { TrackingNode } from './observableInterfaces';
import { onChange } from './onChange';
import { beginTracking, endTracking, tracking } from './tracking';

export function setupTracking(nodes: Map<number, TrackingNode>, update: () => void, noArgs?: boolean) {
    let listeners = [];
    // Listen to tracked nodes
    if (nodes) {
        for (let tracked of nodes.values()) {
            const { node, track } = tracked;
            listeners.push(onChange(node, update, track, noArgs));
        }
    }

    return () => {
        if (listeners) {
            for (let i = 0; i < listeners.length; i++) {
                listeners[i]();
            }
            listeners = undefined;
        }
    };
}

export function observe(run: () => void | (() => void)) {
    let cleanup: () => void;
    // Wrap it in a function so it doesn't pass all the arguments to run()
    let update = function () {
        if (cleanup) {
            cleanup();
            cleanup = undefined;
        }
        cleanup = run() as () => void;

        // Do tracing if it was requested
        if (process.env.NODE_ENV === 'development') {
            tracking.listeners?.(tracking.nodes);
            if (tracking.updates) {
                update = tracking.updates(update);
            }
            // Clear tracing
            tracking.listeners = undefined;
            tracking.updates = undefined;
        }
    };

    const trackingPrev = beginTracking();

    update();

    // Do tracing if it was requested
    if (process.env.NODE_ENV === 'development') {
        tracking.listeners?.(tracking.nodes);
        if (tracking.updates) {
            update = tracking.updates(update);
        }
    }

    const ret = setupTracking(tracking.nodes, update);

    endTracking(trackingPrev);

    return ret;
}
