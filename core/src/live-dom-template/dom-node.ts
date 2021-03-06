import * as _ from "lodash";//TODO: optimization include only the needed functions
import { generateUUID } from "@domain/uuid";
import { scalarFormulaEvaluate } from "@core/scalar_formula_evaluate";
import { getDocumentOf } from "@core/dom-utils";
import { isHTMLElement } from "@core/html-tools";

declare var Element: null, HTMLElement: null, Window: null, Document: null, Event: null, CustomEvent: null;

export type Elem = HTMLElement;
export class ElemList {
    constructor(private key: string, private parentEl: Elem) { }

    public elems(): Elem[] {
        return Array.from(this.parentEl.querySelectorAll(`[data-frmdb-table="${this.key}"]`));
    }

    public getLimit() {
        let limitEl = this.parentEl.querySelector(`[data-frmdb-table-limit]`);
        if (!limitEl) return 3;
        let limit = parseInt(limitEl.getAttribute('data-frmdb-table-limit') || '');
        return limit || 3;
    }

    public createElems(nb: number): Elem[] {
        let elems: Elem[] = [];
        let elList = this.parentEl.querySelectorAll(`[data-frmdb-table="${this.key}"]`);
        let firstEl = elList[0];
        if (!firstEl) firstEl = createElem(getDocumentOf(this.parentEl), 'div', this.key);

        for (let i = 0; i < nb; i++) {
            let newEl: Elem = firstEl.cloneNode(true) as Elem;
            if (newEl.id) newEl.id = generateUUID();
            elems.push(newEl);
        }

        return elems;
    }

    public add(el: Elem): Elem {
        let elems = this.elems();
        if (elems.length > 0) {
            let lastElem = elems[elems.length - 1];
            lastElem.parentElement?.insertBefore(el, lastElem.nextElementSibling);
        } else {
            this.parentEl.appendChild(el);
        }
        return el;
    }

    public addAll(newElemsAdded: Elem[]) {
        let currentLastSibling: Elem | undefined = undefined;
        for (let newElemInList of newElemsAdded) {
            if (currentLastSibling) {
                currentLastSibling.parentElement!.insertBefore(newElemInList, currentLastSibling.nextElementSibling);
            } else {
                this.add(newElemInList);
            }
            currentLastSibling = newElemInList;
        }
    }

    public lastElem() {
        let list = this.parentEl.querySelectorAll(`[data-frmdb-table="${this.key}"]`);
        if (list.length == 0) return null;
        else return list[list.length - 1] as Elem;
    }

    public at(idx: number): Elem | null {
        let list = this.parentEl.querySelectorAll(`[data-frmdb-table="${this.key}"]`);
        if (list.length < idx) return null;
        else return list[idx] as Elem;
    }

    public remove(el: Elem) {
        try {
            return this.parentEl.removeChild(el);
        } catch (err) {
            throw err;
        } 
    }
}


export function createElem(currentDoc: Document, tagName: string, key: string): Elem {
    let el = currentDoc.createElement(tagName);
    let attr = currentDoc.createAttribute("data-frmdb-value");
    attr.value = key;
    el.setAttributeNode(attr);

    return el;
}

export function createElemList(currentDoc: Document, tagName: string, key: string, length: number): ElemList {
    let dummy = currentDoc.createElement('div');
    for (let i = 0; i < length; i++) {
        let el = currentDoc.createElement(tagName);
        let attr = currentDoc.createAttribute("data-frmdb-table");
        attr.value = key;
        el.setAttributeNode(attr);
        dummy.appendChild(el);
    }
    return new ElemList(key, dummy);
}

export enum DATA_FRMDB_ATTRS_Enum {
    'data-frmdb-value' = 'data-frmdb-value',
    'data-frmdb-attr' = 'data-frmdb-attr',
    'data-frmdb-attr2' = 'data-frmdb-attr2',
    'data-frmdb-attr3' = 'data-frmdb-attr3',
    'data-frmdb-attr4' = 'data-frmdb-attr4',
    'data-frmdb-prop' = 'data-frmdb-prop',
    'data-frmdb-prop2' = 'data-frmdb-prop2',
    'data-frmdb-prop3' = 'data-frmdb-prop3',
    'data-frmdb-prop4' = 'data-frmdb-prop4',
    'data-frmdb-if' = 'data-frmdb-if',
};
function getDataBindingSelectorForKey(key: string): string {
    return Object.keys(DATA_FRMDB_ATTRS_Enum).map(a => `[${a}$=":${key}"],[${a}="${key}"]`).join(',');
}
export function getElemForKey(el: Elem, key: string): Elem[] {
    let sel = getDataBindingSelectorForKey(key);
    return _getElemForKey(el, sel);
}
export function elemHasDataBindingForKey(el: Elem, key: string): boolean {
    let sel = getDataBindingSelectorForKey(key);
    return el.matches(sel);
}
export function getAllElemsWithDataBindingAttrs(el: Elem): Elem[] {
    let ret: Elem[] = [];
    let sel = Object.keys(DATA_FRMDB_ATTRS_Enum).map(a => `[${a}]`).join(',');
    if (el.matches(sel)) ret.push(el);
    return ret.concat(Array.from(el.querySelectorAll(sel)));
}

export function getElemWithComplexPropertyDataBinding(el: Elem, key: string): Elem[] {
    let sel = [
        DATA_FRMDB_ATTRS_Enum["data-frmdb-prop"],
        DATA_FRMDB_ATTRS_Enum["data-frmdb-prop2"],
        DATA_FRMDB_ATTRS_Enum["data-frmdb-prop3"],
        DATA_FRMDB_ATTRS_Enum["data-frmdb-prop4"],
    ].map(a => `[${a}$=":${key}"]`).join(',');
    return _getElemForKey(el, sel);
}
function _getElemForKey(el: Elem, sel: string): Elem[] {
    let ret: Elem[] = [];
    if (el.matches /* ShadowRoot does not have matches method */ && el.matches(sel)) ret.push(el);
    return ret
        .concat(Array.from(el.querySelectorAll(sel)))
        .concat(_.flatMap(el.querySelectorAll('template'),
            tmpl => Array.from(tmpl.content.querySelectorAll(sel))));
}

export function getElemList(el: Elem, key: string): ElemList[] {
    let listElems = Array.from(el.querySelectorAll(`[data-frmdb-table="${key}"]`));
    let parents: Set<HTMLElement> = new Set();
    for (let listEl of listElems) {
        if (!listEl.parentElement) throw { err: new Error("found data-frmdb-table without parent"), key, listEl };
        parents.add(listEl.parentElement);
    }
    return Array.from(parents.values()).map(parent => new ElemList(key, parent));
}

export function addElem(el: Elem, childEl: Elem) {
    el.appendChild(childEl);
}

/**
 * 
 * @param domKey key template, e.g. table[].childTable[].x
 * @param arrayCurrentIndexes current indexes inside tables
 * @returns expanded key, e.g. table[2].childTable[5].x
 */
function domExpandedKey(domKey: string, arrayCurrentIndexes: number[]) {
    let arrayIdx = 0;
    return domKey.split(/(\[\])/).map(x => x == '[]' ? `[${arrayCurrentIndexes[arrayIdx++]}]` : x).join('');
}

function getValueForDomKey(domKey: string, context: {}, arrayCurrentIndexes: number[]) {
    let realKey = domExpandedKey(domKey, arrayCurrentIndexes);
    let value = typeof context === 'function' ? context.call(null, realKey) : _.get(context, realKey);
    if (value == 'function') return value.call()
    else return value;
}

/**
 * 
 * @param domExpandedKey expanded key e.g. table[2].childTable[5].x
 * @param context POJO
 * @returns deep value from object as defined by key
 */
export function getValueForDomExpandedKey(domExpandedKey: string, context: {}) {
    let val = _.get(context, domExpandedKey);
    return val;
}

export function setElemValue(objValForKey: any, elems: Elem[], key: string, context: {}, arrayCurrentIndexes: number[], origKey: string) {
    // if (origKey === '_id' && typeof objValForKey === "string") {
    //     objValForKey = objValForKey.replace(/^.*?~~/, '');
    // } // WARNING: this code would break saving of objects when formulas depend on this _id
    for (let el of elems) {
        let foundDataBinding = _setElemValue(objValForKey, el, key, context, arrayCurrentIndexes)
        if (!foundDataBinding) throw new Error("Internal Error: " + el + " does not have data binding for key " + key);
    }
}

interface DataAttr {
    attrName: string;
    attrValue: string;
    valueName: string;
    metaKey: string;
    ctxKey: string;
    value: any;
}
class ElemDataAttrs {
    if?: DataAttr;
    value?: DataAttr;
    attr: DataAttr[] = [];
    prop: DataAttr[] = [];
}

function computeValuesForDataBindingAttrs(attrib: Attr, objValForKey: any, el: Elem, key: string, context: {}, arrayCurrentIndexes: number[]): 
    {valueName: string, metaKey: string, ctxKey: string, value, metaKeyExpanded: string, ctxKeyExpanded: string} 
{
    let v = attrib.value.split(":");
    let valueName, metaKey, ctxKey;
    if (v.length == 3) {
        [valueName, metaKey, ctxKey] = v;
    } else if (v.length == 2) {
        [valueName, metaKey, ctxKey] = [v[0], '', v[1]];
    } else {
        [valueName, metaKey, ctxKey] = ['', '', v[0]];
    }

    if (ctxKey != key) throw new Error("Expected if [valueName]:[metaObjKey]:domKey but found " + attrib.name + "=" + attrib.value + " for key " + key);

    let value, metaKeyExpanded = '', ctxKeyExpanded = domExpandedKey(ctxKey, arrayCurrentIndexes);

    let valueForKey = objValForKey;
    if ("objValForKey-needs-to-be-computed-for-ifKey" === objValForKey) {
        valueForKey = getValueForDomExpandedKey(ctxKeyExpanded, context);
    }

    if (metaKey === '') {
        value = valueForKey;
    } else {
        if (metaKey.indexOf('(') >= 0) {
            value = scalarFormulaEvaluate({
                ...context,
                ...valueForKey,
            }, metaKey);
        } else {
            metaKeyExpanded = domExpandedKey(metaKey, arrayCurrentIndexes);
            let metaCtx = getValueForDomExpandedKey(metaKeyExpanded, context);
            let keyForSearchingInMetaContext = valueForKey;
            value = getValueForDomKey(keyForSearchingInMetaContext, metaCtx, arrayCurrentIndexes) || '';
        }
    }

    return {valueName, metaKey, ctxKey, value, metaKeyExpanded, ctxKeyExpanded};
}

function getDataBindingAttrs(objValForKey: any, el: Elem, key: string, context: {}, arrayCurrentIndexes: number[]): ElemDataAttrs {
    let ret: ElemDataAttrs = new ElemDataAttrs();
    for (let i = 0; i < el.attributes.length; i++) {
        let attrib = el.attributes[i];

        //skip data binding if element is hidden
        if (attrib.name === 'data-frmdb-if') {
            let ifKey = attrib.value.replace(/.*:/, '');
            let {valueName, metaKey, ctxKey, value, metaKeyExpanded, ctxKeyExpanded} = 
                computeValuesForDataBindingAttrs(attrib, "objValForKey-needs-to-be-computed-for-ifKey", 
                    el, ifKey, context, arrayCurrentIndexes);
            if (!value) {
                let dataAttr: DataAttr = { attrName: attrib.name, attrValue: attrib.value, valueName, metaKey, ctxKey, value };
                ret.if = dataAttr;
                return ret;
            }
        }

        if (attrib.value && attrib.name.indexOf('data-frmdb') == 0 && (attrib.value == key || attrib.value.endsWith(':' + key))) {
            let {valueName, metaKey, ctxKey, value, metaKeyExpanded, ctxKeyExpanded} = 
                computeValuesForDataBindingAttrs(attrib, objValForKey, el, key, context, arrayCurrentIndexes);

            let type = attrib.name.replace(/^data-frmdb-/, '').replace(/\d$/, '');
            let dataAttr: DataAttr = { attrName: attrib.name, attrValue: attrib.value, valueName, metaKey, ctxKey, value };
            if ("if" === type) ret.if = dataAttr;
            else if ("value" === type) ret.value = dataAttr;
            else if ("attr" === type) {
                if (!valueName) { console.warn(`Skipping attribute binding without attr name ${attrib.name}="${attrib.value}"`) }
                else ret.attr.push(dataAttr);
            } else if ("prop" === type) {
                if (!valueName) { console.warn(`Skipping property binding without prop name ${attrib.name}="${attrib.value}"`) }
                else ret.prop.push(dataAttr);
            } else if ("table" === type) {
                //ignore this type for setValue
            } else throw new Error("Unknown type " + type + " for " + attrib.name + " " + attrib.value + " " + key);

            el[attrib.name] = `${valueName}:${metaKeyExpanded}:${ctxKeyExpanded}`;//save expanded keys for debugging purposes
        }
    }
    return ret;
}

function _setElemValue(objValForKey: any, el: Elem, key: string, context: {}, arrayCurrentIndexes: number[]): boolean {
    let ret = false;
    let dataAttrsForEl = getDataBindingAttrs(objValForKey, el, key, context, arrayCurrentIndexes);

    if (dataAttrsForEl.if) {
        let value = dataAttrsForEl.if.value;
        if ('!' === dataAttrsForEl.if.valueName) value = !value;

        if (isHidden(el)) {
            if (true === value) {
                show(el);
            } else return true;//no checking for further data binding for hidden element
        } else {
            if (false == value) {
                hide(el, dataAttrsForEl.if);
                return true;//no checking for further data binding for hidden element
            }
        }
        ret = true;
    }

    if (dataAttrsForEl.attr.length > 0) {
        for (let dataAttr of dataAttrsForEl.attr) {
            let value = dataAttr.value;
            let attrName = dataAttr.valueName;

            if (attrName.indexOf("class.") == 0) {
                let className = attrName.replace(/^class\./, '');
                el.classList.toggle(className, value == true);
            } else if (attrName.indexOf("class[") == 0) {
                let options = attrName.replace(/^class\[/, '').replace(/\]$/, '').split('|');
                let className = value + '';
                if (options.includes(className) || className === '') {
                    for (let clsName of options) {
                        if (clsName === className) {
                            el.classList.add(className);
                        } else {
                            el.classList.remove(clsName);
                        }
                    }
                } else console.warn(className + " is not a valid class name option: " + options.join(','));
            } else if (attrName.indexOf("style.") == 0) {
                let styleName = attrName.replace(/^style\./, '');
                el.style.setProperty(styleName, value + '');
            } else if (attrName.indexOf("!") == 0) {
                let an = attrName.replace(/^[!]/, '');
                if (value == true) el.setAttribute(an, an);
                else el.removeAttribute(an);
            } else {
                el.setAttribute(attrName, value + '');
            }
        }
        ret = true;
    }

    if (dataAttrsForEl.prop.length > 0) {
        for (let dataAttr of dataAttrsForEl.prop) {
            let value = dataAttr.value;
            let propName = dataAttr.valueName;

            if ((el as any).frmdbState) {
                (el as any).frmdbState[propName] = value;
            } else el[propName] = value;
        }
        ret = true;
    }

    if (dataAttrsForEl.value) {
        let value = dataAttrsForEl.value.value;
        setValueForElem(el, value);
        ret = true;
    }

    return ret;
}

export function setValueForElem(el: HTMLElement, value: any) {
    
    if ((el as HTMLElement).tagName.toLowerCase() === 'input' || (el as HTMLElement).tagName.toLowerCase() === 'textarea' || (el as HTMLElement).tagName.toLowerCase() === 'select') {
        (el as HTMLInputElement).value = value + '';
    } else if ((el as HTMLElement).tagName.toLowerCase() === 'img') {
        (el as HTMLInputElement).src = value + '';
    } else if ((el as HTMLElement).classList.contains('card-img-overlay')) {
        let img = el.previousElementSibling as HTMLImageElement;
        if (img && img.tagName.toLowerCase() === 'img') img.src = value + '';
    } else if ((el as HTMLElement).style.getPropertyValue('--frmdb-bg-img')) {
        (el as HTMLElement).style.setProperty('--frmdb-bg-img', `url('${value}')`);
    } else if ((el as HTMLElement).tagName.toLowerCase() === 'frmdb-icon') {
        el.setAttribute('name', value);
    } else {
        el.innerHTML = purifyHtmlFor(el, value);
    }
}

function purifyHtmlFor(el: HTMLElement, html: string) {
    const decoder = getDocumentOf(el).createElement('div')
    decoder.innerHTML = html;
    return decoder.textContent||'';
}

export function getElemValue(el: Element): string {
    if ((el as HTMLElement).tagName.toLowerCase() === 'input' || (el as HTMLElement).tagName.toLowerCase() === 'textarea' || (el as HTMLElement).tagName.toLowerCase() === 'select') {
        return (el as HTMLInputElement).value;
    } else if ((el as HTMLElement).tagName.toLowerCase() === 'img') {
        return (el as HTMLInputElement).src;
    } else if ((el as HTMLElement).classList.contains('card-img-overlay')) {
        let img = el.previousElementSibling as HTMLImageElement;
        if (img && img.tagName.toLowerCase() === 'img') return img.src;
        else return '';
    } else if ((el as HTMLElement).style.getPropertyValue('--frmdb-bg-img')) {
        return (el as HTMLElement).style.getPropertyValue('--frmdb-bg-img');
    } else if ((el as HTMLElement).tagName.toLowerCase() === 'frmdb-icon') {
        return el.getAttribute('name') || '';
    } else if (el.childElementCount === 0) {
        return el.innerHTML;
    } else {
        return el.textContent || '';
    }
}

export function isList(el: Elem): boolean {
    let attr = el.getAttribute('data-frmdb-table');
    if (!attr) return false;
    else return true;
}

export function deleteElem(el: Elem, childEl: Elem) {
    el.removeChild(childEl);
}

/**
 * Wraps Element in a div or another element
 * @param inputWrapper {Element | string} the wrapper element or tag name (defaults to "div")
 * @returns the wrapper element
 */
export function wrap(el: Element, inputWrapper: string = 'div'): Element {
    if (!el.parentNode) { console.warn("wrap called and parent not found", el, inputWrapper); return el; }
    if (el.parentNode.nodeType == 11) { console.warn("wrap called and parent is a template", el, inputWrapper); return el; }
    let wrapper: Element;
    wrapper = getDocumentOf(el).createElement(inputWrapper);
    el.parentNode.insertBefore(wrapper, el);
    if (wrapper.tagName.toLowerCase() === 'template') {
        (wrapper as HTMLTemplateElement).content.appendChild(el);
    } else {
        wrapper.appendChild(el);
    }
    return wrapper;
}

/**
 * Unwrap el: move el's children to el's parent
 * 
 * @param el Element
 * @returns parent of el
 */
export function unwrap(el: Element): Element {
    let parent = el.parentNode;
    if (!parent || !isHTMLElement(parent)) { console.error("unwrap called and parent not found", el); return el; }

    let e = el.tagName.toLowerCase() === 'template' ? (el as HTMLTemplateElement).content : el;
    // move all children out of the element
    while (e.firstChild) parent.insertBefore(e.firstChild, el);

    // remove the empty element
    parent.removeChild(el);

    return parent;
}

const USE_TEMPLATE = true;
function isHidden(el: Element): boolean {
    if (USE_TEMPLATE) return el.matches('template[data-frmdb-if]');
    else return el.matches('script[type="text/html"][data-frmdb-if]');
}
function hide(el: Element, ifDataAttr: DataAttr) {
    if (USE_TEMPLATE) {
        wrap(el, 'template').setAttribute('data-frmdb-if', ifDataAttr.attrValue);
    } else {
        hideAsTemplate(el).setAttribute('data-frmdb-if', ifDataAttr.attrValue);
    }
}
function show(el: Element) {
    if (USE_TEMPLATE) {
        unwrap(el);
    } else {
        showFromTemplate(el);
    }
}

function hideAsTemplate(el: Element): Element {
    if (!el.parentNode) { console.error("wrap called and parent not found", el); return el; }
    let script: any = getDocumentOf(el).createElement('script');
    script.setAttribute("type", "text/html");
    script.text = el.outerHTML;
    el.parentNode.insertBefore(script, el);
    el.parentNode.removeChild(el);

    return script;
}
function showFromTemplate(el: Element): Element {
    if (!el.parentNode) { console.error("wrap called and parent not found", el); return el; }
    if (!el.matches('script[type="text/html"]')) throw new Error("hide called on a non-hidden element " + el);
    let htmlText = (el as any).text;//get text from script tag
    let newEl = getDocumentOf(el).createElement('div');
    el.parentNode.insertBefore(newEl, el);
    newEl.outerHTML = htmlText;
    newEl.setAttribute("data-frmdb-if", el.getAttribute("data-frmdb-if") || 'InternalErr!');
    el.parentNode.removeChild(el);

    return newEl;
}
