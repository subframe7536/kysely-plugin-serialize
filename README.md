# kysely-plugin-serialize

Auto serialize / deserialize plugin for [kysely](https://github.com/kysely-org/kysely)

Breaking change expected between minors in version `0.x`

## Purpose

Kysely does not process the values passed in, so in some cases you may need to manually handle the values to ensure they can be processed correctly by the dialect. Therefore, the main goal of this plugin is DX, so the values serialized by the default serializer may not conform to the usual standards. If you need to ensure the actual values in the database, you can write your own serializer.

## Install

```shell
pnpm add kysely kysely-plugin-serialize
```

## Usage

The following example will return an error when using sqlite dialects, unless using this plugin:

```ts
import { Kysely, SqliteDialect } from 'kysely'
import { SerializePlugin } from 'kysely-plugin-serialize'

interface TestTable {
  id: Generated<number>
  person: { name: string, age: number, time: Date } | null
  gender: boolean
  blob: Uint8Array | null
  date: Date
}

interface Database {
  test: TestTable
}

const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database(':memory:'),
  }),
  plugins: [
    new SerializePlugin(),
  ],
})

await db.insertInto('test').values({
  gender: true,
  person: { name: 'test', age: 2, time: new Date() },
  blob: Uint8Array.from([1, 2, 3]),
  date: new Date(),
}).execute()
```

You can also provide a custom serializer function:

```ts
import { Kysely, SqliteDialect } from 'kysely'
import { SerializePlugin } from 'kysely-plugin-serialize'

const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database(':memory:'),
  }),
  plugins: [
    new SerializePlugin({
      serializer: (value) => {
        if (value instanceof Date) {
          return formatDatetime(value)
        }

        if (value !== null && typeof value === 'object') {
          return JSON.stringify(value)
        }

        return value
      }
    }),
  ],
})
```

### Base plugin

If you want to reduce your production size, you can use basic plugin

```ts
import {
  BaseSerializePlugin,
  dateRegex,
  type Deserializer,
  maybeJson,
  type Serializer,
  skipTransform as skip,
} from 'kysely-plugin-serialize'

const skipTransform = (parameter: unknown): boolean => skip(parameter) || typeof parameter === 'boolean'

const serializer: Serializer = (parameter) => {
  if (skipTransform(parameter) || typeof parameter === 'string') {
    return parameter
  }
  try {
    return JSON.stringify(parameter)
  } catch {
    return parameter
  }
}

const deserializer: Deserializer = (parameter) => {
  if (skipTransform(parameter)) {
    return parameter
  }
  if (typeof parameter === 'string') {
    if (dateRegex.test(parameter)) {
      return new Date(parameter)
    } else if (maybeJson(parameter)) {
      try {
        return JSON.parse(parameter)
      } catch { }
    }
  }
  return parameter
}

const plugin = new BaseSerializePlugin(serializer, deserializer, [])
```

## Notice

THIS PLUGIN SHOULD BE PLACED AT THE END OF PLUGINS ARRAY

default serializer / deserializer is built for SQLite

rules:

1. `number` / `bigint` / `ArrayBuffer` / `Buffer` will skip serialization
2. `boolean` will be serialized to `'true'` / `'false'`
3. `Date` will be serialized to ISO string
4. others will be serialized by `JSON.stringify` / `JSON.parse`

## Credit

[kysely #138](https://github.com/koskimas/kysely/pull/138)
