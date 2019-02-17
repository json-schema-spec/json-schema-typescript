import Registry from "./Registry";
import Schema, { JSONType } from "./Schema";
import Stack from "./Stack";
import StackOverflowError from "./StackOverflowError";
import { ValidationError, ValidationResult } from "./ValidationResult";

import deepEqual = require("deep-equal");

export let EPSILON = 0.001;

export default class Vm {
  private registry: Registry;
  private stack: Stack;
  private errors: ValidationError[];
  private maxStackDepth: number;

  constructor(registry: Registry, maxStackDepth: number) {
    this.registry = registry;
    this.stack = new Stack();
    this.errors = [];
    this.maxStackDepth = maxStackDepth;
  }

  public exec(uri: string, instance: any): ValidationResult {
    this.stack.pushSchema(uri, []);
    const schema = this.registry.get(uri);

    return this.execSchema(schema, instance);
  }

  private execSchema(schema: Schema, instance: any): ValidationResult {
    if (schema.bool) {
      if (!schema.bool.value) {
        this.reportError();
      }

      return new ValidationResult(this.errors);
    }

    if (schema.ref) {
      if (this.stack.schemaDepth() === this.maxStackDepth) {
        throw new StackOverflowError();
      }

      this.stack.pushSchema(schema.ref.baseURI, [...schema.ref.ptr.tokens]);
      this.execSchema(this.registry.getIndex(schema.ref.schema), instance);
      this.stack.popSchema();
    }

    if (schema.not) {
      const notSchema = this.registry.getIndex(schema.not.schema);
      const notErrors = this.pseudoExec(notSchema, instance);

      if (!notErrors) {
        this.stack.pushSchemaToken("not");
        this.reportError();
        this.stack.popSchemaToken();
      }
    }

    if (schema.if) {
      const ifSchema = this.registry.getIndex(schema.if.schema);
      const ifErrors = this.pseudoExec(ifSchema, instance);

      if (!ifErrors && schema.then) {
        const thenSchema = this.registry.getIndex(schema.then.schema);
        this.stack.pushSchemaToken("then");
        this.execSchema(thenSchema, instance);
        this.stack.popSchemaToken();
      } else if (ifErrors && schema.else) {
        const elseSchema = this.registry.getIndex(schema.else.schema);
        this.stack.pushSchemaToken("else");
        this.execSchema(elseSchema, instance);
        this.stack.popSchemaToken();
      }
    }

    if (schema.const) {
      if (!deepEqual(schema.const.value, instance)) {
        this.stack.pushSchemaToken("const");
        this.reportError();
        this.stack.popSchemaToken();
      }
    }

    if (schema.enum) {
      let enumOk = false;
      for (const value of schema.enum.values) {
        if (deepEqual(value, instance)) {
          enumOk = true;
          break;
        }
      }

      if (!enumOk) {
        this.stack.pushSchemaToken("enum");
        this.reportError();
        this.stack.popSchemaToken();
      }
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

      if (schema.multipleOf) {
        if (Math.abs(instance % schema.multipleOf.value) > EPSILON) {
          this.stack.pushSchemaToken("multipleOf");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.maximum) {
        if (instance > schema.maximum.value) {
          this.stack.pushSchemaToken("maximum");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.minimum) {
        if (instance < schema.minimum.value) {
          this.stack.pushSchemaToken("minimum");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.exclusiveMaximum) {
        if (instance >= schema.exclusiveMaximum.value) {
          this.stack.pushSchemaToken("exclusiveMaximum");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.exclusiveMinimum) {
        if (instance <= schema.exclusiveMinimum.value) {
          this.stack.pushSchemaToken("exclusiveMinimum");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }
    } else if (typeof instance === "string") {
      if (schema.type && !schema.type.types.includes(JSONType.String)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }

      // Note regarding the [...instance] stuff in maxLength and minLength:
      //
      // The length property of a JavaScript string is based on UTF-16 (loosely
      // speaking). JSON Schema specifies string length in terms of Unicode
      // codepoints, so we convert the string into an array, a process which is
      // Unicode-codepoint-aware.

      if (schema.maxLength) {
        if ([...instance].length > schema.maxLength.value) {
          this.stack.pushSchemaToken("maxLength");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.minLength) {
        if ([...instance].length < schema.minLength.value) {
          this.stack.pushSchemaToken("minLength");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.pattern) {
        if (!schema.pattern.value.test(instance)) {
          this.stack.pushSchemaToken("pattern");
          this.reportError();
          this.stack.popSchemaToken();
        }
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

          if (schema.additionalItems) {
            const itemSchema = this.registry.getIndex(schema.additionalItems.schema);

            this.stack.pushSchemaToken("additionalItems");
            for (let i = schema.items.schemas.length; i < instance.length; i++) {
              this.stack.pushInstanceToken(i.toString());
              this.execSchema(itemSchema, instance[i]);
              this.stack.popInstanceToken();
            }
            this.stack.popSchemaToken();
          }
        }
      }

      if (schema.maxItems) {
        if (instance.length > schema.maxItems.value) {
          this.stack.pushSchemaToken("maxItems");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.minItems) {
        if (instance.length < schema.minItems.value) {
          this.stack.pushSchemaToken("minItems");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.uniqueItems && schema.uniqueItems.value) {
        let uniqueOk = true;

        loop:
        for (let i = 0; i < instance.length; i++) {
          for (let j = i + 1; j < instance.length; j++) {
            if (deepEqual(instance[i], instance[j])) {
              uniqueOk = false;
              break loop;
            }
          }
        }

        if (!uniqueOk) {
          this.stack.pushSchemaToken("uniqueItems");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.contains) {
        let containsOk = false;
        const itemSchema = this.registry.getIndex(schema.contains.schema);
        for (const elem of instance) {
          const itemErrors = this.pseudoExec(itemSchema, elem);
          if (!itemErrors) {
            containsOk = true;
            break;
          }
        }

        if (!containsOk) {
          this.stack.pushSchemaToken("contains");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }
    } else {
      if (schema.type && !schema.type.types.includes(JSONType.Object)) {
        this.stack.pushSchemaToken("type");
        this.reportError();
        this.stack.popSchemaToken();
      }

      if (schema.maxProperties) {
        if (Object.keys(instance).length > schema.maxProperties.value) {
          this.stack.pushSchemaToken("maxProperties");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.minProperties) {
        if (Object.keys(instance).length < schema.minProperties.value) {
          this.stack.pushSchemaToken("minProperties");
          this.reportError();
          this.stack.popSchemaToken();
        }
      }

      if (schema.required) {
        this.stack.pushSchemaToken("required");
        for (const [index, property] of schema.required.properties.entries()) {
          if (!instance.hasOwnProperty(property)) {
            this.stack.pushSchemaToken(index.toString());
            this.reportError();
            this.stack.popSchemaToken();
          }
        }
        this.stack.popSchemaToken();
      }

      for (const [key, value] of Object.entries(instance)) {
        let isAdditional = true;

        if (schema.properties) {
          this.stack.pushSchemaToken("properties");
          if (schema.properties.schemas.has(key)) {
            const schemaIndex = schema.properties.schemas.get(key)!;
            const propertySchema = this.registry.getIndex(schemaIndex);

            this.stack.pushSchemaToken(key);
            this.stack.pushInstanceToken(key);
            this.execSchema(propertySchema, value);
            this.stack.popInstanceToken();
            this.stack.popSchemaToken();

            isAdditional = false;
          }
          this.stack.popSchemaToken();
        }

        if (schema.patternProperties) {
          this.stack.pushSchemaToken("patternProperties");
          const entries = schema.patternProperties.schemas.entries();
          for (const [[pattern, patternName], schemaIndex] of entries) {
            const propertySchema = this.registry.getIndex(schemaIndex);

            if (pattern.test(key)) {
              this.stack.pushSchemaToken(patternName);
              this.stack.pushInstanceToken(key);
              this.execSchema(propertySchema, value);
              this.stack.popInstanceToken();
              this.stack.popSchemaToken();

              isAdditional = false;
            }
          }
          this.stack.popSchemaToken();
        }

        if (schema.additionalProperties && isAdditional) {
          const propertySchema = this.registry.getIndex(schema.additionalProperties.schema);

          this.stack.pushSchemaToken("additionalProperties");
          this.stack.pushInstanceToken(key);
          this.execSchema(propertySchema, value);
          this.stack.popInstanceToken();
          this.stack.popSchemaToken();
        }
      }
    }

    return new ValidationResult(this.errors);
  }

  private pseudoExec(schema: Schema, instance: any): boolean {
    const prevErrors = [...this.errors];
    this.errors = [];

    this.execSchema(schema, instance);

    const hasErrors = this.errors.length > 0;
    this.errors = prevErrors;

    return hasErrors;
  }

  private reportError() {
    this.errors.push(this.stack.error());
  }
}
