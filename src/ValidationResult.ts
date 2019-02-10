import Ptr from "@json-schema-spec/json-pointer";
import { URL } from "whatwg-url";

export class ValidationResult {
  public errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    this.errors = errors;
  }

  public isValid(): boolean {
    return this.errors.length === 0;
  }
}

export interface ValidationError {
  instancePath: Ptr;
  schemaPath: Ptr;
  schemaURI: URL | null;
}
