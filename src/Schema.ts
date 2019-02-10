import InvalidSchemaError from "./InvalidSchemaError";

export default interface Schema {
  type?: SchemaType;
}

export interface SchemaType {
  single: boolean;
  types: JSONType[];
}

export enum JSONType {
  Null,
  Boolean,
  Number,
  Integer,
  String,
  Array,
  Object,
}

export function parseJSONType(s: string): JSONType {
  switch (s) {
  case "null":
    return JSONType.Null;
  case "boolean":
    return JSONType.Boolean;
  case "number":
    return JSONType.Number;
  case "integer":
    return JSONType.Integer;
  case "string":
    return JSONType.String;
  case "array":
    return JSONType.Array;
  case "object":
    return JSONType.Object;
  }

  throw new InvalidSchemaError();
}