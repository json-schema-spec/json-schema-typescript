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

  public get(uri: string): Schema {
    const index = this.schemas.get(uri)!;
    return this.arena[index];
  }

  public set(uri: string, schema: Schema): number {
    const index = this.schemas.get(uri);

    if (index === undefined) {
      this.arena.push(schema);
      this.schemas.set(uri, this.arena.length - 1);
      return this.arena.length - 1;
    } else {
      return index;
    }
  }

  public populateRefs(): string[] {
    const missing: string[] = [];

    for (const schema of this.arena) {
      if (!schema.ref) {
        continue;
      }

      const refIndex = this.schemas.get(schema.ref.uri);
      if (refIndex === undefined) {
        missing.push(schema.ref.uri);
      } else {
        schema.ref.schema = refIndex;
      }
    }

    return missing;
  }
}
