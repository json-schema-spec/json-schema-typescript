import Ptr from "@json-schema-spec/json-pointer";
import { URIComponents } from "uri-js";

import { ValidationError } from "./ValidationResult";

export default class Stack {
  private instance: string[];
  private schemas: SchemaStack[];

  constructor() {
    this.instance = [];
    this.schemas = [];
  }

  public pushInstanceToken(token: string) {
    this.instance.push(token);
  }

  public popInstanceToken() {
    this.instance.pop();
  }

  public pushSchema(uri: URIComponents, tokens: string[]) {
    this.schemas.push({ uri, tokens });
  }

  public popSchema() {
    this.schemas.pop();
  }

  public pushSchemaToken(token: string) {
    this.schemas[this.schemas.length - 1].tokens.push(token);
  }

  public popSchemaToken() {
    this.schemas[this.schemas.length - 1].tokens.pop();
  }

  public error(): ValidationError {
    const schema = this.schemas[this.schemas.length - 1];

    return {
      instancePath: new Ptr([...this.instance]),
      schemaPath: new Ptr([...schema.tokens]),
      schemaURI: schema.uri,
    };
  }
}

interface SchemaStack {
  uri: URIComponents;
  tokens: string[];
}
