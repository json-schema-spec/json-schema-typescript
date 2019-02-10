import Ptr from "@json-schema-spec/json-pointer";
import { URL } from "whatwg-url";

import Registry from "./Registry";
import { JSONType } from "./Schema";
import Stack from "./Stack";
import { ValidationResult } from "./ValidationResult";

export default class Vm {
  private registry: Registry;
  private stack: Stack;

  constructor(registry: Registry) {
    this.registry = registry;
    this.stack = new Stack();
  }

  public exec(uri: URL | null, instance: any): ValidationResult {
    const schema = this.registry.get(uri);

    const errors = [];

    if (instance === null) {
      if (schema.type && !schema.type.types.includes(JSONType.Null)) {
        errors.push({
          instancePath: new Ptr([]),
          schemaPath: new Ptr(["type"]),
          schemaURI: null,
        });
      }
    } else if (typeof instance === "boolean") {
      if (schema.type && !schema.type.types.includes(JSONType.Boolean)) {
        errors.push({
          instancePath: new Ptr([]),
          schemaPath: new Ptr(["type"]),
          schemaURI: null,
        });
      }
    } else if (typeof instance === "number") {
      let typeOk = false;
      if (schema.type && schema.type.types.includes(JSONType.Integer)) {
        typeOk = Number.isInteger(instance);
      }

      if (!typeOk && schema.type && !schema.type.types.includes(JSONType.Number)) {
        errors.push({
          instancePath: new Ptr([]),
          schemaPath: new Ptr(["type"]),
          schemaURI: null,
        });
      }
    } else if (typeof instance === "string") {
      if (schema.type && !schema.type.types.includes(JSONType.String)) {
        errors.push({
          instancePath: new Ptr([]),
          schemaPath: new Ptr(["type"]),
          schemaURI: null,
        });
      }
    } else if (Array.isArray(instance)) {
      if (schema.type && !schema.type.types.includes(JSONType.Array)) {
        errors.push({
          instancePath: new Ptr([]),
          schemaPath: new Ptr(["type"]),
          schemaURI: null,
        });
      }
    } else {
      if (schema.type && !schema.type.types.includes(JSONType.Object)) {
        errors.push({
          instancePath: new Ptr([]),
          schemaPath: new Ptr(["type"]),
          schemaURI: null,
        });
      }
    }

    return new ValidationResult(errors);
  }
}
