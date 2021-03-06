function assert(x) {
  if (!x) throw 'error!';
}

function cleanInfo(info) {
  var ret = {};
  for (var x in info) {
    if (x == 'id' || x == 'type' || x == 'name' || x == 'event') {
      ret[x] = info[x];
    }
  }
  return ret;
}

function stringify(expr) {
  return JSON.stringify(cleanInfo(Binaryen.getExpressionInfo(expr)));
}

var module = new Binaryen.Module();
module.setFeatures(Binaryen.Features.ExceptionHandling);

var v = module.addFunctionType("v", Binaryen.none, []);
var vi = module.addFunctionType("vi", Binaryen.none, [Binaryen.i32]);
var event_ = module.addEvent("e", 0, vi);

// (try
//   (throw $e (i32.const 0))
//   (catch
//     ;; We don't support multi-value yet. Use locals instead.
//     (local.set 0 (exnref.pop))
//     (drop
//       (block $l (result i32)
//         (rethrow
//           (br_on_exn $l $e (local.get 0))
//         )
//       )
//     )
//   )
// )
var throw_ = module.throw("e", [module.i32.const(0)]);
var br_on_exn = module.br_on_exn("l", "e", module.local.get(0, Binaryen.exnref));
var rethrow = module.rethrow(br_on_exn);
var try_ = module.try(
  throw_,
  module.block(null, [
    module.local.set(0, module.exnref.pop()),
    module.drop(
      module.block("l", [rethrow], Binaryen.i32)
    )
  ]
  )
);
var func = module.addFunction("test", v, [Binaryen.exnref], try_);

console.log(module.emitText());
assert(module.validate());

console.log("getExpressionInfo(throw) = " + stringify(throw_));
console.log("getExpressionInfo(br_on_exn) = " + stringify(br_on_exn));
console.log("getExpressionInfo(rethrow) = " + stringify(rethrow));
console.log("getExpressionInfo(try) = " + stringify(try_));
