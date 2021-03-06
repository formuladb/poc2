import { onEvent } from "@fe/delegated-events";
import { Undo } from "@fe/frmdb-editor/undo";
import { HighlightComponent } from "@fe/highlight/highlight.component";
import { getDoc } from "@core/dom-utils";

declare var $: null, jQuery: null;

const HTML: string = require('raw-loader!@fe-assets/wysiwyg-editor/wysiwyg-editor.component.html').default;

export class WysiwygEditorComponent extends HighlightComponent {

	oldValue: string = '';
	private doc: Document | null = null;
	spaceInsideButtonEventListener = e => {
		if(e.keyCode == 32){
			this.insertHtmlAtCursor(' ');
		}
	};

	set highlightEl(elem: HTMLElement | null) {
		if (this.highlightEl === elem) return;

		if (this.highlightEl) {
			this.destroy();
		}

		if (elem) {
			this.oldValue = elem.innerHTML;
			elem.setAttribute('contenteditable', 'true');
			elem.setAttribute('spellchecker', 'false');
			this.style.display = 'block';
			if (elem.tagName.toLowerCase() == 'button') {
				elem.addEventListener('keyup', this.spaceInsideButtonEventListener);
			}
		}

		this.doc = elem ? getDoc(elem) : null;
		super.highlightEl = elem;
	}
	get highlightEl() {
		return super.highlightEl;
	}

	insertHtmlAtCursor(html) {
		var range, node;
		if (window.getSelection && window.getSelection()?.getRangeAt) {
			range = window.getSelection()?.getRangeAt(0);
			node = range.createContextualFragment(html);
			range.insertNode(node);
			//window.getSelection().collapseToEnd();
			(window.getSelection() as any).modify('move', 'forward', 'character');
		} 
		// else if (document.selection && document.selection?.createRange) {
		// 	document.selection?.createRange().pasteHTML(html);
		// 	document.selection?.collapseToEnd();
		// 	document.selection?.modify('move', 'forward', 'character');
		// }
	}

	connectedCallback() {
		this.innerHTML = HTML;
		this.style.border = '1px solid rgb(61, 133, 253)';
	}

	action(event: MouseEvent, action: "bold" | "italic" | "underline" | "strikeThrough" | "createLink") {
		if (!this.doc) return;
		this.doc.execCommand(action, false, undefined);
		event.preventDefault();
		return false;
	}

	undo() {
		if (!this.doc) return;
		this.doc.execCommand('undo', false, undefined);
    }

	redo() {
		if (!this.doc) return;
		this.doc.execCommand('redo', false, undefined);
    }

	get isActive() { return this.highlightEl != null; }
	
	disconnectedCallback() {
		this.destroy();
	}

	protected destroy() {
		if (!this.highlightEl) return;
		this.highlightEl.removeAttribute('contenteditable');
		this.highlightEl.removeAttribute('spellchecker');
		if (this.highlightEl.tagName.toLowerCase() == 'button') {
			this.highlightEl.removeEventListener('keyup', this.spaceInsideButtonEventListener);
		}

		const nodeValue = this.highlightEl.innerHTML;

		if (nodeValue != this.oldValue) {
			Undo.addMutation({
				type: 'characterData',
				target: this.highlightEl,
				oldValue: this.oldValue,
				newValue: nodeValue
			});
		}
		
		super.highlightEl = null;
		this.style.display = 'none';
	}
}

customElements.define('frmdb-wysiwyg-editor', WysiwygEditorComponent);
