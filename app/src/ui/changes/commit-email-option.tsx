import React from 'react'
import classNames from 'classnames'
import { Button } from '../lib/button'
import { Avatar } from '../lib/avatar'
import { IAvatarUser } from '../../models/avatar'
import { Account } from '../../models/account'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

interface ICommitEmailOptionProps {
  readonly email: string
  readonly name: string
  readonly endpoint: string | null
  readonly accounts: ReadonlyArray<Account>
  readonly isSelected: boolean
  readonly onSelect: (email: string) => void
}

/** A single email (with its avatar) in the commit email switcher */
export class CommitEmailOption extends React.Component<ICommitEmailOptionProps> {
  public render() {
    const { email, name, endpoint, accounts, isSelected } = this.props
    const user: IAvatarUser = { email, name, endpoint, avatarURL: undefined }

    return (
      <li>
        <Button
          className={classNames('commit-email-option', {
            selected: isSelected,
          })}
          ariaLabel={
            isSelected ? `${email} (current commit email)` : `Use ${email}`
          }
          ariaPressed={isSelected}
          onClick={this.onClick}
        >
          <Avatar accounts={accounts} user={user} title={null} />
          <span className="commit-email-option-email">{email}</span>
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
