import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

/**
 * Password field with a reveal toggle.
 *
 * The toggle only flips the input's `type`, so the value is never mirrored into
 * another element and nothing is logged. Managers still see a password field on
 * first paint because `type="password"` is the initial state.
 */
export function PasswordInput({
  endActions,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupInput>, 'type'> & {
  /** Extra controls rendered after the toggle, e.g. a submit button. */
  endActions?: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup>
      <InputGroupInput {...props} type={visible ? 'text' : 'password'} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setVisible((current) => !current)}
          // Not in the tab order between the field and the submit button: it is a
          // convenience, and keyboard users tabbing a form should not land on it.
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
        {endActions}
      </InputGroupAddon>
    </InputGroup>
  )
}
