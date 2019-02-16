import Ptr from "@json-schema-spec/json-pointer";
import * as URI from "uri-js";

import InvalidSchemaError from "./InvalidSchemaError";
import Registry from "./Registry";
import Schema, { parseJSONType } from "./Schema";

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
