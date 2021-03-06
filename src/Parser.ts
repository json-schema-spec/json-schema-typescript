import Ptr from "@json-schema-spec/json-pointer";
import * as URI from "uri-js";

import InvalidSchemaError from "./InvalidSchemaError";
import Registry from "./Registry";
import Schema, { parseJSONType, SchemaDependency } from "./Schema";

export default class Parser {
  public static parseRootSchema(registry: Registry, input: any): Schema {
    const index = new Parser(registry, "", []).parse(input);
    return registry.getIndex(index);
  }

  public static parseSubSchema(registry: Registry, baseURI: string, tokens: string[], input: any): Schema {
    const index = new Parser(registry, baseURI, tokens).parse(input);
    return registry.getIndex(index);
  }

  private registry: Registry;
  private baseURI: string;
  private tokens: string[];

  constructor(registry: Registry, baseURI: string, tokens: string[]) {
    this.registry = registry;
    this.baseURI = baseURI;
    this.tokens = tokens;
  }

  private parse(input: any): number {
    const schema: Schema = { id: "" };

    if (typeof input === "boolean") {
      // Handle a boolean schema.
      schema.bool = { value: input };
    } else if (typeof input === "object") {
      // Handle an object schema.

      // Only attempt to parse the "$id" keyword when dealing with a root
      // schema.
      if (this.tokens.length === 0) {
        const id = (input as any).$id;
        if (id !== undefined) {
          if (typeof id === "string") {
            // Schema IDs must be absolute URIs.
            if (URI.parse(id).fragment !== undefined) {
              throw new InvalidSchemaError();
            }

            this.baseURI = URI.resolve(id, "");
            schema.id = URI.normalize(id);
          } else {
            throw new InvalidSchemaError();
          }
        }
      }

      const ref = (input as any).$ref;
      if (ref !== undefined) {
        if (typeof ref === "string") {
          // What $ref is pointing to.
          const refURI = URI.resolve(this.baseURI, ref);

          // refURI, but without a fragment.
          const refURIAbsolute = URI.resolve(refURI, "");

          // The fragment part of refURI, interpreted as a JSON Pointer.
          const refURIFragment = URI.parse(refURI).fragment;
          const ptr = Ptr.parse(refURIFragment || "");

          // As a special case, if $ref has an empty fragment, strip it out.
          // This is in accordance with a similar normalization step at the end
          // of this function.
          const uri = refURIFragment === "" ? refURIAbsolute : refURI;

          schema.ref = {
            baseURI: refURIAbsolute,
            ptr,
            schema: -1,
            uri,
          };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const type = (input as any).type;
      if (type !== undefined) {
        if (Array.isArray(type)) {
          const types = type.map((t) => parseJSONType(t));
          schema.type = { single: false, types };
        } else if (typeof type === "string") {
          schema.type = { single: true, types: [parseJSONType(type)] };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const items = (input as any).items;
      if (items !== undefined) {
        this.push("items");

        if (Array.isArray(items)) {
          const schemas = [];
          for (const [index, itemSchema] of items.entries()) {
            this.push(index.toString());
            schemas.push(this.parse(itemSchema));
            this.pop();
          }

          schema.items = { single: false, schemas };
        } else if (typeof items === "object") {
          schema.items = { single: true, schemas: [this.parse(items)] };
        } else {
          throw new InvalidSchemaError();
        }

        this.pop();
      }

      const not = (input as any).not;
      if (not !== undefined) {
        this.push("not");
        const notSchema = this.parse(not);
        this.pop();

        schema.not = { schema: notSchema };
      }

      const iff = (input as any).if;
      if (iff !== undefined) {
        this.push("if");
        const iffSchema = this.parse(iff);
        this.pop();

        schema.if = { schema: iffSchema };
      }

      const then = (input as any).then;
      if (then !== undefined) {
        this.push("then");
        const thenSchema = this.parse(then);
        this.pop();

        schema.then = { schema: thenSchema };
      }

      const elsee = (input as any).else;
      if (elsee !== undefined) {
        this.push("else");
        const elseeSchema = this.parse(elsee);
        this.pop();

        schema.else = { schema: elseeSchema };
      }

      const constt = (input as any).const;
      if (constt !== undefined) {
        schema.const = { value: constt };
      }

      const enumm = (input as any).enum;
      if (enumm !== undefined) {
        if (Array.isArray(enumm)) {
          schema.enum = { values: enumm };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const multipleOf = (input as any).multipleOf;
      if (multipleOf !== undefined) {
        if (typeof multipleOf === "number") {
          schema.multipleOf = { value: multipleOf };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const maximum = (input as any).maximum;
      if (maximum !== undefined) {
        if (typeof maximum === "number") {
          schema.maximum = { value: maximum };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const minimum = (input as any).minimum;
      if (minimum !== undefined) {
        if (typeof minimum === "number") {
          schema.minimum = { value: minimum };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const exclusiveMaximum = (input as any).exclusiveMaximum;
      if (exclusiveMaximum !== undefined) {
        if (typeof exclusiveMaximum === "number") {
          schema.exclusiveMaximum = { value: exclusiveMaximum };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const exclusiveMinimum = (input as any).exclusiveMinimum;
      if (exclusiveMinimum !== undefined) {
        if (typeof exclusiveMinimum === "number") {
          schema.exclusiveMinimum = { value: exclusiveMinimum };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const maxLength = (input as any).maxLength;
      if (maxLength !== undefined) {
        if (typeof maxLength === "number") {
          if (Number.isInteger(maxLength)) {
            schema.maxLength = { value: maxLength };
          } else {
            throw new InvalidSchemaError();
          }
        } else {
          throw new InvalidSchemaError();
        }
      }

      const minLength = (input as any).minLength;
      if (minLength !== undefined) {
        if (typeof minLength === "number") {
          if (Number.isInteger(minLength)) {
            schema.minLength = { value: minLength };
          } else {
            throw new InvalidSchemaError();
          }
        } else {
          throw new InvalidSchemaError();
        }
      }

      const pattern = (input as any).pattern;
      if (pattern !== undefined) {
        if (typeof pattern === "string") {
          try {
            schema.pattern = { value: new RegExp(pattern) };
          } catch {
            throw new InvalidSchemaError();
          }
        } else {
          throw new InvalidSchemaError();
        }
      }

      const additionalItems = (input as any).additionalItems;
      if (additionalItems !== undefined) {
        this.push("additionalItems");
        const additionalItemsSchema = this.parse(additionalItems);
        this.pop();

        schema.additionalItems = { schema: additionalItemsSchema };
      }

      const maxItems = (input as any).maxItems;
      if (maxItems !== undefined) {
        if (typeof maxItems === "number") {
          if (Number.isInteger(maxItems)) {
            schema.maxItems = { value: maxItems };
          } else {
            throw new InvalidSchemaError();
          }
        } else {
          throw new InvalidSchemaError();
        }
      }

      const minItems = (input as any).minItems;
      if (minItems !== undefined) {
        if (typeof minItems === "number") {
          if (Number.isInteger(minItems)) {
            schema.minItems = { value: minItems };
          } else {
            throw new InvalidSchemaError();
          }
        } else {
          throw new InvalidSchemaError();
        }
      }

      const uniqueItems = (input as any).uniqueItems;
      if (uniqueItems !== undefined) {
        if (typeof uniqueItems === "boolean") {
          schema.uniqueItems = { value: uniqueItems };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const contains = (input as any).contains;
      if (contains !== undefined) {
        this.push("contains");
        const containsSchema = this.parse(contains);
        this.pop();

        schema.contains = { schema: containsSchema };
      }

      const maxProperties = (input as any).maxProperties;
      if (maxProperties !== undefined) {
        if (typeof maxProperties === "number") {
          if (Number.isInteger(maxProperties)) {
            schema.maxProperties = { value: maxProperties };
          } else {
            throw new InvalidSchemaError();
          }
        } else {
          throw new InvalidSchemaError();
        }
      }

      const minProperties = (input as any).minProperties;
      if (minProperties !== undefined) {
        if (typeof minProperties === "number") {
          if (Number.isInteger(minProperties)) {
            schema.minProperties = { value: minProperties };
          } else {
            throw new InvalidSchemaError();
          }
        } else {
          throw new InvalidSchemaError();
        }
      }

      const required = (input as any).required;
      if (required !== undefined) {
        if (Array.isArray(required)) {
          const requiredProperties = [];
          for (const property of required) {
            if (typeof property === "string") {
              requiredProperties.push(property);
            } else {
              throw new InvalidSchemaError();
            }
          }

          schema.required = { properties: requiredProperties };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const properties = (input as any).properties;
      if (properties !== undefined) {
        if (typeof properties === "object") {
          const schemas = new Map();

          this.push("properties");
          for (const [key, value] of Object.entries(properties)) {
            this.push(key);
            schemas.set(key, this.parse(value));
            this.pop();
          }
          this.pop();

          schema.properties = { schemas };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const patternProperties = (input as any).patternProperties;
      if (patternProperties !== undefined) {
        if (typeof patternProperties === "object") {
          const schemas = new Map();

          this.push("patternProperties");
          for (const [key, value] of Object.entries(patternProperties)) {
            this.push(key);
            try {
              schemas.set([new RegExp(key), key], this.parse(value));
            } catch (err) {
              throw new InvalidSchemaError();
            }
            this.pop();
          }
          this.pop();

          schema.patternProperties = { schemas };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const additionalProperties = (input as any).additionalProperties;
      if (additionalProperties !== undefined) {
        this.push("additionalProperties");
        const additionalPropertiesSchema = this.parse(additionalProperties);
        this.pop();

        schema.additionalProperties = { schema: additionalPropertiesSchema };
      }

      const dependencies = (input as any).dependencies;
      if (dependencies !== undefined) {
        if (typeof dependencies === "object") {
          const deps: Map<string, SchemaDependency> = new Map();

          this.push("dependencies");
          for (const [key, value] of Object.entries(dependencies)) {
            if (Array.isArray(value)) {
              // Do an initial pass to make sure all elements are arrays.
              for (const elem of value) {
                if (typeof elem !== "string") {
                  throw new InvalidSchemaError();
                }
              }

              deps.set(key, { isSchema: false, schema: -1, properties: value });
            } else {
              this.push(key);
              deps.set(key, { isSchema: true, schema: this.parse(value), properties: [] });
              this.pop();
            }
          }
          this.pop();

          schema.dependencies = { deps };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const propertyNames = (input as any).propertyNames;
      if (propertyNames !== undefined) {
        this.push("propertyNames");
        const propertyNamesSchema = this.parse(propertyNames);
        this.pop();

        schema.propertyNames = { schema: propertyNamesSchema };
      }

      const allOf = (input as any).allOf;
      if (allOf !== undefined) {
        if (Array.isArray(allOf)) {
          this.push("allOf");

          const schemas = [];
          for (const [index, elem] of allOf.entries()) {
            this.push(index.toString());
            schemas.push(this.parse(elem));
            this.pop();
          }

          this.pop();

          schema.allOf = { schemas };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const anyOf = (input as any).anyOf;
      if (anyOf !== undefined) {
        if (Array.isArray(anyOf)) {
          this.push("anyOf");

          const schemas = [];
          for (const [index, elem] of anyOf.entries()) {
            this.push(index.toString());
            schemas.push(this.parse(elem));
            this.pop();
          }

          this.pop();

          schema.anyOf = { schemas };
        } else {
          throw new InvalidSchemaError();
        }
      }

      const oneOf = (input as any).oneOf;
      if (oneOf !== undefined) {
        if (Array.isArray(oneOf)) {
          this.push("oneOf");

          const schemas = [];
          for (const [index, elem] of oneOf.entries()) {
            this.push(index.toString());
            schemas.push(this.parse(elem));
            this.pop();
          }

          this.pop();

          schema.oneOf = { schemas };
        } else {
          throw new InvalidSchemaError();
        }
      }
    } else {
      throw new InvalidSchemaError();
    }

    // The URI identifying this schema. As a special case, strip the fragment
    // part if it is empty.
    const schemaURI = this.tokens.length === 0
      ? this.baseURI
      : URI.resolve(this.baseURI, `#${new Ptr(this.tokens)}`);
    return this.registry.set(schemaURI, schema);
  }

  private push(token: string) {
    this.tokens.push(token);
  }

  private pop() {
    this.tokens.pop();
  }
}
