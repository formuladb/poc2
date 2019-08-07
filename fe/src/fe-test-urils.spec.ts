import { _testResetBackendService } from "./backend.service";
import { _testResetAppAndTenant } from "./app.service";
import { initFrmdb } from "./init";

export async function navigate(path: string, html: string) {
    _testResetBackendService();
    _testResetAppAndTenant();
    window.location.pathname = path;
    document.body.innerHTML = html;
    
    await new Promise(r => setTimeout(r, 0));//wait for fragments to be rendered

    await initFrmdb();
}

export function setValue(el: HTMLInputElement, val: string): HTMLInputElement {
    el.value = val;
    el.dispatchEvent(new Event("change", {bubbles: true}));
    return el;
}

export async function testSleep(ms: number, message: string = "") {
    await new Promise(resolve => setTimeout(resolve, ms));
}