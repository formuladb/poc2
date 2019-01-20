/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import * as metadata from './mock-metadata';
import { Entity, Pn } from '../../domain/metadata/entity'
import { Form, NodeType } from '../../domain/uimetadata/form'
import { Forms___ServiceForm } from "./forms-metadata";
import { REP___LargeSales } from './reports-metadata';

let testUUID = 1;
function getTestUUID() {
  return 'uuid' + ++testUUID;
}

export var REP___LargeSales_Form: Form = {
  _id: "Form_:REP___LargeSales",
  "grid": {
    nodeType: NodeType.form_grid,
    childNodes: [
      {
        nodeType: NodeType.form_grid_row,
        childNodes: [
          {
            nodeType: NodeType.form_input,
            propertyName: "client",
            "propertyType": Pn.STRING,
            _id: "7x8JM1B39JihWrCoX6B64K"
          },
          {
            nodeType: NodeType.form_datepicker,
            propertyName: "month",
            _id: "oBuxsDC9wUamzQ9Ft2M3Ja"
          }
        ],
        _id: "fVmzojRQqQSeAWJzQtjf9h"
      },
      {
        nodeType: NodeType.form_grid_row,
        childNodes: [
          {
            nodeType: NodeType.form_chart,
            tableName: "largeSales",
            chartType: "bar-vertical",
            width: 850,
            height: 450,
            xPropertyName: "productName",
            yPropertyName: "largeSalesValue",
            groupByPropertyName: undefined,
            _id: "7x8JM1B39JihWrCoX6B64z"
          },
        ],
        _id: "fVmzojRQqQSeAWJzQtjf9h"
      },
      {
        nodeType: NodeType.form_grid_row,
        childNodes: [
          {
            nodeType: NodeType.form_table,
            "tableName": "largeSales",
            childNodes: [
              {
                nodeType: NodeType.form_input,
                propertyName: "productLocationId",
                "propertyType": Pn.STRING,
                _id: "9fGmxqFEtxP9ypQYzJ9Uoe"
              },
              {
                nodeType: NodeType.form_input,
                propertyName: "productLocationId",
                "propertyType": Pn.STRING,
                _id: "4x12CPz2SRTasvTpEgA37G"
              },
              {
                nodeType: NodeType.form_input,
                propertyName: "largeSalesValue",
                "propertyType": Pn.NUMBER,
                _id: "hy94dLU9CNYrKnJxyhAvGa"
              },
              {
                nodeType: NodeType.form_input,
                propertyName: "_id",
                "propertyType": Pn.STRING,
                _id: "qZULQDuppbY1C9MVVdMsz5"
              }
            ],
            _id: "qwYyqnVcDkExQDrsc8sBKP"
          }
        ],
        _id: "6rHs2cBbzYNyfESXeVuqMn"
      },
      {
        nodeType: NodeType.form_grid_row,
        childNodes: [
          {
            nodeType: NodeType.form_input,
            propertyName: "_id",
            "propertyType": Pn.STRING,
            _id: "vpSLco8jAdLXDzDo9FDxp6"
          }
        ],
        _id: "sVg53VC62sxpNRcUyDSDJn"
      }
    ],
    _id: "4RGwA8vWTYzYTVTUZnxjXb"
  }
};