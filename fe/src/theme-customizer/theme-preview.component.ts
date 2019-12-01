import * as _ from "lodash";
import { onEvent, emit } from "@fe/delegated-events";


export class HighlightBoxComponent extends HTMLElement {
    static observedAttributes = ['color', 'theme'];

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
    }

    link: HTMLLinkElement | undefined;
    attributeChangedCallback(name: any, oldVal: any, newVal: any) {
        let theme = this.getAttribute('theme');
        let color = this.getAttribute('color');
        if (!theme || !color) return;

        color = color.replace(/#/g, '');
        let css = `/formuladb-env/themes/formuladb/_css/${theme}-${color}.css`;

        if (!this.link) {
            this.render();
            this.link = document.createElement('link');
            this.link.rel = 'stylesheet';
            this.link.href = css;
            this.shadowRoot!.appendChild(this.link);
        } else {
            this.link.href = css;            
        }

    }


    render() {
        this.shadowRoot!.innerHTML = /*html*/`
            <nav class="navbar navbar-dark bg-primary">
                <a class="navbar-brand" href="javascript:void(0)">Navbar ${this.getAttribute('theme')}</a>
            </nav>
        
            <h3>${this.getAttribute('theme')}</h3>
            <div class="btn-group">
                <button type="button" class="btn btn-sm btn-primary">Primary</button>
                <button type="button" class="btn btn-sm btn-secondary">Secondary</button>
                <button type="button" class="btn btn-sm btn-success">Success</button>
                <button type="button" class="btn btn-sm btn-info">Info</button>  
            </div>
        `;
    }
}

customElements.define('frmdb-theme-preview', HighlightBoxComponent);
