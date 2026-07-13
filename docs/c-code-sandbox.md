# C Code sandbox spike

## Status

C Code execution is security-class and disabled by default. The client creates interpreters with:

```ts
{ cSandbox: { enabled: false } }
```

When disabled, C Code produces `HTLAB_C_SANDBOX_DISABLED` and does not run.

## Architecture

C-014 implements a strict tiny-subset C adapter in `packages/simulation-core/src/interpreter/cSandbox.ts`.

The adapter does not call `eval`, does not generate JavaScript, and does not expose browser or Node APIs. It parses one numeric C-like function into a tiny AST and evaluates arithmetic expressions in an isolated local map.

Supported shape:

```c
int _fn(int _number1) {
  int x = _number1 + 1;
  return htlab_clamp(x, -100, 100);
}
```

Supported features:
- One `int`, `double`, or `float` function.
- Zero or one numeric parameter.
- Numeric literals, local declarations, assignments, `return`.
- Arithmetic: `+`, `-`, `*`, `/`, `%`, parentheses, unary `+`/`-`.
- Whitelisted APIs only: `htlab_abs(value)`, `htlab_clamp(value, min, max)`.

Rejected or stopped:
- DOM, localStorage, network, filesystem, arbitrary JS, arbitrary C library calls.
- `#include`, inline asm, double-underscore identifiers, pointers, address-of, arrays, malloc/free.
- Unknown function calls, unknown identifiers, compile errors, non-finite numeric results.
- `while`, `for`, and `do` loops are treated as long-running code and fail with `HTLAB_C_TIMEOUT`.

## IR payload

Generator output uses an explicit payload and policy:

```json
{
  "kind": "c-code",
  "payload": {
    "language": "c",
    "source": "int _fn(int _number1) { return _number1 + 1; }",
    "entryPoint": "_fn",
    "sandbox": {
      "required": true,
      "status": "available",
      "timeoutMs": 50,
      "memoryMb": 4,
      "allowedApis": ["htlab_abs", "htlab_clamp"]
    }
  },
  "input": { "kind": "literal", "value": 2 }
}
```

## Remaining unsafe areas

This is not a full C compiler or WASM runtime. It is a safe spike for numeric C-like functions. A future full C runtime must keep the same fail-closed contract, run off the browser main thread, enforce real memory/time limits, and keep the API whitelist explicit.
