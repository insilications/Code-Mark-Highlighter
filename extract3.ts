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

  const rules = {};
  for (const [ruleCategory, ruleCategoryValue] of Object.entries(linterRules)) {
    if (!["preset", "recommended"].includes(ruleCategory)) {
      // if (ruleCategory === "nursery") {
      const rulesInCategory = ruleCategoryValue.anyOf[0].anyOf[1].properties;
      rules[ruleCategory] = {};
      for (const [rule, ruleValue] of Object.entries(rulesInCategory)) {
        if (!["preset", "recommended"].includes(rule)) {
          const description = ruleValue.description;
          // rules[ruleCategory][rule] = "on";
          rules[ruleCategory][rule] = description;
        }
        //
        // }
      }
    }
  }

  // log(rules);
  console.log(`{`);
  for (const [category, categoryValue] of Object.entries(rules)) {
    console.log(`  "${category}": {`);
    for (const [rule, description] of Object.entries(categoryValue)) {
      console.log(`    // ${description.replace(/[\r\n]+/gm, " ")}`);
      console.log(`    "${rule}": "on",`);
    }
    console.log(`  },`);
  }
  console.log(`}`);
} catch (err) {
  console.error(err);
}
