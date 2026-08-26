Get a SpacetimeDB TypeScript module and Deno client running in under 5 minutes.

## Prerequisites

- [Deno](https://deno.com/) installed
- [SpacetimeDB CLI](https://spacetimedb.com/install) installed

Install the [SpacetimeDB CLI](https://spacetimedb.com/install) before
continuing.

---

## Create your project

Run the project in development mode:

This will start the local SpacetimeDB server, publish your module, and generate
TypeScript client bindings.

```bash
spacetime dev
```

This starts SpacetimeDB, publishes the module, generates client bindings, and
runs the Deno client with automatic reload.

## Explore the project structure

Your project contains both server and client code.

Edit `spacetimedb/src/index.ts` to add tables and reducers. Use the generated
bindings in `src/module_bindings/` to build your client.

```
my-spacetime-app/
├── spacetimedb/             # Your SpacetimeDB module
│   └── src/
│       └── index.ts         # Server-side logic
├── src/
│   ├── main.ts              # Client application
│   └── module_bindings/     # Auto-generated types
├── deno.json               # Deno tasks and permissions
└── package.json            # SpacetimeDB SDK dependency
```

## Run only the Deno client

If the local SpacetimeDB server and module are already running:

```bash
deno task start
```

Use `deno task dev` to restart the client automatically after source changes.

The client needs network access for the SpacetimeDB WebSocket and access to two
optional environment variables. These permissions are included in the tasks in
`deno.json`.

```bash
SPACETIMEDB_HOST=ws://localhost:3000 \
SPACETIMEDB_DB_NAME=exposure-radar \
deno task start
```

## Understand tables and reducers

Open `spacetimedb/src/index.ts` to see the module code. The template includes a
`person` table and two reducers: `add` to insert a person, and `sayHello` to
greet everyone.

Tables store your data. Reducers are functions that modify data — they're the
only way to write to the database.

```typescript
import { schema, t, table } from "spacetimedb/server";

const spacetimedb = schema({
  person: table(
    { public: true },
    {
      name: t.string(),
    },
  ),
});
export default spacetimedb;

export const add = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    ctx.db.person.insert({ name });
  },
);

export const sayHello = spacetimedb.reducer((ctx) => {
  for (const person of ctx.db.person.iter()) {
    console.info(`Hello, ${person.name}!`);
  }
  console.info("Hello, World!");
});
```

## Test with the CLI

Open a new terminal and navigate to your project directory. Then use the
SpacetimeDB CLI to call reducers and query your data directly.

```bash
cd my-spacetime-app

# Call the add reducer to insert a person
spacetime call add Alice

# Query the person table
spacetime sql "SELECT * FROM person"
 name
---------
 "Alice"

# Call sayHello to greet everyone
spacetime call say_hello

# View the module logs
spacetime logs
2025-01-13T12:00:00.000000Z  INFO: Hello, Alice!
2025-01-13T12:00:00.000000Z  INFO: Hello, World!
```

## Next steps

- See the
  [Chat App Tutorial](https://spacetimedb.com/docs/intro/tutorials/chat-app) for
  a complete example
- Read the
  [TypeScript SDK Reference](https://spacetimedb.com/docs/intro/core-concepts/clients/typescript-reference)
  for detailed API docs
