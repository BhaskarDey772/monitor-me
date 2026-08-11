/** Renders the first validation message for a field, if any. */
export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-destructive text-sm">{messages[0]}</p>
}
