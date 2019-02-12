import Ptr from "@json-schema-spec/json-pointer";
import { serialize as serializeURI, URIComponents } from "uri-js";

import Parser, { EMPTY_URI } from "./Parser";
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
    const rawSchemas = new Map<string, any>();

    for (const schema of schemas) {
      const parsedSchema = Parser.parseRootSchema(registry, schema);
      rawSchemas.set(serializeURI(parsedSchema.id), schema);
    }

    let missingURIs = registry.populateRefs(); // URIs which must be accounted for
    const undefinedURIs: URIComponents[] = []; // URIs which cannot be accounted for

    while (missingURIs.length > 0 && undefinedURIs.length === 0) {
      console.log("processing", missingURIs, undefinedURIs);
      console.log("registry", registry);
      console.log("rawschemas", rawSchemas);

      for (const uri of missingURIs) {
        const baseURI = { ...uri };
        baseURI.fragment = undefined;

        console.log("looking for raw schema", serializeURI(baseURI));
        const rawSchema = rawSchemas.get(serializeURI(baseURI));
        if (rawSchema === undefined) {
          undefinedURIs.push(baseURI);
        } else {
          console.log("found it", rawSchema, uri);
          const fragment = uri.fragment || "";
          const ptr = Ptr.parse(fragment);

          const rawRefSchema = ptr.eval(rawSchema);
          Parser.parseSubSchema(registry, baseURI, ptr.tokens, rawRefSchema);
        }
      }

      missingURIs = registry.populateRefs();
    }

    if (undefinedURIs.length > 0) {
      console.log("undefined URIs", undefinedURIs);
      throw new Error(`undefined uris ${undefinedURIs}`);
    }

    this.registry = registry;
  }

  public validate(instance: object): ValidationResult {
    const vm = new Vm(this.registry);
    return vm.exec(EMPTY_URI, instance);
  }
}
