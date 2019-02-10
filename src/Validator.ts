import Parser from "./Parser";
import Registry from "./Registry";
import { ValidationResult } from "./ValidationResult";
import Vm from "./Vm";

export interface ValidatorConfig {
  maxErrors: number;
  maxStackDepth: number;
}

const DEFAULT_MAX_ERRORS = 0;
const DEFAULT_MAX_STACK_DEPTH = 0;

export class Validator {
  private config: ValidatorConfig;
  private registry: Registry;

  constructor(schemas: object[], config?: ValidatorConfig) {
    this.config = {
      ...config,
      maxErrors: DEFAULT_MAX_ERRORS,
      maxStackDepth: DEFAULT_MAX_STACK_DEPTH,
    };

    const registry = new Registry();
    // const rawSchemas = {};

    for (const schema of schemas) {
      Parser.parseRootSchema(registry, schema);
    }

    this.registry = registry;
  }

  public validate(instance: object): ValidationResult {
    const vm = new Vm(this.registry);
    return vm.exec(null, instance);
  }
}
