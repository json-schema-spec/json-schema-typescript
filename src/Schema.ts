import Ptr from "@json-schema-spec/json-pointer";

import InvalidSchemaError from "./InvalidSchemaError";

export default interface Schema {
  id: string;
  bool?: SchemaBool;
  ref?: SchemaRef;
  type?: SchemaType;
  not?: SchemaNot;
  if?: SchemaIf;
  then?: SchemaThen;
  else?: SchemaElse;
  const?: SchemaConst;
  enum?: SchemaEnum;
  multipleOf?: SchemaMultipleOf;
  maximum?: SchemaMaximum;
  minimum?: SchemaMinimum;
  exclusiveMaximum?: SchemaExclusiveMaximum;
  exclusiveMinimum?: SchemaExclusiveMinimum;
  maxLength?: SchemaMaxLength;
  minLength?: SchemaMinLength;
  pattern?: SchemaPattern;
  items?: SchemaItems;
  additionalItems?: SchemaAdditionalItems;
  maxItems?: SchemaMaxItems;
  minItems?: SchemaMinItems;
  uniqueItems?: SchemaUniqueItems;
  contains?: SchemaContains;
  maxProperties?: SchemaMaxProperties;
  minProperties?: SchemaMinProperties;
  required?: SchemaRequired;
  properties?: SchemaProperties;
  patternProperties?: SchemaPatternProperties;
  additionalProperties?: SchemaAdditionalProperties;
  dependencies?: SchemaDependencies;
  propertyNames?: SchemaPropertyNames;
  allOf?: SchemaAllOf;
  anyOf?: SchemaAnyOf;
  oneOf?: SchemaOneOf;
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

export interface SchemaMaximum {
  value: number;
}

export interface SchemaMinimum {
  value: number;
}

export interface SchemaExclusiveMaximum {
  value: number;
}

export interface SchemaExclusiveMinimum {
  value: number;
}

export interface SchemaMaxLength {
  value: number;
}

export interface SchemaMinLength {
  value: number;
}

export interface SchemaPattern {
  value: RegExp;
}

export interface SchemaAdditionalItems {
  schema: number;
}

export interface SchemaMaxItems {
  value: number;
}

export interface SchemaMinItems {
  value: number;
}

export interface SchemaUniqueItems {
  value: boolean;
}

export interface SchemaContains {
  schema: number;
}

export interface SchemaMaxProperties {
  value: number;
}

export interface SchemaMinProperties {
  value: number;
}

export interface SchemaRequired {
  properties: string[];
}

export interface SchemaProperties {
  schemas: Map<string, number>;
}

export interface SchemaPatternProperties {
  schemas: Map<[RegExp, string], number>;
}

export interface SchemaAdditionalProperties {
  schema: number;
}

export interface SchemaDependencies {
  deps: Map<string, SchemaDependency>;
}

export interface SchemaDependency {
  isSchema: boolean;
  schema: number;
  properties: string[];
}

export interface SchemaPropertyNames {
  schema: number;
}

export interface SchemaAllOf {
  schemas: number[];
}

export interface SchemaAnyOf {
  schemas: number[];
}

export interface SchemaOneOf {
  schemas: number[];
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
