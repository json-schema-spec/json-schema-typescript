import { URIComponents } from "uri-js";

import Registry from "./Registry";
import Schema, { JSONType } from "./Schema";
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

  public exec(uri: URIComponents, instance: any): ValidationResult {
    console.log("registry", uri, this.registry);
    console.log(this.registry.getIndex(0));
    console.log(this.registry.getIndex(1));
    this.stack.pushSchema(uri, []);
    const schema = this.registry.get(uri);

    return this.execSchema(schema, instance);
  }

  private execSchema(schema: Schema, instance: any): ValidationResult {
    console.log("schema", schema);
    if (schema.bool) {
      if (!schema.bool.value) {
        this.reportError();
      }

      return new ValidationResult(this.errors);
    }

    if (schema.ref) {
      this.stack.pushSchema(schema.ref.baseURI, [...schema.ref.ptr.tokens]);
      this.execSchema(this.registry.getIndex(schema.ref.schema), instance);
      this.stack.popSchema();
    }

    if (instance === null) {
      if (schema.type && !schema.type.types.includes(JSONType.Null)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }
    } else if (typeof instance === "boolean") {
      if (schema.type && !schema.type.types.includes(JSONType.Boolean)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }
    } else if (typeof instance === "number") {
      let typeOk = false;
      if (schema.type && schema.type.types.includes(JSONType.Integer)) {
        typeOk = Number.isInteger(instance);
      }

      if (!typeOk && schema.type && !schema.type.types.includes(JSONType.Number)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }
    } else if (typeof instance === "string") {
      if (schema.type && !schema.type.types.includes(JSONType.String)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }
    } else if (Array.isArray(instance)) {
      if (schema.type && !schema.type.types.includes(JSONType.Array)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }

      if (schema.items) {
        if (schema.items.single) {
          const itemSchema = this.registry.getIndex(schema.items.schemas[0]);

          this.stack.pushSchemaToken("items");
          for (const [index, elem] of instance.entries()) {
            this.stack.pushInstanceToken(index.toString());
            this.execSchema(itemSchema, elem);
            this.stack.popInstanceToken();
          }
          this.stack.popSchemaToken();
        } else {
          this.stack.pushSchemaToken("items");
          for (let i = 0; i < schema.items.schemas.length && i < instance.length; i++) {
            const itemSchema = this.registry.getIndex(schema.items.schemas[i]);
            const elem = instance[i];

            this.stack.pushSchemaToken(i.toString());
            this.stack.pushInstanceToken(i.toString());
            this.execSchema(itemSchema, elem);
            this.stack.popSchemaToken();
            this.stack.popInstanceToken();
          }
          this.stack.popSchemaToken();
        }
      }
    } else {
      if (schema.type && !schema.type.types.includes(JSONType.Object)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }
    }

    return new ValidationResult(this.errors);
  }

  private reportError() {
    this.errors.push(this.stack.error());
  }
}
