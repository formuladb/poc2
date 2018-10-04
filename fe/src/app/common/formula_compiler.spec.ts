/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import * as _ from 'lodash';
import { BinaryExpression, LogicalExpression } from 'jsep';
import * as jsep from "jsep";

import { Inventory___Product, Inventory___Order } from "./test/mocks/inventory-metadata";
import { Forms___ServiceForm } from "./test/mocks/forms-metadata";
import { Entity, Schema, Pn } from "./domain/metadata/entity";
import { compileFormula, $ee2s, getQueryKeys, extractKeysAndQueriesFromBinaryExpression, extractKeysAndQueriesFromLogicalExpression, $s2e } from "./formula_compiler";
import { KeyValueStoreMem } from "./key_value_store_mem";
import { General___Actor, General___Currency } from './test/mocks/mock-metadata';
import { Sn } from './domain/metadata/stored_procedure';
import { CompiledFormula, MapReduceTrigger, ExecPlanN, 
    CompiledScalarN,
    MapKeyN,
    MapFunctionN,
    MapFunctionAndQueryN,
    MapReduceKeysAndQueriesN,
    MapReduceKeysQueriesAndValueN,
    MapReduceTriggerN,
    CompiledFormulaN,
} from './domain/metadata/execution_plan';
import { matchesTypeES5, evalExprES5, packMapFunctionAndQuery, jsonPathMapGetterExpr, generateMapFunctionAndQuery } from './map_reduce_utils';
import { Fn } from './domain/metadata/functions';
import { MapReduceQueryOptions } from './key_value_store_i';

describe('FormulaCompiler', () => {
    let compiledExpr;
    let expectedCompiledExpr;
    let trigger1: MapReduceTrigger;
    let trigger2: MapReduceTrigger;
    let formula: string;
    let compiledFormula: CompiledFormula;
    let expectedcCompiledFormula: CompiledFormula;

    beforeEach(() => {
    });

    it('should stringify parsed expressions', () => {
        let test_e2sExpr = Fn.EOMONTH(`$ROW$.bT`, `-1`) + `< cT`;
        expect(jsep(test_e2sExpr).origExpr).toEqual(Fn.EOMONTH(`$ROW$.bT`, `-1`) + `< cT`);
    });

    it('should extract keys from binary expressions operand', () => {
        let test_getQuery;
        expect($ee2s(getQueryKeys('==', $s2e(`X`))))
            .toEqual({ startkeyExpr: [`X`], endkeyExpr: [`X`], inclusive_start: true, inclusive_end: true });
        expect($ee2s(getQueryKeys('==', $s2e(`X`), true)))
            .toEqual({ startkeyExpr: [`X`], endkeyExpr: [`X`], inclusive_start: true, inclusive_end: true });

        expect($ee2s(getQueryKeys('<', $s2e(`X`), false)))
            .toEqual({ startkeyExpr: [`''`], endkeyExpr: [`X`], inclusive_start: false, inclusive_end: false });
        expect($ee2s(getQueryKeys('<', $s2e(`X`), true)))
            .toEqual({ startkeyExpr: [`X`], endkeyExpr: [`'ZZZZZ'`], inclusive_start: false, inclusive_end: false });

        expect($ee2s(getQueryKeys('<=', $s2e(`X`), false)))
            .toEqual({ startkeyExpr: [`''`], endkeyExpr: [`X`], inclusive_start: false, inclusive_end: true });
        expect($ee2s(getQueryKeys('<=', $s2e(`X`), true)))
            .toEqual({ startkeyExpr: [`X`], endkeyExpr: [`'ZZZZZ'`], inclusive_start: true, inclusive_end: false });

        expect($ee2s(getQueryKeys('>', $s2e(`X`), false)))
            .toEqual({ startkeyExpr: [`X`], endkeyExpr: [`'ZZZZZ'`], inclusive_start: false, inclusive_end: false });
        expect($ee2s(getQueryKeys('>', $s2e(`X`), true)))
            .toEqual({ startkeyExpr: [`''`], endkeyExpr: [`X`], inclusive_start: false, inclusive_end: false });

        expect($ee2s(getQueryKeys('>=', $s2e(`X`), false)))
            .toEqual({ startkeyExpr: [`X`], endkeyExpr: [`'ZZZZZ'`], inclusive_start: true, inclusive_end: false });
        expect($ee2s(getQueryKeys('>=', $s2e(`X`), true)))
            .toEqual({ startkeyExpr: [`''`], endkeyExpr: [`X`], inclusive_start: false, inclusive_end: true });

    });

    it('should extract map reduce keys and queries from binary expressions', () => {
        let test_logicalBinOpExpr = Fn.EOMONTH(`$ROW$.bT`, `-1`) + `< cT`;
        compiledExpr = $ee2s(extractKeysAndQueriesFromBinaryExpression($s2e(test_logicalBinOpExpr) as BinaryExpression, { targetEntityName: '', targetPropertyName: '' }));
        expectedCompiledExpr = {
            "type_": "MapReduceKeysAndQueriesN",
            "rawExpr": "EOMONTH($ROW$.bT,-1)< cT",
            "mapreduceAggsOfManyObservablesQueryableFromOneObs": {
                "map": {
                    "keyExpr": ["cT"],
                    "query": {
                        "startkeyExpr": ["EOMONTH($ROW$.bT,-1)"],
                        "endkeyExpr": ["'ZZZZZ'"],
                        "inclusive_start": false,
                        "inclusive_end": false
                    }
                }
            },
            "mapObserversImpactedByOneObservable": {
                "keyExpr": ["EOMONTH($ROW$.bT,-1)"],
                "query": {
                    "startkeyExpr": ["''"],
                    "endkeyExpr": ["cT"],
                    "inclusive_start": false,
                    "inclusive_end": false
                }
            }
        }
        expect(expectedCompiledExpr).toEqual(compiledExpr);

        test_logicalBinOpExpr = `cT <= ` + Fn.EOMONTH(`$ROW$.bT`, "0");
        compiledExpr = $ee2s(extractKeysAndQueriesFromBinaryExpression($s2e(test_logicalBinOpExpr) as BinaryExpression, { targetEntityName: '', targetPropertyName: '' }));
        expectedCompiledExpr = {
            "type_": "MapReduceKeysAndQueriesN",
            "rawExpr": "cT <= EOMONTH($ROW$.bT,0)",
            "mapreduceAggsOfManyObservablesQueryableFromOneObs": {
                "map": {
                    "keyExpr": ["cT"],
                    "query": {
                        "startkeyExpr": ["''"],
                        "endkeyExpr": ["EOMONTH($ROW$.bT,0)"],
                        "inclusive_start": false,
                        "inclusive_end": true
                    }
                }
            },
            "mapObserversImpactedByOneObservable": {
                "keyExpr": ["EOMONTH($ROW$.bT,0)"],
                "query": {
                    "startkeyExpr": ["cT"],
                    "endkeyExpr": ["'ZZZZZ'"],
                    "inclusive_start": true,
                    "inclusive_end": false
                }
            }
        }
        expect(expectedCompiledExpr).toEqual(compiledExpr);

        test_logicalBinOpExpr = `aX >` + Fn.SQRT(`$ROW$.bX`);
        compiledExpr = $ee2s(extractKeysAndQueriesFromBinaryExpression($s2e(test_logicalBinOpExpr) as BinaryExpression, { targetEntityName: '', targetPropertyName: '' }));
        expectedCompiledExpr = {
            "type_": "MapReduceKeysAndQueriesN",
            "rawExpr": "aX >SQRT($ROW$.bX)",
            "mapreduceAggsOfManyObservablesQueryableFromOneObs": {
                "map": {
                    "keyExpr": ["aX"],
                    "query": {
                        "startkeyExpr": ["SQRT($ROW$.bX)"],
                        "endkeyExpr": ["'ZZZZZ'"],
                        "inclusive_start": false,
                        "inclusive_end": false
                    }
                }
            },
            "mapObserversImpactedByOneObservable": {
                "keyExpr": ["SQRT($ROW$.bX)"],
                "query": {
                    "startkeyExpr": ["''"],
                    "endkeyExpr": ["aX"],
                    "inclusive_start": false,
                    "inclusive_end": false
                }
            }
        }
        expect(expectedCompiledExpr).toEqual(compiledExpr);

        test_logicalBinOpExpr = `aX >=` + Fn.SQRT(`$ROW$.bX`);
        compiledExpr = $ee2s(extractKeysAndQueriesFromBinaryExpression($s2e(test_logicalBinOpExpr) as BinaryExpression, { targetEntityName: '', targetPropertyName: '' }));
        expectedCompiledExpr = {
            "type_": "MapReduceKeysAndQueriesN",
            "rawExpr": "aX >=SQRT($ROW$.bX)",
            "mapreduceAggsOfManyObservablesQueryableFromOneObs": {
                "map": {
                    "keyExpr": ["aX"],
                    "query": {
                        "startkeyExpr": ["SQRT($ROW$.bX)"],
                        "endkeyExpr": ["'ZZZZZ'"],
                        "inclusive_start": true,
                        "inclusive_end": false
                    }
                }
            },
            "mapObserversImpactedByOneObservable": {
                "keyExpr": ["SQRT($ROW$.bX)"],
                "query": {
                    "startkeyExpr": ["''"],
                    "endkeyExpr": ["aX"],
                    "inclusive_start": false,
                    "inclusive_end": true
                }
            }
        }
        expect(expectedCompiledExpr).toEqual(compiledExpr);
    })

    it('should extract map reduce keys and queries from logical expressions', () => {
        let test_logicalExpression = Fn.EOMONTH(`$ROW$.bT1`, `-1`) + `< cT && cT <= ` + Fn.EOMONTH(`$ROW$.bT2`, "0");
        expect(function () {
            compiledExpr = $ee2s(extractKeysAndQueriesFromLogicalExpression($s2e(test_logicalExpression) as LogicalExpression,
                { targetEntityName: '', targetPropertyName: '' }));
        }).toThrow();
        expectedCompiledExpr = {
            "type_": "MapReduceKeysAndQueriesN",
            "rawExpr": "SQRT($ROW$.bX1)==cX && cY <= FACT($ROW$.bY2)",
            "mapreduceAggsOfManyObservablesQueryableFromOneObs": {
                "map": {
                    "keyExpr": ["cT"],
                    "query": {
                        "startkeyExpr": ["EOMONTH($ROW$.bT1,-1)"],
                        "endkeyExpr": ["EOMONTH($ROW$.bT2,0)"],
                        "inclusive_end": true
                    }
                }
            },
            "mapObserversImpactedByOneObservable": {
                "keyExpr": ["EOMONTH($ROW$.bT1,-1)"],
                "query": {
                    "startkeyExpr": ["''"],
                    "endkeyExpr": ["cT"],
                    "inclusive_end": false
                }
            }
        }
        // expect(expectedCompiledExpr).toThrow();

        test_logicalExpression = Fn.SQRT(`$ROW$.bX1`) + `== cX && cY <= ` + Fn.FACT(`$ROW$.bY2`);
        compiledExpr = $ee2s(extractKeysAndQueriesFromLogicalExpression($s2e(test_logicalExpression) as LogicalExpression, { targetEntityName: '', targetPropertyName: '' }));
        expectedCompiledExpr = {
            "type_": "MapReduceKeysAndQueriesN",
            "rawExpr": "SQRT($ROW$.bX1)== cX && cY <= FACT($ROW$.bY2)",
            "mapreduceAggsOfManyObservablesQueryableFromOneObs": {
                "map": {
                    "keyExpr": ["cX", "cY"],
                    "query": {
                        "startkeyExpr": ["SQRT($ROW$.bX1)", "''"],
                        "endkeyExpr": ["SQRT($ROW$.bX1)", "FACT($ROW$.bY2)"],
                        "inclusive_start": true,
                        "inclusive_end": true
                    }
                }
            },
            "mapObserversImpactedByOneObservable": {
                "keyExpr": ["SQRT($ROW$.bX1)", "FACT($ROW$.bY2)"],
                "query": {
                    "startkeyExpr": ["cX", "cY"],
                    "endkeyExpr": ["cX", "'ZZZZZ'"],
                    "inclusive_start": true,
                    "inclusive_end": false
                }
            }
        }
        expect(expectedCompiledExpr).toEqual(compiledExpr);
    });

    xit('should compile test complex formula', () => {
        let test_subFormula1 =
            Fn.SUMIF(`R_A.num`, `aY == $ROW$.bY && ` + Fn.FACT(`aZ`) + ` < ` + Fn.ROUND(Fn.SQRT(`$ROW$.bZ`) + ` + 1`));
        trigger1 = {
            type_: MapReduceTriggerN,
            rawExpr: $s2e(`'V1'`),
            mapreduceAggsOfManyObservablesQueryableFromOneObs: {
                aggsViewName: 'bla',
                map: {
                    entityName: 'R_A',
                    keyExpr: [$s2e(`aY`), $s2e(Fn.FACT(`aZ`))],
                    valueExpr: $s2e(`num`),
                    query: {
                        startkeyExpr: [$s2e(`$ROW$.bY`), $s2e(`''`)],
                        endkeyExpr: [$s2e(`$ROW$.bY`), $s2e(Fn.ROUND(Fn.SQRT(`$ROW$.bZ`)))],
                        inclusive_start: false,
                        inclusive_end: false,
                    }
                },
                reduceFun: '_sum',
            },
            mapObserversImpactedByOneObservable: {
                obsViewName: 'blu',
                entityName: 'R_B',
                keyExpr: [$s2e(`$ROW$.bY`), $s2e(Fn.ROUND(Fn.SQRT(`$ROW$.bZ`)))],
                valueExpr: $s2e(`_id`),
                query: {
                    startkeyExpr: [$s2e(`aY`), $s2e(Fn.FACT(`aZ`))],
                    endkeyExpr: [$s2e(`aY`), $s2e(`''`)],
                    inclusive_start: false,
                    inclusive_end: true,
                }
            }
        };
        trigger1.mapreduceAggsOfManyObservablesQueryableFromOneObs__ = generateMapFunctionAndQuery(trigger1.mapreduceAggsOfManyObservablesQueryableFromOneObs.map);
        trigger1.mapObserversImpactedByOneObservable__ = generateMapFunctionAndQuery(trigger1.mapObserversImpactedByOneObservable);

        let test_subFormula2 =
            "FIXME: Fn.RANK(Fn.GROUP_BY(`R_C`, Fn.EOMONTH(`cT`, `-1`)), Fn.EOMONTH(`$ROW$.bT`, `-1`))";
        trigger2 = {
            type_: MapReduceTriggerN,
            rawExpr: $s2e(`'V2'`),
            mapreduceAggsOfManyObservablesQueryableFromOneObs: {
                aggsViewName: '',
                map: {
                    entityName: 'R_C',
                    keyExpr: [$s2e(Fn.EOMONTH(`cT`, `-1`))],
                    valueExpr: $s2e(`1`),
                    query: {
                        startkeyExpr: [$s2e(`''`)],
                        endkeyExpr: [$s2e(Fn.EOMONTH(`$ROW$.bT`, `-1`))],
                        inclusive_start: false,
                        inclusive_end: false,
                    }
                },
                reduceFun: '_count',
            },
            mapObserversImpactedByOneObservable: {
                obsViewName: '',
                entityName: 'R_B',
                keyExpr: [$s2e(Fn.EOMONTH(`$ROW$.bT`, `-1`))],
                valueExpr: $s2e(`_id`),
                query: {
                    startkeyExpr: [$s2e(Fn.EOMONTH(`cT`, `-1`))],
                    endkeyExpr: [$s2e(Fn.EOMONTH(`cT`, `-1`))],
                    inclusive_start: true,
                    inclusive_end: true,
                }
            },
        };

        let test_complexFormulaExpr = `bX + ` + test_subFormula1 + ` + ` + Fn.TEXT(test_subFormula2, `"00000"`)
        expect(test_complexFormulaExpr)
            .toEqual(`bX + SUMIF(R_A.num,aY == $ROW$.bY && FACT(aZ) < ROUND(SQRT($ROW$.bZ) + 1)) + TEXT(RANK(GROUP_BY(R_C,EOMONTH(cT,-1)),$ROW$.bT),"00000")`);

        compiledFormula = compileFormula('R_B', 'sum__', test_complexFormulaExpr);

        expectedcCompiledFormula = {
            type_: CompiledFormulaN,
            targetEntityName: 'R_B',
            targetPropertyName: 'sum__',
            triggers: [trigger1],
            rawExpr: $s2e(`V1`),
        };

        expect(compiledFormula).toEqual(expectedcCompiledFormula);
    });

    it('should compile mock schema correctly', () => {
        // Forms___ServiceForm.code.formula
    });

});