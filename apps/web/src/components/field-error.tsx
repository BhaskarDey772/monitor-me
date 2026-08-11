import { FieldError as FieldErrorPrimitive } from '@/components/ui/field'

/**
 * Adapts our `Record<field, string[]>` validation shape to shadcn's FieldError,
 * which expects `{ message }` objects. Pair with `data-invalid` on the Field and
 * `aria-invalid` on the control.
 */
export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null

  return (
    <FieldErrorPrimitive
      errors={messages.map((message) => ({ message }))}
    />
  )
}

/** True when a field has errors — for `data-invalid` / `aria-invalid`. */
export const isInvalid = (messages?: string[]) => Boolean(messages?.length)
