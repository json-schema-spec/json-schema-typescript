import Ptr from "@json-schema-spec/json-pointer";
import * as fs from "fs";
import * as path from "path";
import { URL } from "whatwg-url";

import { Validator } from "./Validator";
import InvalidSchemaError from "./InvalidSchemaError";

const TEST_DIR = path.join(__dirname, "../tests");

describe("Validator", () => {
  describe("spec", () => {
    for (const testFilePath of fs.readdirSync(TEST_DIR)) {
      describe(testFilePath, () => {
        const file = fs.readFileSync(path.join(TEST_DIR, testFilePath), "utf8");
        const tests = JSON.parse(file);

        for (const { name, registry, schema, instances } of tests) {
          describe(name, () => {
            const schemas = [...registry, schema];
            const validator = new Validator(schemas);

            for (const [index, { instance, errors }] of instances.entries()) {
              it(index.toString(), () => {
                const expected = errors.map((error: any) => {
                  return {
                    instancePath: Ptr.parse(error.instancePath),
                    schemaPath: Ptr.parse(error.schemaPath),
                    schemaURI: error.uri ? new URL(error.uri) : null,
                  };
                });

                const result = validator.validate(instance);
                expect(result.errors).toEqual(expected);
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
