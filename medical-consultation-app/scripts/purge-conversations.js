const { Client } = require("pg")

async function main() {
  const confirm = String(process.env.PURGE_CONFIRM || "").trim()
  if (confirm !== "YES") {
    throw new Error('Set PURGE_CONFIRM=YES to proceed')
  }
  const url = String(process.env.DATABASE_URL || "").trim()
  if (!url) {
    throw new Error("Missing DATABASE_URL")
  }
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM conversation_messages")
    await client.query("DELETE FROM conversations")
    await client.query("COMMIT")
  } catch (e) {
    try { await client.query("ROLLBACK") } catch {}
    throw e
  } finally {
    await client.end()
  }
  process.stdout.write("OK\n")
}

main().catch((e) => {
  process.stderr.write(String(e && e.message ? e.message : e) + "\n")
  process.exit(1)
})

