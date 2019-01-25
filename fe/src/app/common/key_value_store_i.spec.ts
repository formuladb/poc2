/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

 import * as _ from 'lodash';

import { KeyObjStoreI, KeyValueStoreArrayKeys, AddHocQuery } from "./key_value_store_i";
import { SumReduceFunN } from "./domain/metadata/reduce_functions";
import { query } from "@angular/core/src/render3/query";
declare var emit: any;

export interface KeyValueStoreSpecObjType {
    _id: string;
    categ?: string;
    subcateg?: string;
    val: number;
}
export function keyValueStoreSpecs<KVSType extends KeyObjStoreI<KeyValueStoreSpecObjType>>(context: { kvs: KVSType }) {
    let kvs: KVSType;

    describe('KeyObjStoreI', () => {
        beforeEach(async (done) => {
            kvs = context.kvs;
            await kvs.clearDB();
            done();
        });

        it('rangeQuery for views', async (done) => {
            let kvsa = new KeyValueStoreArrayKeys(kvs);
            kvsa.set(["a"], {_id: "a", val: 2});
            kvsa.set(["b","c"], {_id: "b_c", val: 3});
            kvsa.set(["b","d"], {_id: "b_d", val: 4});
            kvsa.set(["b","e"], {_id: "b_e", val: 5});

            let res: any;
            res = await kvsa.rangeQuery({inclusive_start: false, startkey: ["b","c"], inclusive_end: false, endkey: ["b","e"]});
            expect(res).toEqual([{_id: "b_d", val: 4}]);
            res = await kvsa.rangeQuery({inclusive_start: true, startkey: ["b","c"], inclusive_end: false, endkey: ["b","e"]});
            expect(res).toEqual([{_id: "b_c", val: 3}, {_id: "b_d", val: 4}]);
            res = await kvsa.rangeQuery({inclusive_start: true, startkey: ["b","c"], inclusive_end: true, endkey: ["b","e"]});
            expect(res).toEqual([{_id: "b_c", val: 3}, {_id: "b_d", val: 4}, {_id: "b_e", val: 5}]);
            res = await kvsa.rangeQuery({inclusive_start: true, startkey: ["\u0000"], inclusive_end: true, endkey: ["b","e"]});
            expect(res).toEqual([{_id: "a", val: 2}, {_id: "b_c", val: 3}, {_id: "b_d", val: 4}, {_id: "b_e", val: 5}]);

            done();
        });

        fit('run adHocQueries', async (done) => {
            await kvs.put({_id: 'o1', categ: 'C1', subcateg: 'sc1', val: 1});
            await kvs.put({_id: 'o2', categ: 'C1', subcateg: 'sc2', val: 2});
            await kvs.put({_id: 'o3', categ: 'C2', subcateg: 'sc1', val: 3});
            await kvs.put({_id: 'o4', categ: 'C2', subcateg: 'sc2', val: 4});

            let query1: AddHocQuery = {
                filters: [{colName: 'val', op: '>', value: 0}],
                groupColumns: ['categ'],
                groupAggs: [{alias: 'sumVal', reduceFun: {name: SumReduceFunN}, colName: 'val'}],
                groupFilters: [{colName: 'categ', op: '==', value: 'C1'}],
                columns: ['categ', 'sumVal'],
                sortColumns: [],
            };
            let objs = await kvs.adHocQuery(query1);
            expect(objs).toEqual([{
                categ: 'C1',
                sumVal: 3
            }]);

            await kvs.put({_id: 'o5', categ: 'xx', subcateg: 'Hello', val: 120});

            query1.columns.push({
                alias: 'xx',
                subquery: {
                    filters: [{colName: 'categ', op: '==', value: "xx"}],
                    groupColumns: [],
                    groupAggs: [],
                    groupFilters: [],
                    columns: ['subcateg'],
                    sortColumns: [],
                },
            });
            query1.groupColumns.push('xx');

            objs = await kvs.adHocQuery(query1);
            expect(objs).toEqual([{
                categ: 'C1',
                sumVal: 3,
                xx: 'Hello',
            }]);

            done();
        });

    });
}
