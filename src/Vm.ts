import Ptr from "@json-schema-spec/json-pointer";
import { URL } from "whatwg-url";

import Registry from "./Registry";
import { JSONType } from "./Schema";
import Stack from "./Stack";
import { ValidationError, ValidationResult } from "./ValidationResult";

export default class Vm {
  private registry: Registry;
  private stack: Stack;
  private errors: ValidationError[];

  constructor(registry: Registry) {
    this.registry = registry;
    this.stack = new Stack();
    this.errors = [];
  }

  public exec(uri: URL | null, instance: any): ValidationResult {
    this.stack.pushSchema(uri, []);
    const schema = this.registry.get(uri);

    const errors = [];

    if (instance === null) {
      if (schema.type && !schema.type.types.includes(JSONType.Null)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchematoken();
      }
    } else if (typeof instance === "boolean") {
      if (schema.type && !schema.type.types.includes(JSONType.Boolean)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchematoken();
      }
    } else if (typeof instance === "number") {
      let typeOk = false;
      if (schema.type && schema.type.types.includes(JSONType.Integer)) {
        typeOk = Number.isInteger(instance);
      }

      if (!typeOk && schema.type && !schema.type.types.includes(JSONType.Number)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchematoken();
      }
    } else if (typeof instance === "string") {
      if (schema.type && !schema.type.types.includes(JSONType.String)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchematoken();
      }
    } else if (Array.isArray(instance)) {
      if (schema.type && !schema.type.types.includes(JSONType.Array)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchematoken();
      }
    } else {
      if (schema.type && !schema.type.types.includes(JSONType.Object)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchematoken();
      }
    }

    return new ValidationResult(this.errors);
  }

  private reportError() {
    this.errors.push(this.stack.error());
  }
}
