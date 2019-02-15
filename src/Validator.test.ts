import Ptr from "@json-schema-spec/json-pointer";
import * as fs from "fs";
import * as path from "path";

import InvalidSchemaError from "./InvalidSchemaError";
import MissingURIsError from "./MissingURIsError";
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
                  return error.uri ? error.uri : "";
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
                  expect(result.errors[i].schemaURI).toEqual(expectedURIs[i]);
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
        { $ref: 3.14 },
        { $id: 3.14 },
        { not: 3.14 },
        { if: 3.14 },
        { then: 3.14 },
        { else: 3.14 },
      ];

      for (const schema of badSchemas) {
        expect(() => new Validator([schema])).toThrow(InvalidSchemaError);
      }
    });

    it("throws MissingURIsError on missing uris", () => {
      try {
        // tslint:disable-next-line no-unused-expression
        new Validator([{
          $ref: "http://example.com/1",
          items: [
            { $ref: "http://example.com/2" },
            { $ref: "http://example.com/3" },
            { $ref: "http://example.com/4#/fragment" },
          ],
        }]);

        fail();
      } catch (err) {
        const missingURIs = (err as MissingURIsError).uris;
        expect(missingURIs).toEqual([
          "http://example.com/2",
          "http://example.com/3",
          "http://example.com/4",
          "http://example.com/1",
        ]);
      }
    });
  });
});
