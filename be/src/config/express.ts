/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

require('hot-debug');
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as proxy from 'http-proxy-middleware';
import * as yaml from 'js-yaml';
import * as csv from 'csv';
import * as mime from 'mime';
import * as serveIndex from 'serve-index';
let debug = require('debug');
const url = require('url');

import * as timeout from 'connect-timeout';

import { FrmdbEngine } from "@core/frmdb_engine";
import { KeyValueStoreFactoryI, KeyTableStoreI } from "@storage/key_value_store_i";
import { FrmdbEngineStore } from "@core/frmdb_engine_store";
import { SimpleAddHocQuery } from "@domain/metadata/simple-add-hoc-query";
import { App } from "@domain/app";
import { Schema } from "@domain/metadata/entity";
import { LazyInit } from "@domain/ts-utils";
import { i18nTranslateText } from "@be/i18n-be";
import { createNewEnvironment, cleanupEnvironment } from "./env-manager";
import { initPassport, handleAuth } from "./auth";
import { setupChangesFeedRoutes, addEventToChangesFeed } from "./changes-feed";
import { searchPremiumIcons, PremiumIconRespose } from "@storage/icon-api";
import { $Dictionary, isMetadataEntity } from "@domain/metadata/default-metadata";
import { simpleAdHocQueryForMetadataEntities } from "./metadata-entities";
import { PageOpts, makeUrlPath } from "@domain/url-utils";

const FRMDB_ENV_ROOT_DIR = process.env.FRMDB_ENV_ROOT_DIR || '/wwwroot/git';
const FRMDB_ENV_DIR = `${FRMDB_ENV_ROOT_DIR}/formuladb-env`;
const FRMDB_DIR = process.env.FRMDB_ENV_ROOT_DIR ? `${process.env.FRMDB_ENV_ROOT_DIR}/formuladb` : '/wwwroot/formuladb';

let frmdbEngines: Map<string, LazyInit<FrmdbEngine>> = new Map();

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
const SECRET = 'bla-bla-secret';

export default function (kvsFactory: KeyValueStoreFactoryI) {
    var app: express.Express = express();

    let coreFrmdbEngine: FrmdbEngine | undefined;
    async function getCoreFrmdbEngine(): Promise<FrmdbEngine> {
        if (coreFrmdbEngine) return coreFrmdbEngine;

        let coreFrmdbEngineInit = new LazyInit(async () => {
            let engine = new FrmdbEngine(new FrmdbEngineStore('frmdb-apps', 'core-formuladb', kvsFactory, {
                _id: "FRMDB_SCHEMA",
                entities: {
                    [$Dictionary._id]: $Dictionary,
                }
            }));
            await engine.init();
            coreFrmdbEngine = engine;
            return engine;
        });
        return coreFrmdbEngineInit.get();
    }

    async function getFrmdbEngine(tenantName: string, appName: string): Promise<FrmdbEngine> {
        let frmdbEngineInit = frmdbEngines.get(appName);
        if (!frmdbEngineInit) {
            frmdbEngineInit = new LazyInit(async () => {
                let schema = await kvsFactory.metadataStore.getSchema(tenantName, appName);
                if (!schema) throw new Error("The app does not exist " + tenantName + "/" + appName);
                let engine = new FrmdbEngine(new FrmdbEngineStore(tenantName, appName, kvsFactory, schema));
                await engine.init();
                return engine;
            })
            frmdbEngines.set(appName, frmdbEngineInit);
        }
        return frmdbEngineInit.get();
    }

    // app.use(logger("dev"));
    app.use(cookieParser(SECRET));
    app.use(require('express-session')({
        secret: SECRET,
        resave: false,
        saveUninitialized: true
    }))

    initPassport(app, kvsFactory);

    app.use(bodyParser.json({ limit: "10mb" }));
    app.use(bodyParser.urlencoded({ limit: "10mb", extended: false }));
    app.use(bodyParser.text({
        limit: "10mb",
        type: ['text/yaml', 'text/csv', 'text/html'], verify: (req, res, buf, encoding) => {
            console.log("TTTTT", buf, encoding, buf.toString(encoding));
        }
    }));

    app.use((req, res, next) => {
        if (req.headers['content-type'] === 'text/yaml') {
            req.body = yaml.safeLoad(req.body);
            next();
        } else if (req.headers['content-type'] === 'text/csv') {
            csv.parse(req.body, { columns: true }, (err, data) => {
                if (err) next(err);
                else {
                    req.body = data;
                    next();
                }
            })
        } else next();
    });

    handleAuth(app);

    app.get('/register', function (req, res, next) {
        if (process.env.FRMDB_IS_PROD_ENV) {
            res.sendFile('/wwwroot/git/formuladb-env/frmdb-apps/formuladb-io/register.html');
        } else {
            next();
        }
    });

    app.post('/register', async (req, res, next) => {
        if (process.env.FRMDB_IS_PROD_ENV) {
            await createNewEnvironment(req.body.environment, req.body.email, req.body.password);
            res.redirect(`https://${req.body.environment}.formuladb.io/`);
        } else {
            next();
        }
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // API (prioritary paths)
    //////////////////////////////////////////////////////////////////////////////////////

    setupChangesFeedRoutes(app, kvsFactory);

    app.delete('/formuladb-api/env/:envname', async function (req, res, next) {
        if (process.env.FRMDB_IS_PROD_ENV) {
            console.log(`Delete called on ${req.params.envname} environment`)
            let status_message = await cleanupEnvironment(req.params.envname);
            console.log(status_message);
            res.end(status_message, null, 4);
        } else {
            next();
        }
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // themes, icons, images & other static content
    //////////////////////////////////////////////////////////////////////////////////////

    app.use('/formuladb-env/', express.static(`${FRMDB_ENV_DIR}/`));

    //////////////////////////////////////////////////////////////////////////////////////
    // apps
    //////////////////////////////////////////////////////////////////////////////////////
    let formuladbEnvStatic = express.static('/wwwroot/git/formuladb-env');

    app.get('/', function (req, res, next) {
        res.redirect(makeUrlPath({
            lang: 'en',
            look: 'cerulean',
            primaryColor: '7795f8',
            secondaryColor: '6c757d',
            tenantName: 'frmdb-apps',
            appName: 'formuladb-io',
            pageName: 'index',
            theme: '_none_',
        }));
    });

    let formuladbIoStatic = express.static(`${FRMDB_ENV_DIR}/frmdb-apps/formuladb-io`, { index: "index.html" });
    app.get('/', formuladbIoStatic);
    app.get('/*.html', formuladbIoStatic);
    app.get('/*.yaml', formuladbIoStatic);

    app.use('/formuladb/', express.static(`${FRMDB_DIR}/`));

    app.get('/:lang-:look-:primary-:secondary-:theme/:tenant/:app/:page.html', async function (req, res, next) {
        let query: PageOpts['query'] = req.query;

        let pageOpts = {
            lang: req.params.lang,
            look: req.params.look,
            primaryColor: req.params.primary,
            secondaryColor: req.params.secondary,
            theme: req.params.theme,
            tenantName: req.params.tenant,
            appName: req.params.app,
            pageName: req.params.page,
            query: req.query,
        };

        if (query?.frmdbRender === "screenshot") {
            let screenshot = await kvsFactory.metadataStore.getPageScreenshot(pageOpts);
            res.set('Content-Type', 'image/png')
            res.send(screenshot);
            return;
        } else if (query?.frmdbRender === "pdf") {
            let pdf = await kvsFactory.metadataStore.getPagePdf(pageOpts);
            res.set('Content-Type', 'application/pdf')
            res.send(pdf);
            return;
        }

        if (query?.frmdbRender != "view" && req.params.page === 'page-components-reference') {
            res.redirect(url.format({
                pathname: req.path,
                query: {
                    ...query,
                    frmdbRender: "view",
                }
            }));
        }
        else if (query?.frmdbRender === "editor") {
            res.set('Content-Type', 'text/html')
            res.sendFile(`${FRMDB_DIR}/editor.html`);
        } else {
            let coreFrmdbEngine = await getCoreFrmdbEngine();
            let dictionaryCache = await coreFrmdbEngine.i18nStore.getDictionaryCache();
            let pageHtml = await kvsFactory.metadataStore.getPageHtml(pageOpts, dictionaryCache);
            res.set('Content-Type', 'text/html')
            res.send(pageHtml);
        }
    });
    app.get('/:lang-:look-:primary-:secondary-:theme/:tenant/:app/formuladb-look.css', async function (req, res, next) {
        let css = await kvsFactory.metadataStore.getLookCss({
            lang: req.params.land,
            look: req.params.look,
            primaryColor: req.params.primary,
            secondaryColor: req.params.secondary,
            theme: req.params.theme,
            tenantName: req.params.tenant,
            appName: req.params.app,
            pageName: `${req.params.page}.html`,
            query: req.query,
        });
        res.set('Content-Type', 'text/css')
        res.send(css);
    });

    app.get('/:lang-:look-:primary-:secondary-:theme/:tenant/:app/:fileName([-_a-zA-Z0-9/]+\.(png|jpg|jpeg|svg|gif|webm|eot|ttf|woff|woff2|otf|css|js)$)', async function (req, res, next) {
        res.redirect(`${req.baseUrl}/formuladb-env/${req.params.tenant}/${req.params.app}/${req.params.fileName}`);
    });
    app.get('/:tenant/:app/:name.yaml', function (req, res, next) {
        formuladbEnvStatic(req, res, next);
    });
    app.get(/^\/formuladb-env\/.*\.(png|jpg|jpeg|svg|gif|webm|eot|ttf|woff|woff2|otf|css|js)$/, timeout('2s'), async function (req, res, next) {
        formuladbEnvStatic(req, res, next);
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Internal Debug APIs
    //////////////////////////////////////////////////////////////////////////////////////

    app.get('/formuladb-api/DEBUG/enabled/:debugValue', async function (req, res, next) {
        try {
            res.send(debug.enabled(req.params.debugValue));
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    app.post('/formuladb-api/DEBUG/:debugValue', async function (req, res, next) {
        try {
            debug.enable(req.params.debugValue);
            res.send(`OK ${req.params.debugValue}`);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // API
    //////////////////////////////////////////////////////////////////////////////////////

    app.get('/formuladb-api/themes', async function (req, res, next) {
        let themes = await kvsFactory.metadataStore.getThemes();
        res.send(themes);
    });

    app.get('/formuladb-api/looks', async function (req, res, next) {
        let looks = await kvsFactory.metadataStore.getLooks();
        res.send(looks);
    });
    
    app.post('/formuladb-api/translate', async (req, res, next) => {
        try {
            let coreFrmdbEngine = await getCoreFrmdbEngine();
            let translations = await i18nTranslateText(coreFrmdbEngine, req.body.texts, req.body.to);
            res.json(translations);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    app.get('/formuladb-api/:tenant/:app', async function (req, res, next) {
        try {
            let app: App | null = await kvsFactory.metadataStore.getApp(req.params.tenant, req.params.app);
            if (!app) throw new Error(`App ${req.params.tenant}/${req.params.app} not found`);
            res.json(app);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    app.get('/formuladb-api/:tenant/:app/schema', async function (req, res, next) {
        try {
            let schema: Schema | null = await kvsFactory.metadataStore.getSchema(req.params.tenant, req.params.app);
            res.json(schema);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    app.get('/formuladb-api/:tenant/:app/media', async function (req, res, next) {
        try {
            let paths: string[] = await kvsFactory.metadataStore.getMediaObjects(req.params.tenant, req.params.app);
            res.json(paths);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    app.get('/formuladb-api/:tenant/:app/premium-icons/:search', async function (req, res, next) {
        try {
            let icons: PremiumIconRespose = await searchPremiumIcons(req.params.search);
            res.send(icons);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    app.post('/formuladb-api/:tenant/:app/:table/SimpleAddHocQuery', async function (req, res, next) {
        try {
            let query = req.body as SimpleAddHocQuery;

            let ret;
            if (isMetadataEntity(req.params.table)) {
                ret = await simpleAdHocQueryForMetadataEntities(req.params.tenant, req.params.app, kvsFactory, req.params.table, query);
            } else {
                ret = await (await getFrmdbEngine(req.params.tenant, req.params.app)).frmdbEngineStore.simpleAdHocQuery(req.params.table, query);
            }
            res.json(ret);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    app.get('/formuladb-api/:tenant/:app/byprefix/:prefix', async function (req, res, next) {
        try {
            let ret = await (await getFrmdbEngine(req.params.tenant, req.params.app)).frmdbEngineStore.getDataListByPrefix(req.params.prefix);
            res.json(ret);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });
    app.get('/formuladb-api/:tenant/:app/obj/:id', async function (req, res, next) {
        try {
            let obj = await (await getFrmdbEngine(req.params.tenant, req.params.app)).frmdbEngineStore.getDataObj(req.params.id);
            res.json(obj);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

    //all write operations are handled via events
    app.post('/formuladb-api/:tenant/:app/event', async function (req, res, next) {
        return (await getFrmdbEngine(req.params.tenant, req.params.app))
            .processEvent(req.body)
            .then(notif => {
                addEventToChangesFeed(notif);
                res.json(notif);
            })
            .catch(err => { console.error(err); next(err) });
    });
    app.post('/formuladb-api/:tenant/:app/reference_to_options/:referencedTableAlias', async function (req, res, next) {
        return (await getFrmdbEngine(req.params.tenant, req.params.app))
            .getOptionsForReferenceToProperties(req.body, req.params.referencedTableAlias)
            .then(optsObjs => {
                res.json(optsObjs);
            })
            .catch(err => { console.error(err); next(err) });
    });

    app.patch('/formuladb-api/:tenant/:app/:id', async function (req, res, next) {
        return (await getFrmdbEngine(req.params.tenant, req.params.app)).frmdbEngineStore.patchDataObj(req.body)
            .then(notif => res.json(notif))
            .catch(err => { console.error(err); next(err) });
    });

    app.put('/formuladb-api/:tenant/:app', async function (req, res, next) {
        return kvsFactory.metadataStore.putApp(req.params.tenant, req.params.app, req.body)
            .then(ret => res.json(ret))
            .catch(err => { console.error(err); next(err) });
    });
    app.put('/formuladb-api/:tenant/:app/schema', async function (req, res, next) {
        if (req.user.role !== 'ADMIN') { res.status(403); return; }
        let schema = req.body;
        let existingSchema = await kvsFactory.metadataStore.getSchema(req.params.tenant, req.params.app);
        if (!existingSchema) {
            await kvsFactory.metadataStore.putSchema(req.params.tenant, req.params.app, schema);
        }

        return (await getFrmdbEngine(req.params.tenant, req.params.app)).frmdbEngineStore.init(schema)
            .then(ret => res.json(ret))
            .catch(err => { console.error(err); next(err) });
    });

    app.put('/formuladb-api/:tenant/:app/bulk', async function (req, res, next) {
        return (await getFrmdbEngine(req.params.tenant, req.params.app)).frmdbEngineStore.putBulk(req.body)
            .then(ret => res.json(ret))
            .catch(err => { console.error(err); next(err) });
    });

    // catch 404 and forward to error handler
    app.use((req: express.Request, res: express.Response, next: Function): void => {
        res.status(404).send('Not found');
    });

    // production error handler
    app.use((err: any, req: express.Request, res: express.Response, next): void => {
        res.status(err.status || 500).json({
            message: err.message,
            error_: err
        });
    });

    return app;
};
