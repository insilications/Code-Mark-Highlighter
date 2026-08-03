import litedent from "litedent";
// import dedent from "dedent";
// import { undent } from "@okikio/undent";

function test(source) {
  console.log("\nsource:");
  console.log(source);

  console.log("source:");
  console.log(JSON.stringify(source));

  // const k1 = dedent(source);
  const k2 = litedent(source);
  // const k3 = undent.string(source);

  // console.log('\n------------------');
  // console.log('dedent:');
  // console.log(k1);
  // console.log('\n');
  // console.log(JSON.stringify(k1));
  // console.log('------------------');

  console.log("\n------------------");
  console.log("lident:");
  console.log(k2);
  console.log("\n");
  console.log(JSON.stringify(k2));

  const snippet = k2.split("\n").slice(0, 12).join("\n");
  console.log("snippet:");
  console.log(snippet);
  console.log("------------------");

  // console.log('\n------------------');
  // console.log('undent:');
  // console.log(k3);
  // console.log('\n');
  // console.log(JSON.stringify(k3));
  // console.log('------------------');
}

const source1 = `
      if (i + 1 < lines.length && lines[i + 1]) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.length >= 2 && nextLine.length <= 20 && !isDescriptionOrNoise(nextLine)) {
          const combined = line.trim() + ' ' + nextLine;
          const combinedVariants = generateLineVariants(combined);
          for (const v of combinedVariants) variants.push(v);
        }
      }
`;
// const source1 = `
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i];
//       if (!line || line.trim().length < 3) continue;
// `;

// const snippet = h.codeSnippet.split('\\n').slice(0, 3).join('\\n').slice(0, 200);
// const snippet = source1.split("\n");
// const snippet = source1.split("\n").slice(0, 3);
// const snippet = source1.split("\n").slice(0, 3).join('\n');
// const snippet = source1.split("\n").slice(0, 12).join('\n').slice(0, 200);

// const source2 = '\t first\n \tsecond';
// const source3 = '    first\n  second';
// const source4 = 'first\n  second';
// // const source4 = `
// //     first
// //     second
// // `;
const sources = [];
sources.push(source1);
// // sources.push(source2);
// // sources.push(source3);
// // sources.push(source4);
//
for (const s of sources) {
  test(s);
  console.log("");
}
