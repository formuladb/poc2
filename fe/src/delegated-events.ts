import { FrmdbUserEvent } from "./frmdb-user-events";
import { FrmdbLogger } from "@domain/frmdb-logger";

const LOG = new FrmdbLogger('delegated-events');

export type EventType = 
    | "click" 
    | "mouseover" 
    | "blur" 
    | "keydown" 
    | "keyup" 
    | "frmdbchange" 
    | FrmdbUserEvent['type']
;

export function onEvent(el: HTMLElement | Document | ShadowRoot, eventType: EventType | EventType[], selector: string | string[], fn: (e) => void) {
    let events = eventType instanceof Array ? eventType : [eventType];
    let selectors = selector instanceof Array ? selector : [selector];
    for (let ev of events) {
        //@ts-ignore
        el.addEventListener(ev, (event: any) => {
            if (!event || !event.target) {console.warn("received incorrect event:", event); return};
            for (let sel of selectors) {
                if (event.target.matches(sel)) {
                    LOG.debug("on", "%o, %o,", ev, event);
                    fn(event);
                    break;
                }
            }
        });
    }
}

export function onDoc(eventType: EventType | EventType[], selector: string | string[], fn: (e) => void) {
    return onEvent(document, eventType, selector, fn);
}

export function emit(target: HTMLElement | Document, event: FrmdbUserEvent, bubbles: boolean = true) {
    target.dispatchEvent(new CustomEvent(event.type, {detail: event, bubbles}));
}

export function emitFrmdbChange(target: HTMLElement | Document, propName?: string, oldVal?: any, newVal?: any) {
    target.dispatchEvent(new CustomEvent("frmdbchange", {detail: {propName, oldVal, newVal}, bubbles: true}));
}
