/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import { KeyValueObj, SubObj } from "./domain/key_value_obj";
import { Entity, EntityProperty, Schema } from "./domain/metadata/entity";
import { DataObj, DataObjDeepPath } from "./domain/metadata/data_obj";
import { Form } from "./domain/uimetadata/form";
import { Table } from "./domain/uimetadata/table";
import { MwzEvents } from "./domain/event";
import { KeyValueObjStore } from "./key_value_store_i";
import { KeyValueError } from "./domain/key_value_obj";

export class FrmdbStore {
    constructor(protected transactionsDB: KeyValueObjStore, protected dataDB: KeyValueObjStore) { }

    /**
     * UI Actions are Events, Events get sent to the Backend and become Transactions, the same domain model object is both Action/Event/Transaction
     * @param event 
     */
    public putTransaction(event: MwzEvents): Promise<MwzEvents> {
        return this.transactionsDB.put(event);
    }

    public getSchema(): Promise<Schema | null> {
        return this.getObj('FRMDB_SCHEMA');
    }
    public setSchema(schema: Schema): Promise<Schema> {
        return this.dataDB.put(schema);
    }

    public getEntities(): Promise<Entity[]> {
        return this.getSchema().then(s => s ? Object.values(s.entities) : []);
    }

    public async getEntity(path: string): Promise<Entity | null> {
        let schema = await this.getSchema();
        //the Entity's _id is the path
        return schema ? schema.entities[path] : null;
    }

    public getTable(path: string): Promise<Table | null> {
        return this.getObj('Table_:' + path);
    }

    public getForm(path: string): Promise<Form | null> {
        return this.getObj('Form_:' + path);
    }

    public getDataObj(id: string): Promise<DataObj | null> {
        return this.getObj(id);
    }

    public putDataObj<T extends {_id: string}>(obj: T): Promise<DataObj> {
        return this.dataDB.put(obj);
    }

    protected getObj<T extends KeyValueObj>(id: string): Promise<T | null> {
        return this.dataDB.get(id);
    }
    
    public putAllObj<T extends KeyValueObj>(objs: T[]): Promise<(T | KeyValueError)[]> {
        return this.dataDB.putBulk(objs);
    }
}
