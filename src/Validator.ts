import Ptr from "@json-schema-spec/json-pointer";
import { URL } from "whatwg-url";

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

  constructor(schemas: any[], config?: ValidatorConfig) {
    this.config = {
      ...config,
      maxErrors: DEFAULT_MAX_ERRORS,
      maxStackDepth: DEFAULT_MAX_STACK_DEPTH,
    };

    const registry = new Registry();
    const rawSchemas: { [uri: string]: any } = {};

    for (const schema of schemas) {
      const parsedSchema = Parser.parseRootSchema(registry, schema);
      rawSchemas[parsedSchema.id] = schema;
    }

    let missingURIs = registry.populateRefs(); // URIs which must be accounted for
    const undefinedURIs: string[] = []; // URIs which cannot be accounted for

    while (missingURIs.length > 0 && undefinedURIs.length === 0) {
      console.log("processing", missingURIs, undefinedURIs);
      console.log("registry", registry);

      for (const uri of missingURIs) {
        const parsedURI = new URL(uri);

        const baseURI = new URL(uri);
        baseURI.hash = "";

        const rawSchema = rawSchemas[baseURI.toJSON()];
        if (rawSchema === undefined) {
          undefinedURIs.push(baseURI.toJSON());
        } else {
          const fragment = parsedURI.hash === "" ? "" : parsedURI.hash.substring(1);
          const ptr = Ptr.parse(fragment);

          const rawRefSchema = ptr.eval(rawSchema);
          Parser.parseSubSchema(registry, baseURI.toJSON(), ptr.tokens, rawRefSchema);
        }
      }

      missingURIs = registry.populateRefs();
    }

    this.registry = registry;
  }

  public validate(instance: object): ValidationResult {
    const vm = new Vm(this.registry);
    return vm.exec("", instance);
  }
}
