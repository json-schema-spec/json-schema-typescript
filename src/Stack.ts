import { URL } from "whatwg-url";

export default class Stack {
  private instance: string[];
  private schemas: SchemaStack[];

  constructor() {
    this.instance = [];
    this.schemas = [];
  }
}

interface SchemaStack {
  uri: URL;
  tokens: string[];
}
