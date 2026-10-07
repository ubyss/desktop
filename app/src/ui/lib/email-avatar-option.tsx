import React from 'react'
import classNames from 'classnames'
import { Button } from './button'
import { Avatar } from './avatar'
import { IAvatarUser } from '../../models/avatar'
import { Account } from '../../models/account'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

interface IEmailAvatarOptionProps {
  readonly email: string

  /** The name shown for the avatar (the Git author name) */
  readonly name: string

  /** The endpoint used to resolve the avatar, if any */
  readonly endpoint: string | null
  readonly accounts: ReadonlyArray<Account>
  readonly isSelected: boolean
  readonly onSelect: (email: string) => void
}

/** A selectable email address, displayed with its avatar */
export class EmailAvatarOption extends React.Component<IEmailAvatarOptionProps> {
  public render() {
    const { email, name, endpoint, accounts, isSelected } = this.props
    const user: IAvatarUser = { email, name, endpoint, avatarURL: undefined }

    return (
      <li>
        <Button
          className={classNames('email-avatar-option', {
            selected: isSelected,
          })}
          ariaLabel={isSelected ? `${email} (selected)` : `Use ${email}`}
          ariaPressed={isSelected}
          onClick={this.onClick}
        >
          <Avatar accounts={accounts} user={user} title={null} />
          <span className="email-avatar-option-email">{email}</span>
          {isSelected && <Octicon symbol={octicons.check} />}
        </Button>
      </li>
    )
  }

  private onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    this.props.onSelect(this.props.email)
  }
}
