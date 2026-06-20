"use client"

type AccountMessagesProps = {
  error: string | null
  success: string | null
}

export function AccountMessages({ error, success }: AccountMessagesProps) {
  return (
    <>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          {success}
        </div>
      ) : null}
    </>
  )
}
