import type { Generated, KyselyPlugin } from 'kysely'
import Database from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { Kysely, SqliteDialect } from 'kysely'
import { SerializePlugin } from '../src'

interface DB {
  test: TestTable
  blob: BlobTable
}
interface TestTable {
  id: Generated<number>
  person: { name: string, age: number, time: Date } | null
  tag: string[]
  gender: boolean
  blob: Uint8Array | null
  date: Date
}
interface BlobTable {
  buffer: Buffer
  int8: Uint8Array
}
describe('plugin basic test', () => {
  const db = new Database(':memory:')
  function getDB(plugin: KyselyPlugin) {
    return new Kysely<DB>({
      dialect: new SqliteDialect({
        database: {
          close: db.close,
          prepare(sql) {
            const stmt = db.prepare(sql)
            // @ts-expect-error assign property
            stmt.reader = stmt.columnNames.length > 0
            return stmt as any
          },
        },
      }),
      plugins: [plugin],
    })
  }
  it('test types', async () => {
    const db = getDB(new SerializePlugin())
    const testDate = new Date()
    await db.schema.createTable('test')
      .addColumn('id', 'integer', build => build.autoIncrement().primaryKey())
      .addColumn('gender', 'text')
      .addColumn('tag', 'text')
      .addColumn('person', 'text')
      .addColumn('blob', 'blob')
      .addColumn('date', 'text')
      .ifNotExists()
      .execute()
    await db.insertInto('test').values({
      gender: true,
      person: { name: 'test', age: 2, time: testDate },
      tag: ['tag1', 'tag2'],
      blob: Buffer.from([1, 2, 3]),
      date: testDate,
    }).execute()
    const { blob, person, tag, gender, date } = await db.selectFrom('test')
      .selectAll()
      .limit(1)
      .executeTakeFirstOrThrow()
    expect(blob).toStrictEqual(Buffer.from([1, 2, 3]))
    expect(person).toStrictEqual(JSON.parse(JSON.stringify({ name: 'test', age: 2, time: testDate })))
    expect(tag).toStrictEqual(['tag1', 'tag2'])
    expect(gender).toStrictEqual(true)
    expect(date).toStrictEqual(testDate)
  })
  it('test blob types', async () => {
    const db = getDB(new SerializePlugin())
    const testBuffer = Buffer.alloc(4).fill(0xDD)
    await db.schema.createTable('blob')
      .addColumn('buffer', 'blob')
      .addColumn('int8', 'blob')
      .execute()
    await db.insertInto('blob')
      .values({
        buffer: testBuffer,
        int8: new Uint8Array([1, 2, 3]),
      })
      .execute()
    const { int8, buffer } = await db.selectFrom('blob').selectAll().executeTakeFirstOrThrow()
    expect(buffer.buffer).toStrictEqual(testBuffer.buffer)
    expect(int8.buffer).toStrictEqual(Uint8Array.from([1, 2, 3]).buffer)
  })
})
