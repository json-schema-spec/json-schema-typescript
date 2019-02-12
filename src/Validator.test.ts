import Ptr from "@json-schema-spec/json-pointer";
import * as fs from "fs";
import * as path from "path";
import { parse as parseURI, equal as equalURI } from "uri-js";

import InvalidSchemaError from "./InvalidSchemaError";
import { Validator } from "./Validator";

const TEST_DIR = path.join(__dirname, "../tests");

describe("Validator", () => {
  describe("spec", () => {
    for (const testFilePath of fs.readdirSync(TEST_DIR)) {
      describe(testFilePath, () => {
        const file = fs.readFileSync(path.join(TEST_DIR, testFilePath), "utf8");
        const tests = JSON.parse(file);

        for (const { name, registry, schema, instances } of tests) {
          describe(name, () => {
            for (const [index, { instance, errors }] of instances.entries()) {
              it(index.toString(), () => {
                const schemas = [...registry, schema];
                const validator = new Validator(schemas);

                const expectedPaths = errors.map((error: any) => {
                  return {
                    instancePath: Ptr.parse(error.instancePath),
                    schemaPath: Ptr.parse(error.schemaPath),
                  };
                });

                const expectedURIs = errors.map((error: any) => {
                  return error.uri ? parseURI(error.uri) : {};
                });

                const result = validator.validate(instance);

                const actualPaths = result.errors.map((error) => {
                  return {
                    instancePath: error.instancePath,
                    schemaPath: error.schemaPath,
                  };
                });

                expect(actualPaths).toEqual(expectedPaths);
                for (let i = 0; i < result.errors.length; i++) {
                  console.log(result.errors[i].schemaURI, expectedURIs[i])
                  const equal = equalURI(result.errors[i].schemaURI, expectedURIs[i]);
                  expect(equal).toBe(true);
                }
              });
            }
          });
        }
      });
    }
  });

  describe("invalid schemas", () => {
    it("throws InvalidSchemaError on bad schemas", () => {
      const badSchemas = [
        { type: "not-a-type" },
        { type: 3.14 },
        { type: ["not-a-type"] },
        { type: [3.14] },
        { items: 3 },
        { items: { type: "not-a-type" } },
        { items: ["not-a-schema"] },
        { items: [{ type: "not-a-type" }] },
      ];

      for (const schema of badSchemas) {
        expect(() => new Validator([schema])).toThrow(InvalidSchemaError);
      }
    });
  });
});
