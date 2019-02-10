import { URL } from "whatwg-url";

import Arena from "./Arena";
import Schema from "./Schema";

export default class Registry {
  private schemas: { [uri: string]: number };
  private arena: Arena<Schema>;

  constructor() {
    this.schemas = {};
    this.arena = new Arena<Schema>();
  }

  public getIndex(index: number): Schema {
    return this.arena.get(index);
  }

  public get(uri: URL | null): Schema {
    return this.arena.get(this.schemas[uri === null ? "" : uri.toString()]);
  }

  public set(uri: URL | null, schema: Schema): number {
    const index = this.arena.add(schema);
    this.schemas[uri === null ? "" : uri.toString()] = index;
    return index;
  }
}
