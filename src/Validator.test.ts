import Ptr from "@json-schema-spec/json-pointer";
import * as fs from "fs";
import * as path from "path";

import InvalidSchemaError from "./InvalidSchemaError";
import MissingURIsError from "./MissingURIsError";
import StackOverflowError from "./StackOverflowError";
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
                const result = validator.validate(instance);

                const sortFn = (a: any, b: any) => {
                  if (a.schemaPath === b.schemaPath) {
                    return a.instancePath < b.instancePath ? -1 : 1;
                  }

                  return a.schemaPath < b.schemaPath ? -1 : 1;
                };

                const expected = errors.map((error: any) => {
                  return { uri: error.uri || "", ...error };
                }).sort(sortFn);

                const actual = result.errors.map((error) => {
                  return {
                    instancePath: error.instancePath.toString(),
                    schemaPath: error.schemaPath.toString(),
                    uri: error.schemaURI,
                  };
                }).sort(sortFn);

                expect(actual).toEqual(expected);
              });
            }
          });
        }
      });
    }
  });

  describe("validateURI", () => {
    it("supports evaluating against a particular schema", () => {
      const validator = new Validator([
        { $id: "urn:foo", type: "boolean" },
        { $id: "urn:bar", type: "number" },
      ]);

      expect(validator.validateURI("urn:foo", true).isValid()).toBe(true);
      expect(validator.validateURI("urn:foo", 3.14).isValid()).toBe(false);
      expect(validator.validateURI("urn:bar", true).isValid()).toBe(false);
      expect(validator.validateURI("urn:bar", 3.14).isValid()).toBe(true);
    });
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
        { enum: 3.14 },
        { multipleOf: "not-a-number" },
        { maximum: "not-a-number" },
        { minimum: "not-a-number" },
        { exclusiveMaximum: "not-a-number" },
        { exclusiveMinimum: "not-a-number" },
        { maxLength: "not-a-number" },
        { maxLength: 3.14 },
        { minLength: "not-a-number" },
        { minLength: 3.14 },
        { pattern: 3.14 },
        { pattern: "[[[" },
        { additionalItems: "not-a-schema" },
        { maxItems: "not-a-number" },
        { maxItems: 3.14 },
        { minItems: "not-a-number" },
        { minItems: 3.14 },
        { uniqueItems: "not-a-boolean" },
        { contains: "not-a-schema" },
        { maxProperties: "not-a-number" },
        { maxProperties: 3.14 },
        { minProperties: "not-a-number" },
        { minProperties: 3.14 },
        { required: "not-an-array" },
        { required: [3.14] },
        { properties: "not-an-object" },
        { properties: { foo: "not-a-schema" } },
        { patternProperties: "not-an-object" },
        { patternProperties: { "[[[": {} } },
        { patternProperties: { "*": 3.14 } },
        { additionalProperties: 3.14 },
        { dependencies: "not-an-object" },
        { dependencies: { foo: "not-an-object-or-array" } },
        { dependencies: { foo: [3.14] } },
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

    it("throws StackOverflowError on circularly defined schemas", () => {
      const validator = new Validator(
        [{ $ref: "#" }],
        { maxStackDepth: 16 },
      );

      expect(() => {
        validator.validate(null);
      }).toThrowError(new StackOverflowError());
    });
  });
});
