### `legibility/prefer-concat-object-assign()`

Report array and object literals containing spread when a project prefers method-based composition:

- Array literal spread is reported in favor of `Array#concat`.
- Object literal spread is reported in favor of `Object.assign` with a new target.
- Function-call spread and rest syntax are unchanged.

This rule has no options or autofix. Enable it explicitly:

```diff
 import legibility from "eslint-plugin-legibility";

+const compositionRules = {
+  "legibility/prefer-concat-object-assign": "warn",
+};
+const compositionConfig = { rules: compositionRules };
+
 export default [
   legibility.configs["flat/recommended"],
+  compositionConfig,
 ];
```

#### why it is opt-in

This is a style opinion, not a universal performance rule. `concat` names the array composition operation. `Object.assign` names the object composition operation, makes the fresh target visible, and preserves source precedence in argument order.

ESLint's opposing [prefer-object-spread][eslint-prefer-object-spread] rule says object spread may perform better. [V8's spread documentation][v8-spread] describes a fast path when spread begins an array literal, including `[...items, nextItem]`, but not when values precede it, as in `[firstItem, ...items]`. Engine, placement, collection size, and data shape can change the result, so neither form is always faster.

The forms can also behave differently. `Object.assign` uses assignment semantics, while object spread creates data properties. `concat` observes concat-spreadability, while array spread uses iteration. The rule therefore reports the syntax but leaves the change to the developer.

#### do / don't

For ordinary dense arrays and plain objects where the behavior is equivalent:

```diff
- const nextItems = [...items, ...moreItems];
- const appendedItems = [...items, nextItem];
- const prependedItems = [firstItem, ...items];
- const options = { ...defaults, enabled: true };
+ const nextItems = items.concat(moreItems);
+ const appendedItems = items.concat([nextItem]);
+ const prependedItems = [firstItem].concat(items);
+ const options = Object.assign({}, defaults, { enabled: true });
```

Wrapping `nextItem` in an array prevents `concat` from flattening it when the value is itself an array. The rule reports each containing literal once and does not autofix because custom iterators, concat-spreadability, sparse arrays, setters, and proxies can change behavior. Review each diagnostic for equivalent behavior.