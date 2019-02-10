import { URL } from "whatwg-url";

import InvalidSchemaError from "./InvalidSchemaError";
import Registry from "./Registry";
import Schema, { parseJSONType } from "./Schema";

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
    if (typeof input !== "object") {
      throw new InvalidSchemaError();
    }

    const schema: Schema = {};

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

    return this.registry.set(null, schema);
  }

  private push(token: string) {
    this.tokens.push(token);
  }

  private pop() {
    this.tokens.pop();
  }
}
