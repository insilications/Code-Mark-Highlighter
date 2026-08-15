import { readFile, writeFile } from "node:fs/promises";
import { generate } from "json-schema-faker";
import { dereferenceSync } from "dereference-json-schema";


// const rules: string = await readFile("./sani.json", "utf8");
// const rules: string = await readFile("./rulesF.json", "utf8");
// const rules: string = await readFile("./remove.json", "utf8");
const rules: string = await readFile("./rulesDef2.json", "utf8");
// const rules: string = await readFile("./rules.json", "utf8");
// const rules: string = await readFile("./rulesDef.json", "utf8");
// const rules: string = await readFile("./rules3.json", "utf8");
// const rules: string = await readFile("./sanitizedSchema.json", "utf8");
const rulesJson = JSON.parse(rules);
// console.log(rulesJson);
// const rulesJsonDefs = rulesJson["$defs"];
// const rulesProperties = rulesJsonDefs["Rules"]["properties"];
//
// const defsPrefix = "#/$defs/";
// const defsPrefixLength = defsPrefix.length;
//
// const ruleRefKeys = [];
// for (const [rule, ruleValue] of Object.entries(rulesProperties)) {
//   if (!["recommended", "preset"].includes(rule)) {
//     const ruleRef = ruleValue["anyOf"][0]["$ref"];
//     const ruleRefKey = ruleRef.slice(defsPrefixLength);
//     ruleRefKeys.push(ruleRefKey);
//     // console.log(`${rule}: `, ruleRef);
//     // console.log(`${rule}: `, ruleRefKey);
//   }
// }
//
// const ruleNameRefKeys = [];
// for (const ruleRefKey of ruleRefKeys) {
//   const rule = rulesJsonDefs[ruleRefKey];
//   const ruleRef = rule["anyOf"][1]["$ref"];
//   const ruleNameRefKey = ruleRef.slice(defsPrefixLength);
//   ruleNameRefKeys.push(ruleNameRefKey);
//   // const rule = rulesJsonDefs;
//   // console.log("rule: ", ruleRefKey);
//   // console.log(`${ruleRefKey}`, ruleNameRefKey);
// }
//
// const rulesSettings = {};
// for (const ruleNameRefKey of ruleNameRefKeys) {
//   const rule = rulesJsonDefs[ruleNameRefKey];
//   const ruleProperties = rule.properties;
//   rulesSettings[ruleNameRefKey] = {};
//   for (const [rulePropertyKey, rulePropertyValue] of Object.entries(
//     ruleProperties,
//   )) {
//     // console.log(`${rulePropertyKey}`, rulePropertyValue);
//     if (!["recommended", "preset"].includes(rulePropertyKey)) {
//       const ruleRef = rulePropertyValue["anyOf"][0]["$ref"];
//       const ruleRefKey = ruleRef.slice(defsPrefixLength);
//
//       // const ruleConfig = rulesJsonDefs[ruleRefKey];
//       const ruleConfig = rulesJsonDefs[ruleRefKey]["oneOf"][1]["$ref"];
//       const ruleConfigRefKey = ruleConfig.slice(defsPrefixLength);
//       // console.log(`${ruleRefKey} `, ruleConfigRefKey)
//       const ruleConfigFinal = rulesJsonDefs[ruleConfigRefKey];
//       console.log(`${ruleConfigRefKey} `, ruleConfigFinal)
//
//       rulesSettings[ruleNameRefKey][rulePropertyKey] = {
//         description: rulePropertyValue.description,
//         config: ruleRefKey,
//       };
//     }
//   }
// }

// for (const [rule, ruleValue] of Object.entries(rulesSettings)) {
//   console.log(`${rule}: `, ruleValue);
//   console.log("===================\n\n");
// }

function removeNullTypes(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle arrays (e.g. definitions, tuple items)
  if (Array.isArray(schema)) {
    return schema.map(removeNullTypes);
  }

  const copy = { ...schema };

  // 1. Handle union types: type: ["string", "null"] -> type: "string"
  if (Array.isArray(copy.type)) {
    const nonNullTypes = copy.type.filter((t: string) => t !== "null");
    copy.type = nonNullTypes.length === 1 ? nonNullTypes[0] : nonNullTypes;
  }

  // 2. Remove OpenAPI-style nullable flag
  if ("nullable" in copy) {
    delete copy.nullable;
  }

  // 3. Filter null branches from anyOf / oneOf
  if (Array.isArray(copy.anyOf)) {
    copy.anyOf = copy.anyOf
      .filter((s: any) => s.type !== "null")
      .map(removeNullTypes);
  }

  if (Array.isArray(copy.oneOf)) {
    copy.oneOf = copy.oneOf
      .filter((s: any) => s.type !== "null")
      .map(removeNullTypes);
  }

  // 4. Recurse through properties and items
  if (copy.properties && typeof copy.properties === "object") {
    copy.properties = Object.fromEntries(
      Object.entries(copy.properties).map(([key, propSchema]) => [
        key,
        removeNullTypes(propSchema),
      ]),
    );
  }

  if (copy.items) {
    copy.items = removeNullTypes(copy.items);
  }

  return copy;
}
















const REMOVE = Symbol("remove");

function removeSchemaRef(
  value: unknown,
  targetRef: string,
): unknown | typeof REMOVE {
  if (Array.isArray(value)) {
    const result: unknown[] = [];

    for (const item of value) {
      const transformed = removeSchemaRef(item, targetRef);

      if (transformed !== REMOVE) {
        result.push(transformed);
      }
    }

    return result;
  }

  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object);

    // A schema consisting exclusively of the unwanted reference.
    if (
      keys.length === 1 &&
      object.$ref === targetRef
    ) {
      return REMOVE;
    }

    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(object)) {
      if (key === "$ref" && child === targetRef) {
        continue;
      }

      const transformed = removeSchemaRef(child, targetRef);

      if (transformed !== REMOVE) {
        result[key] = transformed;
      }
    }

    return result;
  }

  return value;
}



// const result = removeSchemaRef(
//   rulesJson,
//   "#/$defs/RulePlainConfiguration",
// );
//
// await writeFile('remove.json', JSON.stringify(result, null, 2));


/*
const schemaWithNoRefs = dereferenceSync(rulesJson);
await writeFile('rulesDef.json', JSON.stringify(schemaWithNoRefs, null, 2));*/


// Strip out null branches from the schema definition
// const sanitizedSchema = removeNullTypes(rulesJson);
// await writeFile('sanitizedSchema.json', JSON.stringify(sanitizedSchema, null, 2));

// // Generate fake JSON object
// const result = await generate(sanitizedSchema, {
const result = await generate(rulesJson, {
  alwaysFakeOptionals: true, // Always generate optional properties (not in `required`)
  optionalsProbability: 1.0, // 100% probability for optional fields
  refDepth: 111, // Avoid empty arrays (if you want non-empty collections)
  refDepthMin: 1, // Avoid empty arrays (if you want non-empty collections)
  refDepthMmax: 111, // Avoid empty arrays (if you want non-empty collections)
  minItems: 1, // Avoid empty arrays (if you want non-empty collections)
  maxItems: 111, // Avoid empty arrays (if you want non-empty collections)
  minLength: 1, // Avoid empty arrays (if you want non-empty collections)
  maxLength: 1222, // Avoid empty arrays (if you want non-empty collections)
  maxDepth: 123, // Avoid empty arrays (if you want non-empty collections)
  maxDefaultItems: 123, // Avoid empty arrays (if you want non-empty collections)
  // useDefaultValue: true, // Use defined default values where available
  fillProperties: true, // Use defined default values where available
  // useExamplesValue: true, // Use defined default values where available
  requiredOnly: false, // Use defined default values where available,
  // ignoreProperties: ["level"],
});
//
await writeFile('rulesGen.json', JSON.stringify(result, null, 2));

// console.log("Generated JSON:");
// console.log(JSON.stringify(result, null, 2));
