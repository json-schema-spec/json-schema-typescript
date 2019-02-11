import Ptr from "@json-schema-spec/json-pointer";
import { URL } from "whatwg-url";

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
            this.baseURI = id;
            schema.id = id;
          } else {
            throw new InvalidSchemaError();
          }
        }
      }

      const ref = (input as any).$ref;
      if (ref !== undefined) {
        if (typeof ref === "string") {
          let fragment = "";
          let uri = "";

          if (this.baseURI === "") {
            try {
              const parsedURI = new URL(ref);

              uri = parsedURI.toJSON();
              fragment = parsedURI.hash === "" ? "" : parsedURI.hash.substring(1);
            } catch {
              // If parsing the URI failed, then attempt to parse as a fragment.
              // This is implicitly using some conceptual "empty URI" as the
              // base URI, a notion which works only for relative URIs which are
              // just fragments.
              if (!ref.startsWith("#")) {
                throw new InvalidSchemaError();
              }

              uri = ref;
              fragment = ref.substring(1);
            }
          } else {
            const parsedURI = new URL(ref, this.baseURI);

            uri = parsedURI.toJSON();
            fragment = parsedURI.hash === "" ? "" : parsedURI.hash.substring(1);
          }

          schema.ref = {
            baseURI: this.baseURI,
            ptr: Ptr.parse(fragment),
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

    const ptr = new Ptr(this.tokens).toString();
    if (this.baseURI === "") {
      return this.registry.set(ptr === "" ? "" : `#${ptr}`, schema);
    } else {
      if (ptr === "") {
        return this.registry.set(this.baseURI, schema);
      } else {
        const uri = new URL(`#${ptr}`, this.baseURI);
        return this.registry.set(uri.toJSON(), schema);
      }
    }
  }

  private push(token: string) {
    this.tokens.push(token);
  }

  private pop() {
    this.tokens.pop();
  }
}
