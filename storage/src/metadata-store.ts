import { App } from "@domain/app";
import { Schema, Entity, isEntity, Pn } from "@domain/metadata/entity";
import { KeyValueStoreFactoryI, KeyObjStoreI } from "@storage/key_value_store_i";
import * as _ from "lodash";
import * as fs from 'fs';
import * as jsyaml from 'js-yaml';
import { $User, $Dictionary } from "@domain/metadata/default-metadata";

const { JSDOM } = require('jsdom');
import { HTMLTools, isHTMLElement } from "@core/html-tools";

import { Storage } from '@google-cloud/storage';
import { cleanupDocumentDOM } from "@fe/get-html";
const STORAGE = new Storage({
    projectId: "seismic-plexus-232506",
});

const os = require('os');
const path = require('path');

const ROOT = process.env.FRMDB_SPECS ? '/tmp/frmdb-metadata-store-for-specs' : '/wwwroot/git/formuladb-env';
const TENANT_NAME = 'apps';

export interface SchemaEntityList {
    _id: string;
    entityIds: string[];
}

export class MetadataStore {
    constructor(private envName: string, public kvsFactory: KeyValueStoreFactoryI) { }

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
                let retFiles = files.map(file => `${directoryPath.slice('/wwwroot/git'.length)}/${file}`);
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
        await this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/app.yaml`, this.toYaml(app));

        return app;
    }
    async putSchema(tenantName: string, appName: string, schema: Schema): Promise<Schema> {
        await Promise.all(Object.values(schema.entities)
            .map(entity => this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/${entity._id}.yaml`,
                this.toYaml(entity)))
            .concat(this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/schema.yaml`, this.toYaml({
                _id: schema._id,
                entityIds: Object.keys(schema.entities),
            })))
        );

        return schema;
    }

    public async getSchema(tenantName: string, appName: string): Promise<Schema | null> {
        let schemaNoEntities: SchemaEntityList = this.fromYaml(
            await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/schema.yaml`)
        );
        let entitiesStr: string[] = await Promise.all(schemaNoEntities.entityIds.map(entityId =>
            this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/${entityId}.yaml`)
        ));
        let entities: Entity[] = entitiesStr.map(entityStr => this.fromYaml(entityStr));

        let entitiesDictionary = entities.reduce((acc, ent, i) => {
            acc[ent._id] = ent; return acc;
        }, {});

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
        let str = await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/${entityId}.yaml`);
        let entity: Entity = this.fromYaml(str);
        return entity;
    }

    public async putEntity(tenantName: string, appName: string, entity: Entity): Promise<Entity> {
        await this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/${entity._id}.yaml`, this.toYaml(entity))

        return entity;
    }

    public async delEntity(tenantName: string, appName: string, entityId: string): Promise<Entity> {
        let schemaNoEntities: SchemaEntityList = this.fromYaml(
            await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/schema.yaml`)
        );
        schemaNoEntities.entityIds = schemaNoEntities.entityIds.filter(e => e != entityId);
        await this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/schema.yaml`, this.toYaml(schemaNoEntities));

        let entityFile = `${ROOT}/${TENANT_NAME}/${appName}/${entityId}.yaml`;
        let entity: Entity = await this.fromYaml<Entity>(entityFile);
        await this.delFile(entityFile);

        return entity;
    }

    async getApp(tenantName: string, appName: string): Promise<App | null> {
        let app: App = this.fromYaml(
            await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/app.yaml`)
        );

        let htmlPages = await this.listDir(`${ROOT}/${tenantName}/${appName}`, /\.html$/);
        app.pages = htmlPages.map(fName => fName.replace(/.*\//, ''));

        return app;
    }

    async newPage(newPageName: string, startTemplateUrl: string) {
        let [tenantName, appName, pageName] = startTemplateUrl.split(/\//).filter(x => x);
        let content = await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/${pageName}`);
        await this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/${newPageName}`, content);
    }

    async savePageHtml(tenantName: string, appName: string, pageName: string, html: string): Promise<void> {

        let pagePath = `${tenantName}/${appName}/${pageName}`;

        const jsdom = new JSDOM(html, {}, {
            features: {
                'FetchExternalResources': false,
                'ProcessExternalResources': false
            }
        });
        const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());

        let cleanedUpDOM = cleanupDocumentDOM(htmlTools.doc);

        //<head> is managed like a special type of fragment
        {
            let headEl = cleanedUpDOM.querySelector('head');
            if (!headEl) throw new Error(`could not find head elem for ${pagePath} with html ${html}`);
            let titleEl = headEl.querySelector('title');
            let headMarker = htmlTools.doc.createElement('head');
            if (titleEl) headMarker.appendChild(titleEl.cloneNode(true));
            cleanedUpDOM.replaceChild(headMarker, headEl);
            await this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/_head.html`, htmlTools.normalizeDOM2HTML(headEl));
        }

        for (let fragmentEl of Array.from(cleanedUpDOM.querySelectorAll('[data-frmdb-fragment]'))) {
            let fragmentName = fragmentEl.getAttribute('data-frmdb-fragment');
            if (!fragmentName) throw new Error("fragmentName not found for" + fragmentEl.outerHTML);
            let fragmentMarker = htmlTools.doc.createElement('div');
            fragmentMarker.setAttribute('data-frmdb-fragment', fragmentName);
            fragmentEl.parentNode!.replaceChild(fragmentMarker, fragmentEl);

            await this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/${fragmentName}`, htmlTools.normalizeDOM2HTML(fragmentEl));
        }

        //TODO: find all img data url(s) and save them as images

        await this.writeFile(`${ROOT}/${TENANT_NAME}/${appName}/${pageName || 'index.html'}`, htmlTools.document2html(cleanedUpDOM));
    }

    async getPageHtml(tenantName: string, appName: string, pageName: string): Promise<string> {
        let pageHtml = await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/${pageName || 'index.html'}`);

        const jsdom = new JSDOM(pageHtml, {}, {
            features: {
                'FetchExternalResources': false,
                'ProcessExternalResources': false
            }
        });
        const htmlTools = new HTMLTools(jsdom.window.document, new jsdom.window.DOMParser());
        let pageDom = htmlTools.doc.documentElement;

        //<head> is managed like a special type of fragment
        {
            let headEl = pageDom.querySelector('head');
            if (!headEl) throw new Error(`could not find head elem for ${tenantName}/${appName}/${pageName} with html ${pageHtml}`);
            let pageTitleEl = headEl.querySelector('title');
            if (pageTitleEl != null) pageTitleEl = pageTitleEl.cloneNode(true) as HTMLTitleElement;

            let headHtml = await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/_head.html`);
            headEl.outerHTML = headHtml;
            let titleEl = headEl.querySelector('title');
            if (pageTitleEl) {
                if (titleEl) titleEl.innerText = pageTitleEl.innerText;
                else headEl.appendChild(pageTitleEl);
            }
        }

        for (let fragmentEl of Array.from(pageDom.querySelectorAll('[data-frmdb-fragment]'))) {
            let fragmentName = fragmentEl.getAttribute('data-frmdb-fragment');
            if (!fragmentName) throw new Error("fragmentName not found for" + fragmentEl.outerHTML);

            let fragmentHtml = await this.readFile(`${ROOT}/${TENANT_NAME}/${appName}/${fragmentName}`);
            let fragmentDom = htmlTools.html2dom(fragmentHtml);
            if (isHTMLElement(fragmentDom)) {
                let savedFragmentName = fragmentDom.getAttribute('data-frmdb-fragment');
                if (savedFragmentName != fragmentName) throw new Error(`Fragment name mismatch: ${savedFragmentName} != ${fragmentName} //// ${fragmentEl.outerHTML} //// ${fragmentHtml} /// ${fragmentDom.outerHTML}`);
                fragmentEl.parentNode!.replaceChild(fragmentDom, fragmentEl);    
            }
        }

        return htmlTools.document2html(pageDom);
    }

    async deletePage(deletedPagePath: string): Promise<void> {
        let [tenantName, appName, pageName] = deletedPagePath.split(/\//).filter(x => x);
        this.delFile(`${ROOT}/${TENANT_NAME}/${appName}/${pageName}`);
    }

    async saveMediaObject(tenantName: string, appName: string, fileName: string, base64Content: string): Promise<void> {
        await this.writeFile(`${ROOT}/static/${tenantName}/${appName}/${fileName}`, new Buffer(base64Content, 'base64'));
    }

    async getMediaObjects(tenantName: string, appName: string) {
        return this.listDir(`${ROOT}/static/${tenantName}/${appName}`);
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
