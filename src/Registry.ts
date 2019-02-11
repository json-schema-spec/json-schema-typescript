import Arena from "./Arena";
import Schema from "./Schema";

export default class Registry {
  private schemas: { [uri: string]: number };
  private arena: Schema[];

  constructor() {
    this.schemas = {};
    this.arena = [];
  }

  public getIndex(index: number): Schema {
    return this.arena[index];
  }

  public get(uri: string): Schema {
    return this.arena[this.schemas[uri]];
  }

  public set(uri: string, schema: Schema): number {
    if (uri in this.schemas) {
      return this.schemas[uri];
    }

    this.arena.push(schema);
    this.schemas[uri] = this.arena.length - 1;
    return this.arena.length - 1;
  }

  public populateRefs(): string[] {
    const missing: string[] = [];

    for (const schema of this.arena) {
      if (!schema.ref) {
        continue;
      }

      const refIndex = this.schemas[schema.ref.uri];
      if (refIndex === undefined) {
        missing.push(schema.ref.uri);
      } else {
        schema.ref.schema = refIndex;
      }
    }

    return missing;
  }
}
