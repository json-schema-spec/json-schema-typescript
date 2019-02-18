# json-schema [![Documentation][typedoc-shield]][typedocs]

This package provides a TypeScript and JavaScript implementation of JSON Schema
validation. In particular, it does so with the following goals:

* **High performance.** Internally, this package pre-compiles schemas, and
  allocates these pre-compiled schemas in an arena to reduce memory use and
  improve cache locality.
* **Running untrusted schemas.** This package will never download schemas from
  the network, nor fetch them from a local filesystem. Furthermore, you can tell
  this package to abort early if it appears that a schema is defined cyclically.
* **Control over number of errors returned.** If you are only interested in
  knowing whether a schema is valid or not, you can have this package stop
  evaluation on the first error. If you're presenting errors to users, you can
  also limit the number of errors to some sensible amount.

[typedoc-shield]: https://img.shields.io/badge/typedoc-reference-blue.svg
[typedocs]: https://json-schema-spec.github.io/json-schema-typescript/

## Documentation

You can find detailed documentation at:

https://json-schema-spec.github.io/json-schema-typescript/

## Usage

Create a validator using the `Validator` constructor. Then, evaluate instances
using the `validate` method:

```typescript
import { Validator } from "@json-schema-spec/json-schema";

const schema = {
  properties: {
    name: {
      type: "string",
      minLength: 3,
    },
    age: {
      type: "integer",
    },
  },
};

const instance = {
  name: "ab" // note: this name is too short
  age: "thirty seven", // note: this age is of the wrong type
};

const validator = new Validator([schema]);
const result = validator.validate(instance);

console.log(result.isValid()) // Outputs: false

for (const error of result.errors) {
  console.log(`validation error at ${error.instancePath} (due to: ${error.schemaPath})`);
}

// Outputs:
// validation error at /name (due to: /properties/name/minLength)
// validation error at /age (due to: /properties/age/type)
```

The returned errors are guaranteed to be valid JSON Pointers, returned from the
[`@json-schema-spec/json-pointer`][json-pointer] package, so you can easily get
ahold of what part of your schema or instance the error came from, if the path
isn't enough.

[json-pointer]: https://github.com/json-schema-spec/json-pointer-typescript
