const fetch = require('node-fetch')
import * as puppeteer from 'puppeteer';
import { App } from "@domain/app";
import { Schema, Entity, isEntity, Pn } from "@domain/metadata/entity";
import { KeyValueStoreFactoryI, KeyObjStoreI, KeyTableStoreI } from "@storage/key_value_store_i";
import * as _ from "lodash";
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as stream from 'stream';
import * as parse from 'csv-parse';


import * as jsyaml from 'js-yaml';
import { $User, $Dictionary, $Currency, $DictionaryObjT, $Icon, $IconObjT, $AppObjT, $PageObjT, $App, $Table, $Page, $Image } from "@domain/metadata/default-metadata";

const { JSDOM } = require('jsdom');
import { HTMLTools, isHTMLElement } from "@core/html-tools";

import { Storage } from '@google-cloud/storage';
import { cleanupDocumentDOM } from "@core/page-utils";
import { getPremiumIcon } from "./icon-api";
import { PageOpts, makeUrlPath, parsePageUrl } from "@domain/url-utils";
import { unloadCurrentTheme, applyTheme, ThemeRules } from "@core/frmdb-themes";
import { I18N_UTILS } from "@core/i18n-utils";
import { I18nLang } from "@domain/i18n";
import { ServerEventSetPage } from "@domain/event";
import { getPageProperties, setPageProperties } from "@core/dom-utils";
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
                        }
                        resolve();
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
                }
                let retFiles = files.map(file => `${directoryPath.slice(FRMDB_ENV_ROOT_DIR.length)}/${file}`);
                if (filter) {
                    retFiles = retFiles.filter(fileName => filter.test(fileName));
                }
                resolve(retFiles);
            });
        });
    }

    private toYaml(input: Entity | Schema | App | SchemaEntityList): string {
        let obj = input;
        if (isEntity(input)) {
            let entity: Entity = _.cloneDeep(input);
            for (let p of Object.values(entity.props)) {
                if (p.propType_ === Pn.FORMULA) {
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

    private fromYaml<T extends Entity | Schema | App | SchemaEntityList>(str: string): T {
        //TODO add schema validation even if CPU intensive
        return jsyaml.safeLoad(str) as T;
    }

    private async readFile(fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(fileName, 'utf8', function (err, data) {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(data);
            });
        });
    }


    private async delFile(fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.unlink(fileName, function (err) {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve();
            });
        });
    }

    async putApp(tenantName: string, appName: string, app: App): Promise<App> {
        await this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/app.yaml`, this.toYaml(app));

        return app;
    }
    async putSchema(tenantName: string, appName: string, schema: Schema): Promise<Schema> {
        await Promise.all(Object.values(schema.entities)
            .map(entity => this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/${entity._id}.yaml`,
                this.toYaml(entity)))
            .concat(this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/schema.yaml`, this.toYaml({
                _id: schema._id,
                entityIds: Object.keys(schema.entities),
            })))
        );

        return schema;
    }

    public async getSchema(tenantName: string | null, appName: string | null): Promise<Schema | null> {
        let schemaNoEntities: SchemaEntityList;
        if (null == tenantName) {
            let entityFiles = await this.listDir(`${FRMDB_ENV_DIR}/db`, /[A-Z].*\.yaml$/);

            schemaNoEntities = {
                _id: 'FRMDB_SCHEMA~~COMPLETE_DB',
                entityIds: entityFiles.map(entityFile => entityFile.replace(/.*\//, '').replace(/\.yaml$/, '')),
            };
        }
        else {
            schemaNoEntities = this.fromYaml(
                await this.readFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/schema.yaml`));
        }
        let entitiesStr: string[] = await Promise.all(schemaNoEntities.entityIds.map(entityId => {
            if (entityId == '$User') return entityId;
            if (entityId == '$Currency') return entityId;
            if (entityId == '$Dictionary') return entityId;

            return this.readFile(`${FRMDB_ENV_DIR}/db/${entityId}.yaml`)
        }));
        let entities: Entity[] = entitiesStr.map(entityStr => {
            if (entityStr == '$User') return $User;
            if (entityStr == '$Currency') return $Currency;
            if (entityStr == '$Dictionary') return $Dictionary;

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

        entitiesDictionary[$Icon._id] = $Icon;
        entitiesDictionary[$Image._id] = $Image;
        entitiesDictionary[$App._id] = $App;
        entitiesDictionary[$Table._id] = $Table;
        entitiesDictionary[$Page._id] = $Page;

        let schema: Schema = {
            _id: schemaNoEntities._id,
            entities: entitiesDictionary,
        }
        return schema;
    }

    public getEntities(tenantName: string, appName: string): Promise<Entity[]> {
        return this.getSchema(tenantName, appName).then(s => s ? Object.values(s.entities) : []);
    }

    public getDefaultEntity(tenantName: string, appName: string, path: string): Entity | null {
        switch (path) {
            case $User._id:
                return $User;
            case $Dictionary._id:
                return $Dictionary;
            default:
                return null;
        }
    }

    public async getEntity(tenantName: string, appName: string, entityId: string): Promise<Entity | null> {
        let str = await this.readFile(`${FRMDB_ENV_DIR}/db/${entityId}.yaml`);
        let entity: Entity = this.fromYaml(str);
        return entity;
    }

    public async getEntityBackupData(entityId: string): Promise<stream.Readable> {
        let csvRawStream: stream.Readable;
        if (process.env.BUILD_DEVELOPMENT) {
            csvRawStream = fs.createReadStream(`${FRMDB_ENV_DIR}/db/${entityId}.csv`);
        } else {
            let source = fs.createReadStream(`${FRMDB_ENV_DIR}/db/${entityId}.csv.gz`);
            let gunzip = zlib.createGunzip();
            stream.pipeline(source, gunzip);
            csvRawStream = gunzip;
        }
        const csvParser = parse();
        csvRawStream.pipe(csvParser);
        return csvParser;
    }

    public async putEntity(tenantName: string, appName: string, entity: Entity): Promise<Entity> {
        await this.writeFile(`${FRMDB_ENV_DIR}/db/${entity._id}.yaml`, this.toYaml(entity))

        return entity;
    }

    public async delEntity(tenantName: string, appName: string, entityId: string): Promise<Entity> {
        let schemaNoEntities: SchemaEntityList = this.fromYaml(
            await this.readFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/schema.yaml`)
        );
        schemaNoEntities.entityIds = schemaNoEntities.entityIds.filter(e => e != entityId);
        await this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/schema.yaml`, this.toYaml(schemaNoEntities));

        let entityFile = `${FRMDB_ENV_DIR}/db/${entityId}.yaml`;
        let entity: Entity = await this.fromYaml<Entity>(entityFile);
        await this.delFile(entityFile);

        return entity;
    }

    async getApp(tenantName: string, appName: string): Promise<App | null> {
        let app: App = this.fromYaml(
            await this.readFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/app.yaml`)
        );

        let htmlPages = await this.listDir(`${FRMDB_ENV_DIR}/${tenantName}/${appName}`, /\.html$/);
        app.pages = htmlPages.map(fName => fName.replace(/.*\//, ''));

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

    async newApp(tenantName: string, appName: string, basedOnApp?: string): Promise<App | null> {
        if (basedOnApp) {
            await execShell(`cp -ar ${FRMDB_ENV_DIR}/${tenantName}/${basedOnApp} ${FRMDB_ENV_DIR}/${tenantName}/${appName}`);
        } else {
            await execShell(`mkdir -p ${FRMDB_ENV_DIR}/${tenantName}/${appName}`);
            await execShell(`cp ${FRMDB_ENV_DIR}/frmdb-apps/base-app/landing-page.html ${FRMDB_ENV_DIR}/${tenantName}/${appName}/index.html`);
            await execShell(`cp ${FRMDB_ENV_DIR}/frmdb-apps/base-app/_[a-z]*.html ${FRMDB_ENV_DIR}/${tenantName}/${appName}/`);
            await execShell(`cp ${FRMDB_ENV_DIR}/frmdb-apps/base-app/*.yaml ${FRMDB_ENV_DIR}/${tenantName}/${appName}/`);
        }
        await execShell(`mkdir -p ${FRMDB_ENV_DIR}/${tenantName}/${appName}/static`);
        return this.getApp(tenantName, appName);
    }

    async setPageProperties(pageOpts: PageOpts, newPageObj: $PageObjT, startPageName: string) {
        let { tenantName, appName } = pageOpts;
        let content;
        if ('$LANDING-PAGE$' === startPageName) {
            content = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/base-app/landing-page.html`);
        } else if ('$CONTENT-PAGE$' === startPageName) {
            content = await this.readFile(`${FRMDB_ENV_DIR}/frmdb-apps/base-app/content-page.html`);
        } else {
            content = await this.readFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/${startPageName}.html`);
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
        newHeadEl.innerHTML = /*html*/`
            <title>${newPageObj.title}</title>
            <meta name="description" content="${newPageObj.description}">
            <meta name="author" content="${newPageObj.author}">
            <meta name="frmdb_display_date" content="${newPageObj.frmdb_display_date}">
        `;
        cleanedUpDOM.replaceChild(newHeadEl, headEl);

        await this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/${newPageObj.name}.html`, htmlTools.document2html(cleanedUpDOM));

        setTimeout(() => this.setPageScreenshot(pageOpts), 500);
    }

    async savePageHtml(pageOpts: PageOpts, html: string): Promise<void> {
        let { tenantName, appName, pageName } = pageOpts;
        let pagePath = `${tenantName}/${appName}/${pageName}.html`;

        const jsdom = new JSDOM(html, {}, {
            features: {
                'FetchExternalResources': false,
                'ProcessExternalResources': false
            }
        });
        const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());
        let pageProps = getPageProperties(htmlTools.doc);

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
                    await execShell(`cp ${FRMDB_ENV_DIR}/icons/svg/${iconName}.svg ${FRMDB_ENV_DIR}/${tenantName}/${appName}/favicon.svg`);
                }
            }
        }

        //<head> is managed like a special type of fragment
        {
            let headEl = cleanedUpDOM.querySelector('head');
            if (!headEl) throw new Error(`could not find head elem for ${pagePath} with html ${html}`);
            let cleanedUpHeadEl = htmlTools.doc.createElement('head');
            setPageProperties(cleanedUpHeadEl, pageProps);
            cleanedUpDOM.replaceChild(cleanedUpHeadEl, headEl);
            await this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/_head.html`, htmlTools.normalizeDOM2HTML(headEl));
        }

        for (let fragmentEl of Array.from(cleanedUpDOM.querySelectorAll('[data-frmdb-fragment]'))) {
            let fragmentName = fragmentEl.getAttribute('data-frmdb-fragment');
            if (!fragmentName) throw new Error("fragmentName not found for" + fragmentEl.outerHTML);
            let fragmentMarker = htmlTools.doc.createElement('div');
            fragmentMarker.setAttribute('data-frmdb-fragment', fragmentName);
            fragmentEl.parentNode!.replaceChild(fragmentMarker, fragmentEl);

            await this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/${fragmentName}`, htmlTools.normalizeDOM2HTML(fragmentEl));
        }

        //TODO: find all img data url(s) and save them as images

        await this.writeFile(`${FRMDB_ENV_DIR}/${pagePath}`, htmlTools.document2html(cleanedUpDOM));

        setTimeout(() => this.setPageScreenshot(pageOpts), 500);
    }

    async setPageScreenshot(pageOpts: PageOpts) {
        try {
            let img = await this.getPageScreenshot(pageOpts);
            let { tenantName, appName, pageName } = pageOpts;
            console.info('Saving screenshot for ', pageOpts);
            let path = `${tenantName}/${appName}/static/${pageName}.png`;
            await this.writeFile(`${FRMDB_ENV_DIR}/${path}`, img);
            console.info('saved ', path);
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async getLookCss(pageOpts: PageOpts): Promise<string> {
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
                "--disable-extensions"
            ], // This was important. Can't remember why
        });
        return browser;
    }

    async getPageScreenshot(pageOpts: PageOpts): Promise<Buffer> {
        console.info("generating screenshot for ", pageOpts);
        let url = makeUrlPath(pageOpts);
        console.info("got to page ", url);
        let browser = await this.runPuppeteer();
        const page = await browser.newPage();
        await page.goto('http://localhost:3000' + url);
        console.info("generate screenshot for ", url);
        let img: Buffer = await page.screenshot({ encoding: "binary" });
        console.info("close browser ", url);
        await browser.close();
        return img;
    }

    async getPagePdf(pageOpts: PageOpts): Promise<Buffer> {
        let browser = await this.runPuppeteer();
        const page = await browser.newPage();
        await page.goto('http://localhost:3000' + makeUrlPath(pageOpts));
        let pdf: Buffer = await page.pdf({ format: 'A4' });
        await browser.close();
        return pdf;
    }

    async getPageHtml(pageOpts: PageOpts, dictionaryCache: Map<string, $DictionaryObjT>): Promise<string> {
        let { tenantName, appName, pageName } = pageOpts;
        let pageHtml = await this.readFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/${pageName + '.html' || 'index.html'}`);

        const jsdom = new JSDOM(pageHtml, {}, {
            features: {
                'FetchExternalResources': false,
                'ProcessExternalResources': false
            }
        });
        const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());
        let pageDom = htmlTools.doc.documentElement;
        let pageProps = getPageProperties(htmlTools.doc);

        //<head> is managed like a special type of fragment
        {
            let headEl = pageDom.querySelector('head');
            if (!headEl) throw new Error(`could not find head elem for ${tenantName}/${appName}/${pageName} with html ${pageHtml}`);

            let headHtml = await this.readFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/_head.html`);
            headEl.innerHTML = headHtml.replace('<head>', '').replace('</head>', '');
            setPageProperties(headEl, pageProps);
        }

        for (let fragmentEl of Array.from(pageDom.querySelectorAll('[data-frmdb-fragment]'))) {
            let fragmentName = fragmentEl.getAttribute('data-frmdb-fragment');
            if (!fragmentName) throw new Error("fragmentName not found for" + fragmentEl.outerHTML);

            if (pageOpts.query?.frmdbRender === 'view' && '_scripts.html' === fragmentName) continue;

            let fragmentHtml = await this.readFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/${fragmentName}`);
            let fragmentDom = htmlTools.html2dom(fragmentHtml);
            if (isHTMLElement(fragmentDom)) {
                let savedFragmentName = fragmentDom.getAttribute('data-frmdb-fragment');
                if (savedFragmentName != fragmentName) throw new Error(`Fragment name mismatch: ${savedFragmentName} != ${fragmentName} //// ${fragmentEl.outerHTML} //// ${fragmentHtml} /// ${fragmentDom.outerHTML}`);
                fragmentEl.parentNode!.replaceChild(fragmentDom, fragmentEl);
            }
        }

        if ("_none_" != pageOpts.theme) {
            let themeRulesJson = await this.readFile(`${FRMDB_ENV_DIR}/themes/${pageOpts.theme}.json`);
            let themeRules: ThemeRules = JSON.parse(themeRulesJson);
            await applyTheme(themeRules, pageDom);
        }
        I18N_UTILS.applyLanguageOnCleanHtmlPage(pageDom, pageOpts.lang as I18nLang, dictionaryCache);
        pageDom.lang = pageOpts.lang;

        return htmlTools.document2html(pageDom);
    }

    async deletePage(deletedPagePath: string): Promise<void> {
        let { tenantName, appName, pageName } = parsePageUrl(deletedPagePath);
        await this.delFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/${pageName}.html`);
    }

    async saveMediaObject(tenantName: string, appName: string, fileName: string, base64Content: string): Promise<void> {
        await this.writeFile(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/static/${fileName}`, new Buffer(base64Content, 'base64'));
    }

    async saveIcon(tenantName: string, appName: string, iconId: string): Promise<string> {
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

    async getMediaObjects(tenantName: string, appName: string) {
        return this.listDir(`${FRMDB_ENV_DIR}/${tenantName}/${appName}/static`);
    }

    async getAvailableIcons(tenantName: string, appName: string): Promise<$IconObjT[]> {
        let iconNames = await this.listDir(`${FRMDB_ENV_DIR}/icons/svg`);
        return iconNames.map(i => ({ _id: i.replace(/^.*\/svg\//, '').replace(/\.svg$/, '') }))
    }

    async getApps(tenantName: string, appName: string): Promise<$AppObjT[]> {
        let appDirs = await this.listDir(`${FRMDB_ENV_DIR}/${tenantName}`);
        return appDirs.map(i => ({ _id: i.replace(/^.*\//, '') }))
    }

    async getPages(tenantName: string, appName: string): Promise<$PageObjT[]> {
        let ret: $PageObjT[] = [];
        let pageFiles = await this.listDir(`${FRMDB_ENV_DIR}/${tenantName}/${appName}`, /\.html$/);
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

            let pageObj: $PageObjT = {
                _id: `${tenantName}/${appName}/${pageName}`,
                name: pageName,
                ...getPageProperties(htmlTools.doc),
                screenshot: `/formuladb-env/${tenantName}/${appName}/static/${pageName}.png`,
            }
            ret.push(pageObj);
        };
        return ret;
    }

    async getTables(tenantName: string, appName: string): Promise<Entity[]> {
        let schema = await this.getSchema(tenantName, appName);
        if (!schema) return [];

        return Object.values(schema.entities)
            // .filter(e => ! [$App._id, $Table._id, $Page._id, $Icon._id, $Image._id].includes(e._id))
            ;
    }

    async saveMediaObjectInGcloud(tenantName: string, appName: string, mediaType: string, name: string, base64Content: string): Promise<void> {

        let newGcFile = STORAGE.bucket('formuladb-env/static-assets').file(`${this.envName}/${tenantName}/${appName}/${name}`);

        await new Promise((resolve, reject) => {
            let stream = newGcFile.createWriteStream({
                resumable: false,
                validation: false,
                contentType: "text/html",
                metadata: {
                    'Cache-Control': 'public, max-age=31536000'
                }
            });
            stream.write(new Buffer(base64Content, 'base64'))
            stream.end();
            stream.on("finish", () => resolve(true));
            stream.on("error", reject);
        });
    }
}


const exec = require('child_process').exec;
async function execShell(cmd: string): Promise<{ error: Error, stdout: string | Buffer, stderr: string | Buffer }> {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            }
            resolve({ error, stdout, stderr });
        });
    });
}
