import $RefParser from "@apidevtools/json-schema-ref-parser";
import { readFile, writeFile } from "node:fs/promises";
import { inspect } from "bun";

function log(...args) {
  const formattedArgs = args.map((arg) =>
    Bun.inspect(arg, {
      colors: true,
      depth: Infinity,
    }),
  );

  console.log(...formattedArgs);
}

try {
  const rulesStr: string = await readFile("./rules.json", "utf8");
  let rulesJson = JSON.parse(rulesStr);
  await $RefParser.dereference(rulesJson);
  // note - by default, mySchema is modified in place, and the returned value is a reference to the same object
  const linterRules =
    rulesJson.properties.linter.anyOf[0].properties.rules.anyOf[0].properties;
  // console.log(linterRules);

  const rules = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {},
    required: [
      "a11y",
      "complexity",
      "correctness",
      "nursery",
      "performance",
      "security",
      "style",
      "suspicious",
    ],
    additionalProperties: false,
  };
  for (const [ruleCategory, ruleCategoryValue] of Object.entries(linterRules)) {
    if (!["preset", "recommended"].includes(ruleCategory)) {
      // if (ruleCategory === "nursery") {
      // console.log(`${ruleCategory}: `, ruleCategoryValue);
      const rulesInCategory = ruleCategoryValue.anyOf[0].anyOf[1].properties;
      // rules[ruleCategory] = {};
      // const categories = {};
      // console.log(`${ruleCategory}: `, rulesInCategory);
      console.log(`\n\n\n\n\n============================`);
      console.log(`${ruleCategory}: `);
      rules["properties"][ruleCategory] = {
        type: "object",
        required: [],
        properties: {},
        additionalProperties: false,
      };
      for (const [rule, ruleValue] of Object.entries(rulesInCategory)) {
        if (!["preset", "recommended"].includes(rule)) {
          const description = ruleValue.description;
          // console.log(`           ${rule}: `, ruleValue);
          // console.log(`           ${rule}: `, ruleValue.anyOf[0].oneOf);
          // log(`           ${rule}: `, ruleValue.anyOf[0].oneOf);
          // log(`           ${rule}: `, ruleValue.anyOf[0].oneOf[1]);
          // rules["properties"][ruleCategory][rule]= {};
          // log(rule);
          // log(rules["properties"]);
          rules["properties"][ruleCategory]["properties"][rule] = structuredClone(ruleValue.anyOf[0].oneOf[1]);
          // rules["properties"][ruleCategory]["properties"][rule] = {
          //   type: "object",
          //   description,
          //   properties: structuredClone(ruleValue.anyOf[0].oneOf[1]),
          //   required: [],
          //   additionalProperties: false,
          // };
          // rules[ruleCategory][rule] = {
          //   description,
          //   properties: structuredClone(ruleValue.anyOf[0].oneOf[1]),
          // };
        }
        //
        // }
      }
    }
  }

  log(rules);
  await writeFile("parsed.json", JSON.stringify(rules, null, 2));

  // if you want to avoid modifying the original schema, you can disable the `mutateInputSchema` option
  // let clonedSchema = await $RefParser.dereference(mySchema, { mutateInputSchema: false });
  // console.log(clonedSchema.definitions.person.properties.firstName);
} catch (err) {
  console.error(err);
}
