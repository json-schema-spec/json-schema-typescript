import { serialize as serializeURI, URIComponents } from "uri-js";

import Schema from "./Schema";

export default class Registry {
  private schemas: Map<string, number>;
  private arena: Schema[];

  constructor() {
    this.schemas = new Map();
    this.arena = [];
  }

  public getIndex(index: number): Schema {
    return this.arena[index];
  }

  public get(uri: URIComponents): Schema {
    const index = this.schemas.get(serializeURI(uri))!;
    return this.arena[index];
  }

  public set(uri: URIComponents, schema: Schema): number {
    const serialized = serializeURI(uri);
    const index = this.schemas.get(serialized);

    if (index === undefined) {
      this.arena.push(schema);
      this.schemas.set(serialized, this.arena.length - 1);
      return this.arena.length - 1;
    } else {
      return index;
    }
  }

  public populateRefs(): URIComponents[] {
    const missing: URIComponents[] = [];

    for (const schema of this.arena) {
      if (!schema.ref) {
        continue;
      }

      console.log("serializing", schema.ref.uri);
      console.log("result is", serializeURI(schema.ref.uri))
      const refIndex = this.schemas.get(serializeURI(schema.ref.uri));
      if (refIndex === undefined) {
        missing.push(schema.ref.uri);
      } else {
        schema.ref.schema = refIndex;
      }
    }

    return missing;
  }
}
