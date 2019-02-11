import { URL } from "whatwg-url";

import InvalidSchemaError from "./InvalidSchemaError";
import Registry from "./Registry";
import Schema, { parseJSONType } from "./Schema";
import Ptr from "@json-schema-spec/json-pointer";

export default class Parser {
  public static parseRootSchema(registry: Registry, input: object): Schema {
    const index = new Parser(registry, null, []).parse(input);
    return registry.getIndex(index);
  }

  public static parseSubSchema(registry: Registry, baseURI: URL, tokens: string[], input: object): Schema {
    const index = new Parser(registry, baseURI, tokens).parse(input);
    return registry.getIndex(index);
  }

  private registry: Registry;
  private baseURI: URL | null;
  private tokens: string[];

  constructor(registry: Registry, baseURI: URL | null, tokens: string[]) {
    this.registry = registry;
    this.baseURI = baseURI;
    this.tokens = tokens;
  }

  private parse(input: any): number {
    const schema: Schema = { id: null };

    if (typeof input === "boolean") {
      schema.bool = { value: input };
    } else if (typeof input === "object") {
      if (this.tokens.length === 0) {
        const id = (input as any).id;
        if (id !== undefined) {
          if (typeof id === "string") {
            const uri = new URL(id);
            this.baseURI = uri;
            schema.id = uri;
          } else {
            throw new InvalidSchemaError();
          }
        }
      }

      const ref = (input as any).$ref;
      if (ref !== undefined) {
        if (typeof ref === "string") {
          const base = this.baseURI ? this.baseURI.toString() : undefined;
          const uri = new URL(ref, base);
          const fragment = uri.hash === "" ? "" : uri.hash.substr(1);

          // schema.ref.baseURI is the fragment-less URI that the $ref is
          // referring to. This will be used to produce error information on
          // which schema produced an error.
          let baseURI = null;
          if (this.baseURI) {
            baseURI = new URL(this.baseURI.toString());
            baseURI.hash = "";
          }

          const ptr = Ptr.parse(fragment);
          schema.ref = { baseURI, ptr, uri };
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
          const schemas = items.map((item) => this.parse(item));
          schema.items = { single: false, schemas };
        } else if (typeof items === "object") {
          schema.items = { single: true, schemas: [this.parse(items)] };
        } else {
          throw new InvalidSchemaError();
        }

        this.pop();
      }
    } else {
      throw new InvalidSchemaError();
    }

    return this.registry.set(null, schema);
  }

  private push(token: string) {
    this.tokens.push(token);
  }

  private pop() {
    this.tokens.pop();
  }
}
