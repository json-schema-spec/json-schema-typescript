import * as fs from "fs";
import * as path from "path";
import { Validator } from ".";

const TEST_DIR = path.join(__dirname, "../tests");

describe("Validator", () => {
  describe("spec", () => {
    for (const testFilePath of fs.readdirSync(TEST_DIR)) {
      describe(testFilePath, () => {
        const file = fs.readFileSync(path.join(TEST_DIR, testFilePath), "utf8")
        const tests = JSON.parse(file);

        for (const { name, registry, schema, instances } of tests) {
          it(name, () => {
            const schemas = [...registry, schema];
            const validator = new Validator(schemas);

            for (const { instance, errors } of instances) {
              const result = validator.validate(instance);
              expect(result.errors).toEqual(errors);
            }
          });
        }
      });
    }
  });
});
