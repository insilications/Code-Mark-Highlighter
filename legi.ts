import legibility from "eslint-plugin-legibility";
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



log(legibility.configs);

