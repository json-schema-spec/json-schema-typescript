import Ptr from "@json-schema-spec/json-pointer";
import { URL } from "url";

export interface ValidatorConfig {
  maxStackDepth: number;
  maxErrors: number;
}

const DEFAULT_MAX_STACK_DEPTH = 0;
const DEFAULT_MAX_ERRORS = 0;

export class Validator {
  private config: ValidatorConfig;

  constructor(schemas: object[], config?: ValidatorConfig) {
    this.config = {
      ...config,
      maxStackDepth: DEFAULT_MAX_STACK_DEPTH,
      maxErrors: DEFAULT_MAX_ERRORS,
    };
  }

  public validate(instance: object): ValidationResult {
    return new ValidationResult([]);
  }
}

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
  schemaURI: URL;
}
