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

  private parse(input: object): number {
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

    return this.registry.set(null, schema);
  }
}
