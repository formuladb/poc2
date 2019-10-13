/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Entity, isFormulaProperty, Schema, FormulaValidation, Pn } from "@domain/metadata/entity";
import { SchemaDAO } from "@domain/metadata/schema_dao";
import { DataObj, parseDataObjId, isNewDataObjId } from "@domain/metadata/data_obj";
import { CircularJSON } from "@domain/json-stringify";

import { FrmdbEngineStore, RetryableError } from "./frmdb_engine_store";

import * as events from "@domain/event";
import * as _ from 'lodash';
import { SchemaCompiler } from "./schema_compiler";
import { generateUUID } from "@domain/uuid";
import { FrmdbEngineTools } from "./frmdb_engine_tools";
import { FrmdbTransactionRunner } from "./frmdb_transaction_runner";

export class FrmdbEngine {
    private transactionRunner: FrmdbTransactionRunner;
    private schemaDAO: SchemaDAO;
    public frmdbEngineTools: FrmdbEngineTools;
    constructor(public frmdbEngineStore: FrmdbEngineStore) {
        this.schemaDAO = new SchemaCompiler(this.frmdbEngineStore.schema).compileSchema();
        this.frmdbEngineTools = new FrmdbEngineTools(this.schemaDAO);
        this.transactionRunner = new FrmdbTransactionRunner(this.frmdbEngineStore, this.frmdbEngineTools);
    }

    public async init(installFormulas: boolean = true) {
        console.log("init store...");
        await this.frmdbEngineStore.init(this.frmdbEngineStore.schema);
        console.log("Starting FormulaDBEngine...");

        for (let ent of this.schemaDAO.entities()) {
            for (let prop of _.values(ent.props)) {
                if (isFormulaProperty(prop)) {
                    if (prop.compiledFormula_ && installFormulas) {
                        await this.frmdbEngineStore.installFormula(prop.compiledFormula_);
                    } else console.warn("Found formula property that is not compiled: ", prop);
                }
            }
        };
    }

    public async putSchema(schema: Schema): Promise<Schema> {
        await this.frmdbEngineStore.kvsFactory.metadataStore.putSchema(this.frmdbEngineStore.tenantName, this.frmdbEngineStore.appName, schema);
        this.schemaDAO = new SchemaCompiler(this.frmdbEngineStore.schema).compileSchema();
        this.frmdbEngineTools = new FrmdbEngineTools(this.schemaDAO);
        this.transactionRunner = new FrmdbTransactionRunner(this.frmdbEngineStore, this.frmdbEngineTools);
        return Promise.resolve(schema);
    }

    public processEvent(event: events.MwzEvents): Promise<events.MwzEvent> {
        event._id = Date.now() + '_' + generateUUID();
        console.log(new Date().toISOString() + "|" + event._id + "|BEGIN|" + CircularJSON.stringify(event));

        switch (event.type_) {
            case "ServerEventModifiedFormData":
                return this.transactionRunner.computeFormulasAndSave(event);
            case "ServerEventDeletedFormData":
                return this.transactionRunner.computeFormulasAndSave(event);
            case "ServerEventNewEntity":
                return this.newEntity(event)
            case "ServerEventDeleteEntity":
                return this.deleteEntity(event);
            case "ServerEventPreviewFormula":
                return this.transactionRunner.previewFormula(event);
            case "ServerEventSetProperty":
                return this.transactionRunner.setEntityProperty(event);
            case "ServerEventDeleteProperty":
                return this.transactionRunner.deleteEntityProperty(event);
            case "ServerEventPutPageHtml":
                return this.putPageHtml(event);
            case "ServerEventNewPage":
                return this.newPage(event);
            case "ServerEventDeletePage":
                return this.deletePage(event);
            default:
                return Promise.reject("n/a event");
        }
    }

    private async putPageHtml(event: events.ServerEventPutPageHtml): Promise<events.MwzEvents> {
        await this.frmdbEngineStore.kvsFactory.metadataStore.savePageHtml(event.pagePath, event.pageHtml);
        return event;
    }

    private async newPage(event: events.ServerEventNewPage): Promise<events.MwzEvents> {
        await this.frmdbEngineStore.kvsFactory.metadataStore.newPage(event.newPageName, event.startTemplateUrl);
        return event;
    }

    private async deletePage(event: events.ServerEventDeletePage): Promise<events.MwzEvents> {
        await this.frmdbEngineStore.kvsFactory.metadataStore.deletePage(event.deletedPagePath);
        return event;
    }

    private async newEntity(event: events.ServerEventNewEntity): Promise<events.MwzEvents> {
        if (!event.path.match(/[a-zA-Z_]+/)) return Promise.resolve({...event, state_: "ABORT", notifMsg_: "incorrect table name"});
        let newEntity: Entity = { _id: event.path, props: {} };

        return this.frmdbEngineStore.kvsFactory.metadataStore.putEntity(this.frmdbEngineStore.tenantName, this.frmdbEngineStore.appName, newEntity)
            .then(() => {
                event.notifMsg_ = 'OK';//TODO; if there are errors, update the notif accordingly
                delete event._rev;
                return event;
            })
        ;
    }

    private deleteEntity(event: events.ServerEventDeleteEntity): Promise<events.MwzEvents> {
        return this.frmdbEngineStore.kvsFactory.metadataStore.delEntity(this.frmdbEngineStore.tenantName, this.frmdbEngineStore.appName, event.entityId)
            .then(() => {
                event.notifMsg_ = 'OK';//TODO; if there are errors, update the notif accordingly
                delete event._rev;
                return event;
            })
            ;
    }

    public async putDataObjAndUpdateViews(oldObj: DataObj | null, newObj: DataObj) {
        if (oldObj && oldObj._id !== newObj._id) throw new Error("old and new id(s) do not match " + CircularJSON.stringify({oldObj, newObj}));
        await this.frmdbEngineStore.putDataObj(newObj);
        await this.updateViewsForObj(oldObj, newObj);
    }
    public async updateViewsForObj(oldObj: DataObj | null, newObj: DataObj) {
        if (oldObj && oldObj._id !== newObj._id) throw new Error("old and new id(s) do not match " + CircularJSON.stringify({oldObj, newObj}));
        for (let formulaTriggeredByObj of this.schemaDAO.getFormulasTriggeredByObj(newObj._id)) {

            for (let triggerOfFormula of formulaTriggeredByObj.formula.triggers || []) {
                let viewUpdates = await this.frmdbEngineStore.preComputeViewUpdateForObj(triggerOfFormula.mapreduceAggsOfManyObservablesQueryableFromOneObs.aggsViewName, oldObj, newObj);
                await this.frmdbEngineStore.updateViewForObj(viewUpdates);
            }
        }

        for (let obsViewName of this.schemaDAO.getObsViewNamesUpdatedByObj(newObj._id)) {
            let viewUpdates = await this.frmdbEngineStore.preComputeViewUpdateForObj(obsViewName, oldObj, newObj);
            await this.frmdbEngineStore.updateViewForObj(viewUpdates);
        }
    }

}
