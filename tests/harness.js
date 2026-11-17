// Runs the n8n Code-node source from a COPY of the workflow with stubbed $input/$().
const w = require('../workflow/receipt-to-ledger.json');
const code = n => w.nodes.find(x => x.name === n).parameters.jsCode;
function run(name, { input, nodes = {}, now }) {
  const RealDate = Date;
  if (now) {
    global.Date = class extends RealDate {
      constructor(...a) { super(...(a.length ? a : [now])); }
      static now() { return new RealDate(now).getTime(); }
    };
  }
  try {
    const fn = new Function('$input', '$', code(name));
    const items = Array.isArray(input) ? input : [input];
    return fn(
      { first: () => ({ json: items[0] }), all: () => items.map(j => ({ json: j })) },
      n => ({ first: () => ({ json: nodes[n] }), item: { json: nodes[n] } })
    )[0].json;
  } finally { global.Date = RealDate; }
}
const parse = (ai, form = {}, now) =>
  run('Parse + check', { input: { content: JSON.stringify(ai) }, nodes: { 'Upload receipt': form }, now });
module.exports = { run, parse };
