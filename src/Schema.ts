import Ptr from "@json-schema-spec/json-pointer";

import InvalidSchemaError from "./InvalidSchemaError";

export default interface Schema {
  id: string;
  bool?: SchemaBool;
  ref?: SchemaRef;
  type?: SchemaType;
  items?: SchemaItems;
  not?: SchemaNot;
  if?: SchemaIf;
  then?: SchemaThen;
  else?: SchemaElse;
  const?: SchemaConst;
  enum?: SchemaEnum;
  multipleOf?: SchemaMultipleOf;
}

export interface SchemaBool {
  value: boolean;
}

export interface SchemaRef {
  baseURI: string;
  ptr: Ptr;
  uri: string;
  schema: number;
}

export interface SchemaType {
  single: boolean;
  types: JSONType[];
}

export interface SchemaItems {
  single: boolean;
  schemas: number[];
}

export interface SchemaNot {
  schema: number;
}

export interface SchemaIf {
  schema: number;
}

export interface SchemaThen {
  schema: number;
}

export interface SchemaElse {
  schema: number;
}

export interface SchemaConst {
  value: any;
}

export interface SchemaEnum {
  values: any[];
}

export interface SchemaMultipleOf {
  value: number;
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
