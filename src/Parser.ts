import Ptr from "@json-schema-spec/json-pointer";
import {
  normalize as normalizeURI,
  parse as parseURI,
  resolveComponents as resolveURI,
  URIComponents,
} from "uri-js";

import InvalidSchemaError from "./InvalidSchemaError";
import Registry from "./Registry";
import Schema, { parseJSONType } from "./Schema";

export const EMPTY_URI: URIComponents = {};

export default class Parser {
  public static parseRootSchema(registry: Registry, input: any): Schema {
    const index = new Parser(registry, EMPTY_URI, []).parse(input);
    return registry.getIndex(index);
  }

  public static parseSubSchema(registry: Registry, baseURI: URIComponents, tokens: string[], input: any): Schema {
    const index = new Parser(registry, baseURI, tokens).parse(input);
    return registry.getIndex(index);
  }

  private registry: Registry;
  private baseURI: URIComponents;
  private tokens: string[];

  constructor(registry: Registry, baseURI: URIComponents, tokens: string[]) {
    this.registry = registry;
    this.baseURI = baseURI;
    this.tokens = tokens;
  }

  private parse(input: any): number {
    const schema: Schema = { id: EMPTY_URI };

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
            const uri = parseURI(id);

            // Schema IDs must be absolute URIs.
            if (uri.fragment !== undefined) {
              throw new InvalidSchemaError();
            }

            console.log("setting schema id", uri);

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
          console.log("resolving ref uri", this.baseURI, ref);
          const uri = resolveURI(this.baseURI, parseURI(ref));
          console.log("setting ref uri", uri);

          if (uri.fragment === "") {
            uri.fragment = undefined;
          }

          const baseURI = { ...uri };
          baseURI.fragment = undefined;

          schema.ref = {
            baseURI,
            ptr: Ptr.parse(uri.fragment || ""),
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

    const schemaURI = { ...this.baseURI };
    if (this.tokens.length > 0) {
      schemaURI.fragment = new Ptr(this.tokens).toString();
    }

    return this.registry.set(schemaURI, schema);
  }

  private push(token: string) {
    this.tokens.push(token);
  }

  private pop() {
    this.tokens.pop();
  }
}
