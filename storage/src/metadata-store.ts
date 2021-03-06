const fetch = require('node-fetch')
import * as puppeteer from 'puppeteer';
import * as mergeImg from 'merge-img';
const Jimp = require('jimp');
import { Schema, Entity, isEntity, Pn } from "@domain/metadata/entity";
import { KeyValueStoreFactoryI, KeyObjStoreI, KeyTableStoreI } from "@storage/key_value_store_i";
import * as _ from "lodash";
import * as fs from 'fs';
import * as util from 'util';

import * as jsyaml from 'js-yaml';
import { $User, $Dictionary, $Currency, $DictionaryObjT, $Icon, $IconObjT, $AppObjT, $PageObjT, $App, $Table, $Page, $Image, $System_Param, $Permission, $ImageObjT } from "@domain/metadata/default-metadata";

const { JSDOM } = require('jsdom');
import { HTMLTools, isHTMLElement } from "@core/html-tools";

import { Storage } from '@google-cloud/storage';
import { cleanupDocumentDOM } from "@core/page-utils";
import { getPremiumIcon } from "./icon-api";
import { makeUrlPath, parseAllPageUrl, MandatoryPageOpts, FullPageOpts, AllPageOpts, PageLookAndTheme, DefaultPageLookAndThemeT, DefaultPageLookAndThemeApp } from "@domain/url-utils";
import { unloadCurrentTheme, applyTheme, ThemeRules } from "@core/frmdb-themes";
import { I18N_UTILS } from "@core/i18n-utils";
import { I18nLang } from "@domain/i18n";
import { ServerEventSetPage } from "@domain/event";
import { getPageProperties, setPageProperties, setPageLookAndTheme, removePageProperties, removePageLookAndTheme } from "@core/dom-utils";
import { ThemeColors } from '@domain/uimetadata/theme';
import { PickOmit } from '@domain/ts-utils';
import { updateDOMForDoc } from '@core/live-dom-template/live-dom-template';
const STORAGE = new Storage({
    projectId: "seismic-plexus-232506",
});

const os = require('os');
const path = require('path');

const FRMDB_ENV_ROOT_DIR = process.env.FRMDB_ENV_ROOT_DIR || '/wwwroot/git';
const FRMDB_ENV_DIR = `${FRMDB_ENV_ROOT_DIR}/formuladb-env`;

export interface SchemaEntityList {
    _id: string;
    entityIds: string[];
}

export class MetadataStore {
    constructor(private envName: string, public kvsFactory: KeyValueStoreFactoryI) {
    }

    public get envDir() { return FRMDB_ENV_DIR; }

    private async writeFile(fileName: string, content: string | Buffer) {
        await new Promise((resolve, reject) => {
            let dirName = path.dirname(fileName);

            fs.mkdir(dirName, { recursive: true }, function (errMkdir) {
                if (errMkdir) {
                    console.error(errMkdir);
                    reject(errMkdir);
                } else {
                    fs.writeFile(fileName, content, function (err) {
                        if (err) {
                            console.error(err);
                            reject(err);
                        } else resolve();
                    });
                }
            })
        });
    }

    private async listDir(directoryPath: string, filter?: RegExp): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    reject(err);
                    return;
                }
                let retFiles = files.map(file => `${directoryPath.slice(FRMDB_ENV_ROOT_DIR.length)}/${file}`);
                if (filter) {
                    retFiles = retFiles.filter(fileName => filter.test(fileName));
                }
                resolve(retFiles);
            });
        });
    }

    private toYaml(input: Entity | Schema | $AppObjT | SchemaEntityList): string {
        let obj = input;
        if (isEntity(input)) {
            let entity: Entity = _.cloneDeep(input);
            for (let p of Object.values(entity.props)) {
                if (Pn.SCALAR_FORMULA == p.propType_ || Pn.AGGREGATE_FORMULA == p.propType_) {
                    p.compiledFormula_ = undefined;
                }
            }
            obj = entity;
        }
        return jsyaml.safeDump(obj, {
            indent: 4,
            flowLevel: 4,
            skipInvalid: true,
        });
    }

    private fromYaml<T extends Entity | Schema | $AppObjT | SchemaEntityList>(str: string): T {
        //TODO add schema validation even if CPU intensive
        return jsyaml.safeLoad(str) as T;
    }

    private async readFile(fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(fileName, 'utf8', function (err, data) {
                if (err) {
                    console.error(err);
                    reject(err);
                } else resolve(data);
            });
        });
    }


    private async delFile(fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.unlink(fileName, function (err) {
                if (err) {
                    console.error(err);
                    reject(err);
                } else resolve();
            });
        });
    }

    async putApp(appName: string, app: $AppObjT): Promise<$AppObjT> {
        await this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/app.yaml`, this.toYaml(app));

        return app;
    }
    async putSchema(appName: string, schema: Schema): Promise<Schema> {
        await Promise.all(Object.values(schema.entities)
            .map(entity => this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${entity._id}.yaml`,
                this.toYaml(entity)))
            .concat(this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/schema.yaml`, this.toYaml({
                _id: schema._id,
                entityIds: Object.keys(schema.entities),
            })))
        );

        return schema;
    }

    public async getSchema(appName: string | null): Promise<Schema | null> {
        let schemaNoEntities: SchemaEntityList;
        if (null == appName) {
            let entityFiles = await this.listDir(`${FRMDB_ENV_DIR}/db`, /[A-Z].*\.yaml$/);

            schemaNoEntities = {
                _id: 'FRMDB_SCHEMA~~COMPLETE_DB',
                entityIds: entityFiles.map(entityFile => entityFile.replace(/.*\//, '').replace(/\.yaml$/, '')),
            };
        }
        else {
            schemaNoEntities = this.fromYaml(
                await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/schema.yaml`));
        }
        let entitiesStr: (string | null)[] = await Promise.all(schemaNoEntities.entityIds
            .filter(entityId => {
                if (entityId.indexOf('$') >= 0) {
                    return false;
                } else return true;
            })
            .map(entityId => {
                try {
                    let yamlContent = this.readFile(`${FRMDB_ENV_DIR}/db/${entityId}.yaml`)
                    return yamlContent;
                } catch (err) {
                    console.warn(err, `Entity definition ${entityId} not found`);
                    return null;
                }
            }));

        let entities: Entity[] = entitiesStr.filter(x => x != null).map((entityStr: string) => {
            try {
                return this.fromYaml(entityStr)
            } catch (err) {
                console.error("Cannot parse entity ", entityStr);
                throw err;
            }
        });

        let entitiesDictionary = entities.reduce((acc, ent, i) => {
            acc[ent._id] = ent; return acc;
        }, {});

        entitiesDictionary[$User._id] = $User;
        entitiesDictionary[$Dictionary._id] = $Dictionary;
        entitiesDictionary[$Currency._id] = $Currency;
        entitiesDictionary[$Icon._id] = $Icon;
        entitiesDictionary[$Image._id] = $Image;
        entitiesDictionary[$App._id] = $App;
        entitiesDictionary[$Table._id] = $Table;
        entitiesDictionary[$Page._id] = $Page;
        entitiesDictionary[$System_Param._id] = $System_Param;
        entitiesDictionary[$Permission._id] = $Permission;

        let schema: Schema = {
            _id: schemaNoEntities._id,
            entities: entitiesDictionary,
        }
        return schema;
    }

    public getEntities(appName: string): Promise<Entity[]> {
        return this.getSchema(appName).then(s => s ? Object.values(s.entities) : []);
    }

    public async getEntity(appName: string | null, entityId: string): Promise<Entity | null> {
        let str = await this.readFile(`${FRMDB_ENV_DIR}/db/${entityId}.yaml`);
        let entity: Entity = this.fromYaml(str);
        return entity;
    }

    public async putEntity(entity: Entity, appName?: string): Promise<Entity> {
        await this.writeFile(`${FRMDB_ENV_DIR}/db/${entity._id}.yaml`, this.toYaml(entity))

        if (appName) {
            let schemaNoEntities: SchemaEntityList = this.fromYaml(
                await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/schema.yaml`));
            schemaNoEntities.entityIds.push(entity._id);
            await this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/schema.yaml`, this.toYaml(schemaNoEntities));
        }

        return entity;
    }

    public async delEntityFromApp(appName: string, entityId: string): Promise<Entity> {
        let schemaNoEntities: SchemaEntityList = this.fromYaml(
            await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/schema.yaml`)
        );
        schemaNoEntities.entityIds = schemaNoEntities.entityIds.filter(e => e != entityId);
        await this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/schema.yaml`, this.toYaml(schemaNoEntities));

        let entityFile = `${FRMDB_ENV_DIR}/db/${entityId}.yaml`;
        let entity: Entity = await this.fromYaml<Entity>(entityFile);

        return entity;
    }

    public async delEntity(entityId: string): Promise<Entity> {

        let entityFile = `${FRMDB_ENV_DIR}/db/${entityId}.yaml`;
        let entity: Entity = await this.fromYaml<Entity>(entityFile);
        await this.delFile(entityFile);

        return entity;
    }

    async getApp(appName: string): Promise<$AppObjT | null> {
        let app: $AppObjT = this.fromYaml(
            await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/app.yaml`)
        );
        app.name = appName;
        app._id = `$App~~${appName}`;


        // let htmlPages = await this.listDir(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}`, /\.html$/);
        // app.pages = htmlPages.map(fName => fName.replace(/.*\//, ''));

        return app;
    }

    async getThemes() {
        let themeFiles = await this.listDir(`${FRMDB_ENV_DIR}/themes`, /\.json$/);
        return themeFiles.map(t => t.replace(/.*\//, '').replace(/\.json$/, ''));
    }

    async getLooks() {
        let cssFiles = await this.listDir(`${FRMDB_ENV_DIR}/css`, /\.css$/);
        return cssFiles;
    }

    async setApp(appName: string, appObj: $AppObjT, basedOnApp?: string): Promise<$AppObjT | null> {
        let app = await this.getApp(appName).catch(err => { if (err.code === 'ENOENT') return null; else throw err });
        if (!app) {
            if (basedOnApp) {
                await execShell(`cp -ar ${FRMDB_ENV_DIR}/frmdb-apps/${basedOnApp} ${FRMDB_ENV_DIR}/frmdb-apps/${appName}`);
            } else {
                await execShell(`mkdir -p ${FRMDB_ENV_DIR}/frmdb-apps/${appName}`);
                await execShell(`cp ${FRMDB_ENV_DIR}/frmdb-apps/base-app/landing-page.html ${FRMDB_ENV_DIR}/frmdb-apps/${appName}/index.html`);
                await execShell(`cp ${FRMDB_ENV_DIR}/frmdb-apps/base-app/_[a-z]*.html ${FRMDB_ENV_DIR}/frmdb-apps/${appName}/`);
                await execShell(`cp ${FRMDB_ENV_DIR}/frmdb-apps/base-app/*.yaml ${FRMDB_ENV_DIR}/frmdb-apps/${appName}/`);
            }
        }
        app = await this.getApp(appName);
        if (!app) throw new Error(`app ${appName} creation failed`);
        app._id = `$App~~${appName}`;
        app.category = appObj.category;
        app.description = appObj.description;
        app.status = appObj.status;
        app.default_page = appObj.default_page;
        app.info = appObj.info;
        if (appObj.is_default_app != null) app.is_default_app = appObj.is_default_app;
        await this.putApp(appName, app);
        await execShell(`mkdir -p ${FRMDB_ENV_DIR}/frmdb-apps/${appName}/static`);
        return this.getApp(appName);
    }

    async setPageProperties(pageOpts: FullPageOpts, newPageObj: $PageObjT, startPageName: string) {
        let { appName } = pageOpts;
        let content;
        if ('$LANDING-PAGE$' === startPageName) {
            content = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/base-app/landing-page.html`);
        } else if ('$CONTENT-PAGE$' === startPageName) {
            content = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/base-app/content-page.html`);
        } else {
            content = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${startPageName}.html`);
        }

        const jsdom = new JSDOM(content, {}, {
            features: {
                'FetchExternalResources': false,
                'ProcessExternalResources': false
            }
        });
        const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());
        let cleanedUpDOM = cleanupDocumentDOM(htmlTools.doc);

        let headEl = cleanedUpDOM.querySelector('head');
        if (!headEl) throw new Error(`could not find head elem for ${newPageObj._id} with html ${content}`);
        let newHeadEl = htmlTools.doc.createElement('head');

        setPageProperties(newHeadEl, newPageObj);
        cleanedUpDOM.replaceChild(newHeadEl, headEl);

        await this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${newPageObj.name}.html`, htmlTools.document2html(cleanedUpDOM));

        setTimeout(() => this.setPageScreenshot(pageOpts), 500);
    }

    async getDefaultPageOptsForAppAndPage(appName: string, pageName?: string): Promise<DefaultPageLookAndThemeT> {
        let specificPageProps: DefaultPageLookAndThemeT | null = null;
        if (pageName) {
            let pageHtml = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${pageName + '.html' || 'index.html'}`);

            const jsdom = new JSDOM(pageHtml, {}, {
                features: {
                    'FetchExternalResources': false,
                    'ProcessExternalResources': false
                }
            });
            const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());
            let pageProps = getPageProperties(htmlTools.doc);
            specificPageProps = {
                look: pageProps.frmdb_look,
                primaryColor: pageProps.frmdb_primary_color,
                secondaryColor: pageProps.frmdb_secondary_color,
                theme: pageProps.frmdb_theme,
            }
        }
        if (specificPageProps?.look) return specificPageProps;

        let app = await this.getApp(appName);
        if (!app) throw new Error(`app ${appName} not found`);
        return {
            look: app.defaultLook || DefaultPageLookAndThemeApp.look,
            primaryColor: app.defaultPrimaryColor || DefaultPageLookAndThemeApp.primaryColor,
            secondaryColor: app.defaultSecondaryColor || DefaultPageLookAndThemeApp.secondaryColor,
            theme: app.defaultTheme || DefaultPageLookAndThemeApp.theme,
        }
    }
    async fullPageOptsFromMandatory(pageOpts: MandatoryPageOpts): Promise<FullPageOpts> {
        let defaultOpts = await this.getDefaultPageOptsForAppAndPage(pageOpts.appName);
        return {
            ...pageOpts,
            ...defaultOpts,
        }
    }
    async savePageHtml(pageOpts: FullPageOpts, html: string, specificPageOpts?: boolean): Promise<void> {
        let { appName, pageName } = pageOpts;
        let pagePath = `frmdb-apps/${appName}/${pageName}.html`;

        const jsdom = new JSDOM(html, {}, {
            features: {
                'FetchExternalResources': false,
                'ProcessExternalResources': false
            }
        });
        const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());

        let cleanedUpDOM = cleanupDocumentDOM(htmlTools.doc);

        //page is saved without any theme-specific classes, theme rules are applied on read
        unloadCurrentTheme(cleanedUpDOM);

        //i18n texts are stored in $Dictionary table, not in the html page
        I18N_UTILS.cleanI18nTranslations(cleanedUpDOM);

        //save favicon
        {
            let faviconIcon = cleanedUpDOM.querySelector('frmdb-icon#frmdb-nav-favicon');
            if (faviconIcon) {
                let iconName = faviconIcon.getAttribute("name");
                if (iconName) {
                    await execShell(`cp ${FRMDB_ENV_DIR}/icons/svg/${iconName}.svg ${FRMDB_ENV_DIR}/frmdb-apps/${appName}/favicon.svg`);
                }
            }
        }

        this.cleanupRuntimeOnlyAttributes(cleanedUpDOM);
        
        //<head> is managed like a special type of fragment
        {
            let headEl = cleanedUpDOM.querySelector('head');
            if (!headEl) throw new Error(`could not find head elem for ${pagePath} with html ${html}`);

            let cleanedUpHeadEl = htmlTools.doc.createElement('head');
            let pageProps = getPageProperties(htmlTools.doc);
            setPageProperties(cleanedUpHeadEl, pageProps);
            if (specificPageOpts) {
                setPageLookAndTheme(cleanedUpHeadEl, pageOpts);
            } else {
                removePageLookAndTheme(cleanedUpHeadEl);
            }
            cleanedUpDOM.replaceChild(cleanedUpHeadEl, headEl);

            removePageProperties(headEl);
            removePageLookAndTheme(headEl);
            await this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/_head.html`, htmlTools.normalizeDOM2HTML(headEl));
        }

        for (let fragmentEl of Array.from(cleanedUpDOM.querySelectorAll('[data-frmdb-fragment]'))) {
            let fragmentName = fragmentEl.getAttribute('data-frmdb-fragment');
            if (!fragmentName) throw new Error("fragmentName not found for" + fragmentEl.outerHTML);
            let fragmentMarker = htmlTools.doc.createElement('div');
            fragmentMarker.setAttribute('data-frmdb-fragment', fragmentName);
            fragmentEl.parentNode!.replaceChild(fragmentMarker, fragmentEl);

            await this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${fragmentName}`, htmlTools.normalizeDOM2HTML(fragmentEl));
        }

        //TODO: find all img data url(s) and save them as images

        await this.writeFile(`${FRMDB_ENV_DIR}/${pagePath}`, htmlTools.document2html(cleanedUpDOM));

        let fullPageOpts: FullPageOpts = pageOpts.look ? pageOpts as FullPageOpts : await this.fullPageOptsFromMandatory(pageOpts);
        setTimeout(() => this.setPageScreenshot(fullPageOpts), 500);
    }

    cleanupRuntimeOnlyAttributes(cleanedUpDOM: HTMLElement) {
        for (let recordBindingEl of Array.from(cleanedUpDOM.querySelectorAll('[data-frmdb-bind-to-record]'))) {
            recordBindingEl.removeAttribute('data-frmdb-record');
        }
        for (let el of Array.from(cleanedUpDOM.querySelectorAll('form.was-validated'))) {
            el.classList.remove('was-validated');
        }

        for (let el of Array.from(cleanedUpDOM.querySelectorAll('[data-frmdb-validation-title-bak]'))) {
            (el as HTMLElement).title = el.getAttribute('data-frmdb-validation-title-bak')!;
            el.removeAttribute('data-frmdb-validation-title-bak');
        }
        for (let el of Array.from(cleanedUpDOM.querySelectorAll('[title*="(frmdbv)"]'))) {
            el.removeAttribute('title');//elements that had an initial title have data-frmdb-validation-title-bak
        }

        let scriptEl = cleanedUpDOM.querySelector('#FRMDB_VARS_SCRIPT_ELEMENT');
        if (scriptEl) scriptEl.parentElement!.removeChild(scriptEl);

        for (let el of Array.from(cleanedUpDOM.querySelectorAll('script[src^="chrome-extension:"]'))) {
            el.parentElement?.removeChild(el);
        }
        for (let el of Array.from(cleanedUpDOM.querySelectorAll('[contenteditable]'))) {
            el.removeAttribute('contenteditable');
        }
        for (let el of Array.from(cleanedUpDOM.querySelectorAll('[spellchecker]'))) {
            el.removeAttribute('spellchecker');
        }

        cleanedUpDOM.querySelector('body')?.classList.remove('frmdb-editor-on', 'frmdb-editor-normal', 'frmdb-editor-preview');

    }

    async setPageScreenshot(pageOpts: FullPageOpts) {
        try {
            let img = await this.getPageScreenshot(pageOpts);
            let { appName, pageName } = pageOpts;
            console.info('Saving screenshot for ', pageOpts);
            let path = `frmdb-apps/${appName}/static/${pageName}.png`;
            await this.writeFile(`${FRMDB_ENV_DIR}/${path}`, img);
            console.info('saved ', path);
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async getLookCss(pageOpts: FullPageOpts): Promise<string> {
        let lookCss = await this.readFile(`${FRMDB_ENV_DIR}/css/${pageOpts.look}-${pageOpts.primaryColor}-${pageOpts.secondaryColor}.css`);
        return lookCss;
    }

    private async runPuppeteer() {
        const browser = await puppeteer.launch({
            executablePath: process.env.CHROMIUM_PATH,
            args: [
                "--disable-gpu",
                "--renderer",
                "--no-sandbox",
                "--no-service-autorun",
                "--no-experiments",
                "--no-default-browser-check",
                "--disable-dev-shm-usage",
                "--disable-setuid-sandbox",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-extensions",
            ], // This was important. Can't remember why
        });
        return browser;
    }

    async getPageScreenshot(pageOpts: FullPageOpts): Promise<Buffer> {
        console.info("generating screenshot for ", pageOpts);
        let url = makeUrlPath(pageOpts);
        console.info("got to page ", url);
        let browser = await this.runPuppeteer();
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        await page.goto('http://localhost:3000' + url);
        console.info("generate screenshot for ", url);
        let img: Buffer = await page.screenshot({
            encoding: "binary",
            // clip: {
            //     x: 0,
            //     y: 0,
            //     width: 1024,
            //     height: 768,
            // }
        });


        // await page.evaluate(`window.scrollBy(0, 768)`);
        // let img2: Buffer = await page.screenshot({
        //     encoding: "binary",
        //     clip: {
        //         x: 0,
        //         y: 768,
        //         width: 1024,
        //         height: 768,
        //     }
        // });

        // const bodyHandle = await page.$('body');
        // if (!bodyHandle) throw new Error(`Cannot get body elem for ${url}`);
        // let boundingBox = await bodyHandle.boundingBox();
        // if (!boundingBox) throw new Error(`Cannot get body boundingBox elem for ${url}`);
        // const { width, height } = boundingBox;
        // await page.evaluate(`document.querySelectorAll('.min-vh-100').forEach(e => {e.classList.remove('min-vh-100'); e.style.minHeight='768px'})`);
        // let img: Buffer = await page.screenshot({
        //     encoding: "binary",
        //     fullPage: true,
        //     // clip: {
        //     //     x: 0,
        //     //     y: 0,
        //     //     width: 1024,
        //     //     height: 1600
        //     // },
        //     type: 'png'
        // });
        // await bodyHandle.dispose();

        console.info("close browser ", url);
        await browser.close();

        // let finalImgJimp = await mergeImg([img, img2]);
        // let finalImg: Buffer = await new Promise((resolve, reject) => {
        //     finalImgJimp.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
        //         if (err) reject(err);
        //         else resolve(buffer);
        //     });
        // });
        // return finalImg;

        return img;
    }

    async getPagePdf(pageOpts: FullPageOpts): Promise<Buffer> {
        let browser = await this.runPuppeteer();
        const page = await browser.newPage();
        await page.goto('http://localhost:3000' + makeUrlPath(pageOpts));
        let pdf: Buffer = await page.pdf({ format: 'A4' });
        await browser.close();
        return pdf;
    }

    async getPageHtml(reqPageOpts: AllPageOpts, fullPageOpts: FullPageOpts, dictionaryCache: Map<string, $DictionaryObjT>, variables: { [name: string]: string }, flashMessages: { [severity: string]: string[] }): Promise<string> {
        let { appName, pageName } = reqPageOpts;
        let pageHtml = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${pageName + '.html' || 'index.html'}`);

        const jsdom = new JSDOM(pageHtml, {}, {
            features: {
                'FetchExternalResources': false,
                'ProcessExternalResources': false
            }
        });
        const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());
        let pageDom = htmlTools.doc.documentElement;
        let pageProps = getPageProperties(htmlTools.doc);
        let pageOpts: FullPageOpts;
        if (false && /*disable for now*/ !reqPageOpts.look && pageProps.frmdb_look) {
            pageOpts = {
                ...reqPageOpts,
                look: pageProps.frmdb_look,
                primaryColor: pageProps.frmdb_primary_color,
                secondaryColor: pageProps.frmdb_secondary_color,
                theme: pageProps.frmdb_theme,
            };
        } else pageOpts = fullPageOpts;

        //<head> is managed like a special type of fragment
        {
            let headEl = pageDom.querySelector('head');
            if (!headEl) throw new Error(`could not find head elem for ${appName}/${pageName} with html ${pageHtml}`);

            let headHtml = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/_head.html`);
            headEl.innerHTML = headHtml.replace('<head>', '').replace('</head>', '');
            setPageProperties(headEl, pageProps);
        }

        for (let fragmentEl of Array.from(pageDom.querySelectorAll('[data-frmdb-fragment]'))) {
            let fragmentName = fragmentEl.getAttribute('data-frmdb-fragment');
            if (!fragmentName) throw new Error("fragmentName not found for" + fragmentEl.outerHTML);

            if (reqPageOpts.query?.frmdbRender === 'view' && '_scripts.html' === fragmentName) continue;

            let fragmentHtml = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${fragmentName}`);
            let fragmentDom = htmlTools.html2dom(fragmentHtml.replace(/(.|\n)+?<body>/, '').replace(/<\/body>(.|\n)+/, ''));
            if (isHTMLElement(fragmentDom)) {
                let savedFragmentName = fragmentDom.getAttribute('data-frmdb-fragment');
                if (savedFragmentName != fragmentName) throw new Error(`Fragment name mismatch: ${savedFragmentName} != ${fragmentName} //// ${fragmentEl.outerHTML} //// ${fragmentHtml} /// ${fragmentDom.outerHTML}`);
                fragmentEl.parentNode!.replaceChild(fragmentDom, fragmentEl);
            }
        }

        if ("None" != pageOpts.theme) {
            let themeRulesJson = await this.readFile(`${FRMDB_ENV_DIR}/themes/${pageOpts.theme}.json`);
            let themeRules: ThemeRules = JSON.parse(themeRulesJson);
            await applyTheme(themeRules, pageDom);
        }
        I18N_UTILS.applyLanguageOnCleanHtmlPage(pageDom, reqPageOpts.lang as I18nLang, dictionaryCache);
        pageDom.lang = reqPageOpts.lang;

        this.applyServerSideLogic(appName, pageName, htmlTools, pageHtml, pageDom, variables, flashMessages);
        this.cleanupRuntimeOnlyAttributes(pageDom);

        return htmlTools.document2html(pageDom);
    }

    applyServerSideLogic(appName: string, pageName: string, htmlTools: HTMLTools, pageHtml: string, pageDom: HTMLElement, variables: { [name: string]: string }, flashMessages: { [severity: string]: string[] }) {
        if (Object.keys(variables).length > 0) {
            let bodyEl = pageDom.querySelector('body');
            if (!bodyEl) throw new Error(`could not find body elem for ${appName}/${pageName} with html ${pageHtml}`);

            // let scriptEl = htmlTools.doc.createElement('script');
            // scriptEl.id = "FRMDB_VARS_SCRIPT_ELEMENT"
            // scriptEl.innerHTML = `
            //     var $FRMDB_SERVER_VARS = {
            //         ${Object.entries(variables).map(([k, v]) => `'${k}': '${v}',\n`)}
            //     };
            // `;
            // bodyEl.prepend(scriptEl);

            //FIXME: move live-dom-template into @core and use it also for SSR
            for (let [varName, varValue] of Object.entries(variables)) {
                let attrSel = `[data-frmdb-value="$FRMDB_SERVER_VARS.${varName}"]`;
                for (let inputEl of Array.from(pageDom.querySelectorAll(`input${attrSel}`))) {
                    inputEl.setAttribute('value', varValue);
                }
                //TODO: select${attrSel},textarea${attrSel}
            }

            try {
                updateDOMForDoc(htmlTools.doc, {
                        $FRMDB_SERVER_VARS: variables,
                    }, bodyEl);
            } catch (err) {
                console.error(`Error while applying server data binding`, err);
            }
        }

        let notifContainer = pageDom.querySelector('frmdb-notification-container');
        if (!notifContainer) {
            notifContainer = htmlTools.doc.createElement('frmdb-notification-container')
            htmlTools.doc.body.appendChild(notifContainer);
        }
        if (flashMessages) {
            for (let [severity, messages] of Object.entries(flashMessages)) {
                if (messages && messages.length > 0) {
                    notifContainer.innerHTML = notifContainer.innerHTML + /*html*/`
                    <frmdb-alert severity="${severity}" event-title="" event-detail="${messages.join(', ')}"></frmdb-alert>
                `;
                }
            }
        }
    }


    async deletePage(deletedPagePath: string): Promise<void> {
        let { appName, pageName } = parseAllPageUrl(deletedPagePath);
        await this.delFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/${pageName}.html`);
    }

    async saveMediaObject(appName: string, fileName: string, base64Content: string): Promise<void> {
        await this.writeFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/static/${fileName}`, new Buffer(base64Content, 'base64'));
    }

    async saveIcon(appName: string, iconId: string): Promise<string> {
        let icon = await getPremiumIcon(iconId);
        let svgContent = await fetch(icon.svg_url, {
            headers: {
                'accept': 'image/svg+xml',
            },
        }).then(r => r.text());

        svgContent = svgContent.replace(/<svg /, '<svg id="frmdb-icon" ');

        await this.writeFile(`${FRMDB_ENV_DIR}/icons/svg/${icon.name}.svg`, new Buffer(svgContent, 'utf8'));
        // await execShell(`npm run generate-user-icons`);
        return icon.name;
    }

    async getAvailableImages(appName: string): Promise<$ImageObjT[]> {
        let apps = await this.getApps(appName);
        let images: string[] = await this.listDir(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/static`);
        for (let app of apps.map(a => a._id)) {
            if (app === appName) continue;
            let imgsForApp = await this.listDir(`${FRMDB_ENV_DIR}/frmdb-apps/${app}/static`)
                .catch(err => { console.warn(err); return [] });
            images.push(...imgsForApp);
        }
        return images.map(i => ({ _id: i }));
    }

    async getAvailableIcons(appName: string): Promise<$IconObjT[]> {
        let iconNames = await this.listDir(`${FRMDB_ENV_DIR}/icons/svg`);
        return iconNames.map(i => ({ _id: i.replace(/^.*\/svg\//, '').replace(/\.svg$/, '') }))
    }

    async getDefaultApp(): Promise<$AppObjT | null> {
        let apps = await this.getApps();
        let defaultApp: $AppObjT | null = null;
        for (let app of apps) {
            if (app.is_default_app) {
                defaultApp = app;
                break;
            }
        }
        return defaultApp;
    }
    async getApps(appName?: string): Promise<$AppObjT[]> {
        let appDirs = await this.listDir(`${FRMDB_ENV_DIR}/frmdb-apps`);
        let apps: $AppObjT[] = [];
        for (let appDir of appDirs) {
            let appName = appDir.replace(/\/?formuladb-env\/frmdb-apps\//, '');
            let appStr = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}/app.yaml`);
            let app: $AppObjT = this.fromYaml(appStr);
            apps.push({
                ...app,
                name: appName,
                _id: `$App~~${appName}`,
            });
        }
        return apps;
    }

    async getPages(appName: string): Promise<$PageObjT[]> {
        let ret: $PageObjT[] = [];
        let pageFiles = await this.listDir(`${FRMDB_ENV_DIR}/frmdb-apps/${appName}`, /\.html$/);
        for (let pageFilePath of pageFiles) {
            let pageName = pageFilePath.replace(/^.*\//, '').replace(/\.html$/, '');
            if (pageName.indexOf('_') === 0) continue;
            let htmlContent = await this.readFile(FRMDB_ENV_ROOT_DIR + '/' + pageFilePath);

            const jsdom = new JSDOM(htmlContent, {}, {
                features: {
                    'FetchExternalResources': false,
                    'ProcessExternalResources': false
                }
            });
            const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());

            let pageProps = getPageProperties(htmlTools.doc);
            let pageObj: $PageObjT = {
                _id: `${appName}/${pageName}`,
                name: pageName,
                ...pageProps,
                screenshot: `/formuladb-env/frmdb-apps/${appName}/static/${pageName}.png`,
            }
            if (pageProps.frmdb_look) {
                pageObj.template_url = `/en-${pageProps.frmdb_look}-${pageProps.frmdb_primary_color}-${pageProps.frmdb_secondary_color}-${pageProps.frmdb_theme}/${appName}/${pageName}.html`;
            }
            ret.push(pageObj);
        };
        return ret;
    }

    async getTables(appName: string): Promise<Entity[]> {
        let schema = await this.getSchema(appName);
        if (!schema) return [];

        return Object.values(schema.entities)
            // .filter(e => ! [$App._id, $Table._id, $Page._id, $Icon._id, $Image._id].includes(e._id))
        ;
    }

}


const exec = require('child_process').exec;
async function execShell(cmd: string): Promise<{ error: Error, stdout: string | Buffer, stderr: string | Buffer }> {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else resolve({ error, stdout, stderr });
        });
    });
}
