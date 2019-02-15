import Ptr from "@json-schema-spec/json-pointer";
import * as URI from "uri-js";

import Parser from "./Parser";
import Registry from "./Registry";
import { ValidationResult } from "./ValidationResult";
import Vm from "./Vm";
import MissingURIsError from "./MissingURIsError";

export interface ValidatorConfig {
  maxErrors: number;
  maxStackDepth: number;
}

const DEFAULT_MAX_ERRORS = 0;
const DEFAULT_MAX_STACK_DEPTH = 0;

export class Validator {
  private config: ValidatorConfig;
  private registry: Registry;

  constructor(schemas: any[], config?: ValidatorConfig) {
    this.config = {
      ...config,
      maxErrors: DEFAULT_MAX_ERRORS,
      maxStackDepth: DEFAULT_MAX_STACK_DEPTH,
    };

    const registry = new Registry();
    const rawSchemas = new Map<string, any>();

    for (const schema of schemas) {
      const parsedSchema = Parser.parseRootSchema(registry, schema);
      rawSchemas.set(parsedSchema.id, schema);
    }

    let missingURIs = registry.populateRefs(); // URIs which must be accounted for
    const undefinedURIs: string[] = []; // URIs which cannot be accounted for

    while (missingURIs.length > 0 && undefinedURIs.length === 0) {
      for (const uri of missingURIs) {
        const baseURI = URI.resolve(uri, "");

        const rawSchema = rawSchemas.get(baseURI);
        if (rawSchema === undefined) {
          undefinedURIs.push(baseURI);
        } else {
          const ptr = Ptr.parse(URI.parse(uri).fragment || "");
          const rawRefSchema = ptr.eval(rawSchema);
          Parser.parseSubSchema(registry, baseURI, ptr.tokens, rawRefSchema);
        }
      }

      missingURIs = registry.populateRefs();
    }

    if (undefinedURIs.length > 0) {
      throw new MissingURIsError(undefinedURIs);
    }

    this.registry = registry;
  }

  public validate(instance: object): ValidationResult {
    const vm = new Vm(this.registry);
    return vm.exec("", instance);
  }
}
