/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Injectable, InjectionToken, Inject, NgZone } from '@angular/core';
import * as _ from "lodash";

import { catchError, map, tap } from 'rxjs/operators';
import { CircularJSON } from "@core/json-stringify";

import { DataObj, parseDataObjId, isDataObj, getChildrenPrefix } from "@core/domain/metadata/data_obj";
import { Entity, Pn, Schema, isEntityProperty, isEntity, isSchema } from "@core/domain/metadata/entity";
import { MwzEvents, MwzEvent } from "@core/domain/event";
import { SimpleAddHocQuery } from "@core/key_value_store_i";
import { Table, isTable } from "@core/domain/uimetadata/table";
import { FrmdbEngineTools } from "@core/frmdb_engine_tools";
import { Form, isForm } from "@core/domain/uimetadata/form";
import { HttpClient, HttpResponse } from '@angular/common/http';

import { Observable, of } from 'rxjs';
import { App } from "@core/domain/app";
import { SchemaCompiler } from '@core/schema_compiler';
import { addIdsToForm } from '../components/auto-layout-form';
import { addIdsToTable } from '../components/auto-layout-table';


@Injectable()
export class BackendService {

    public applications: Map<string, App> = new Map();
    private appName: string;
    private frmdbEngineTools: FrmdbEngineTools;
    private notifCallback: (event: MwzEvents) => void;

    constructor(private http: HttpClient) {
    }

    public getFrmdbEngineTools() {
        return this.frmdbEngineTools;
    }

    public async initApplication(
        app: App,
        notifCallback: (event: MwzEvents) => void) {

        this.appName = app._id.replace(/^App~~/, '');
        this.notifCallback = notifCallback;

        let schema = await this.getSchema();
        this.frmdbEngineTools = new FrmdbEngineTools(new SchemaCompiler(schema).compileSchema());

        // TODO: replicate transactions via lon gpolling from all users that modify objects with ids from current table
    }

    // tslint:disable-next-line:member-ordering
    private syncId = '0';
    private syncWithOrbico() {
        this.http.get<Array<any>>(`/model_api/ProductReservation?query=grid_columns&sync_id=${this.syncId}`, { observe: 'response' })
            .pipe(
                catchError(this.handleError('sync ProductReservation'))
            ).subscribe((data: HttpResponse<any[]>) => {
                this.syncId = data.headers.get('last_sync_id') || '0';
                const dataObjs: any[] = [];
                for (const obj of (data.body || [])) {

                    const dataObj: any = { _id: 'REP__DeliveryRate~~' + obj.id };

                    dataObj.orderNb = obj.order_id;
                    dataObj.externalOrderNb =
                        dataObj.orderCreationDate =
                        dataObj.clientCode = obj.client_code;
                    dataObj.client = 'tbd';
                    dataObj.addressCode = 'tbd';
                    dataObj.addressName = 'tbd';
                    dataObj.location = obj.inventory_code;
                    dataObj.productCode = obj.product_code;
                    dataObj.barcode = obj.barcode;
                    dataObj.quantity = obj.quantity;
                    dataObj.quantityError = obj.quantity_error;
                    dataObj.price = 'tbd';

                    dataObj.actor_code = obj.actor_code;
                    dataObj.product_list_id = obj.product_list_id;
                    dataObj.stock = obj.stock;
                    dataObj.reserved_stock = obj.reserved_stock;
                    dataObj.imported_stock = obj.imported_stock;
                    dataObj.updated_at = obj.updated_at;
                    dataObj.created_at = obj.created_at;

                    dataObjs.push(dataObj);
                }
                // this.frm.putAll(dataObjs);
            });
    }

    public putEvent(event: MwzEvents) {
        this.http.post<MwzEvents>('/api/' + this.appName + '/event', event)
            .pipe(
                catchError(this.handleError<MwzEvents>('putEvent', event))
            ).subscribe(ev => this.handleNotif(ev));
    }

    private handleNotif(event: MwzEvents) {
        this.notifCallback(event);
    }

    private async get<T>(url: string, callback: (data: HttpResponse<any[]>) => T): Promise<T> {
        let ret: T = await this.http.get<Array<any>>(url, { observe: 'response' })
            .pipe(
                catchError(this.handleError('get ' + url))
            )
            .toPromise()
            .then((data: HttpResponse<any[]>) => {
                return callback(data);
            });
        return ret;
    }

    public async getApplications(): Promise<Map<string, App> | null> {
        if (this.applications.size == 0) {
            let apps = await this.get<App[] | null>('/api/applications', (data: HttpResponse<any[]>) => {
                return data && data.body;
            });
            if (apps) {
                for (let app of apps) {
                    this.applications.set(app._id.replace(/^App~~/, ''), app);
                }
            }
        }

        return this.applications.size > 0 ? this.applications : null;
    }

    public getTableData(prefix: string): Promise<DataObj[]> {
        return this.get<DataObj[]>('/api/' + this.appName + '/byprefix/' + encodeURIComponent(prefix), (data: HttpResponse<any[]>) => {
            return ((data && data.body) || []);
        });
    }

    public async getDictionary(locale: Exclude<App['locale'], undefined>) {
        let i18nList = await this.getTableData("$I18n~~");
        let dictionary = {};
        for (let i18n of i18nList) {
            dictionary[i18n._id.replace('$I18n~~', '')] = i18n[locale];
        }
        return dictionary;
    }

    public simpleAdHocQuery(entityName: string, query: SimpleAddHocQuery): Promise<any[]> {
        return this.http.post<DataObj[]>('/api/' + this.appName + '/' + entityName + '/simpleadhocquery',
            query).toPromise();
    }

    public async getDataObj(id: string): Promise<DataObj> {
        let http = await this.get<DataObj | null>('/api/' + this.appName + '/obj/' + encodeURIComponent(id), (data: HttpResponse<any[]>) => {
            return data.body as any as DataObj;
        });
        if (!http) throw new Error('Asked for non-existent object ' + id + '.');
        let dataObj = http;
        if (!isDataObj(dataObj)) throw new Error("response is not DataObj " + CircularJSON.stringify(dataObj));

        let { entityName, id: objId, uid: parentUUID } = parseDataObjId(id);
        let entity = await this.getEntity(entityName);
        if (!entity) throw new Error("cannot find entity: " + entityName + ", for getting children");
        for (const prop of Object.values(entity.props)) {
            if (prop.propType_ === Pn.CHILD_TABLE) {
                const subtableData = await this.getTableData(getChildrenPrefix(prop.referencedEntityName, parentUUID));
                dataObj[prop.name] = subtableData;
            }
        }
        return dataObj;
    }

    public async getTable(path: string): Promise<Table | null> {
        let http = await this.get<Table | null>('/api/' + this.appName + '/table/' + encodeURIComponent('ALL^^' + path), (data: HttpResponse<any[]>) => {
            return data.body as any as Table;
        });
        if (!http) return null;
        let ti = http;
        if (!isTable(ti)) throw new Error("response is not Table " + CircularJSON.stringify(ti));
        addIdsToTable(ti);
        return ti;
    }

    public async getForm(path: string): Promise<Form | null> {
        let http = await this.get<Form | null>('/api/' + this.appName + '/form/' + encodeURIComponent('ALL^^' + path), (data: HttpResponse<any[]>) => {
            return data.body as any as Form;
        });
        if (!http) return null;
        let fi = http;
        if (!isForm(fi)) throw new Error("response is not Form " + CircularJSON.stringify(fi));
        addIdsToForm(fi);
        return fi;
    }

    public async getEntities(): Promise<Entity[]> {
        let schema = await this.getSchema();
        return Object.values(schema.entities);
    }

    public async getSchema(): Promise<Schema> {
        let http = await this.get<Schema | null>('/api/' + this.appName + '/schema', (data: HttpResponse<any[]>) => {
            return data.body as any as Schema;
        });
        if (!http) throw new Error("empty schema !");
        if (!isSchema(http)) throw new Error("response is not Schema " + CircularJSON.stringify(http));
        return http;
    }

    public async getEntity(path: string): Promise<Entity> {
        let http = await this.get<Entity>('/api/' + this.appName + '/entity/' + encodeURIComponent(path), (data: HttpResponse<any[]>) => {
            return data.body as any as Entity;
        });
        if (!http) throw new Error("missing Entity " + path);
        if (!isEntity(http)) throw new Error("response is not Entity " + CircularJSON.stringify(http));
        return http;
    }

    /**
     * Handle Http operation that failed.
     * Let the app continue.
     * @param operation - name of the operation that failed
     * @param result - optional value to return as the observable result
     */
    private handleError<T>(operation = 'operation', result?: T) {
        return (error: any): Observable<T> => {

            // TODO: send the error to remote logging infrastructure
            console.error(error); // log to console instead

            // Let the app keep running by returning an empty result.
            return of(result as T);
        };
    }
}
