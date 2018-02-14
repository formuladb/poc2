import * as _ from 'lodash';
import { Inventory__Product, Inventory__Order } from "../../test/mocks/inventory-metadata";
import { Forms__ServiceForm } from "../../test/mocks/forms-metadata";
import { TableProperty, Entity, queryEntityWithDeepPath, propertiesOfEntity, extendEntityProperties, EntityProperties } from "./entity";

describe('entity', () => {
  beforeEach(() => {
  });

  it('should get entity properties from deep path', () => {
    let props = queryEntityWithDeepPath(Inventory__Product as Entity, '/Inventory/Product/inventoryLocation/@');
    expect(props).toEqual(propertiesOfEntity(Inventory__Product.inventoryLocation as TableProperty));
  });


  it('extendEntityProperties should correctly extend entities', () => {
    let expected = {
      ... _.cloneDeep(Forms__ServiceForm.service_form_units),
      items: _.cloneDeep(Inventory__Order.items)
    };
    extendEntityProperties(Forms__ServiceForm.service_form_units as TableProperty, propertiesOfEntity(Inventory__Order));

    expect(Forms__ServiceForm.service_form_units).toEqual(expected);
  });
});
