import * as React from 'react'
import { TextBox } from './text-box'
import { Row } from './row'
import { Account, isDotComAccount } from '../../models/account'
import { PopoverDropdown } from './popover-dropdown'
import { Avatar } from './avatar'
import { EmailAvatarOption } from './email-avatar-option'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { GitEmailNotFoundWarning } from './git-email-not-found-warning'
import { getStealthEmailForAccount } from '../../lib/email'
import memoizeOne from 'memoize-one'
import { Button } from './button'
import {
  addSavedGitEmail,
  getSavedGitEmails,
  removeSavedGitEmail,
} from '../../lib/saved-git-emails'

const OtherEmailSelectValue = 'Other'

interface IGitConfigUserFormProps {
  readonly name: string
  readonly email: string

  /**
   * The accounts from which to source candidates for email selection
   *
   * When the GitConfigUserForm is used from the repository settings, this
   * should contain only the account associated with the current repository but
   * when used from the Preferences dialog it should contain all accounts.
   */
  readonly accounts: ReadonlyArray<Account>
  readonly disabled?: boolean

  readonly onNameChanged: (name: string) => void
  readonly onEmailChanged: (email: string) => void

  readonly isLoadingGitConfig: boolean
}

interface IGitConfigUserFormState {
  /**
   * True if the selected email in the dropdown is not one of the suggestions.
   * It's used to display the "Other" text box that allows the user to
   * enter a custom email address.
   */
  readonly emailIsOther: boolean

  /**
   * Custom email addresses the user has saved so they can switch between them
   * from the dropdown without typing them again.
   */
  readonly savedEmails: ReadonlyArray<string>
}

type AccountEmail = {
  readonly email: string
  readonly normalizedEmail: string
  readonly account: Account
}

/**
 * Form with a name and email address used to present and change the user's info
 * via git config.
 *
 * It'll offer the email addresses from the user's accounts (if any), and an
 * option to enter a custom email address. In this case, it will also warn the
 * user when this custom email address could result in misattributed commits.
 */
export class GitConfigUserForm extends React.Component<
  IGitConfigUserFormProps,
  IGitConfigUserFormState
> {
  private emailInputRef = React.createRef<TextBox>()
  private emailDropdownRef = React.createRef<PopoverDropdown>()

  private getAccountEmailsFromAccounts = memoizeOne(
    (accounts: ReadonlyArray<Account>) => {
      const seenEmails = new Set<string>()
      const accountEmails = new Array<AccountEmail>()

      for (const account of accounts) {
        const verifiedEmails = account.emails
          .filter(x => x.verified)
          .map(x => x.email)

        // For GitHub.com we always include the stealth email, see
        // https://github.com/desktop/desktop/pull/19968
        const emails = isDotComAccount(account)
          ? [...verifiedEmails, getStealthEmailForAccount(account)]
          : verifiedEmails

        for (const email of emails) {
          const normalizedEmail = email.toLowerCase()

          if (!seenEmails.has(normalizedEmail)) {
            seenEmails.add(normalizedEmail)
            accountEmails.push({ email, normalizedEmail, account })
          }
        }
      }

      return accountEmails
    }
  )

  public constructor(props: IGitConfigUserFormProps) {
    super(props)

    const savedEmails = getSavedGitEmails()

    this.state = {
      emailIsOther:
        !this.isValidEmail(props.email, savedEmails) &&
        !props.isLoadingGitConfig,
      savedEmails,
    }
  }

  /** Whether the email is one of the suggestions offered in the dropdown */
  private isValidEmail = (
    email: string,
    savedEmails: ReadonlyArray<string> = this.state.savedEmails
  ) => this.isAccountEmail(email) || this.isSavedEmail(email, savedEmails)

  private isAccountEmail = (email: string) => {
    const normalizedEmail = email.toLowerCase()
    return this.accountEmails.some(x => x.normalizedEmail === normalizedEmail)
  }

  private isSavedEmail = (
    email: string,
    savedEmails: ReadonlyArray<string> = this.state.savedEmails
  ) => {
    const normalizedEmail = email.toLowerCase()
    return savedEmails.some(x => x.toLowerCase() === normalizedEmail)
  }

  /** Saved emails which aren't already offered as account emails */
  private get savedOnlyEmails(): ReadonlyArray<string> {
    return this.state.savedEmails.filter(e => !this.isAccountEmail(e))
  }

  /** Whether the dropdown is showing one of the user's saved emails */
  private get isSavedEmailSelected() {
    return (
      !this.state.emailIsOther &&
      !this.isAccountEmail(this.props.email) &&
      this.isSavedEmail(this.props.email)
    )
  }

  public componentDidUpdate(
    prevProps: IGitConfigUserFormProps,
    prevState: IGitConfigUserFormState
  ) {
    const isEmailInputFocused =
      this.emailInputRef.current !== null &&
      this.emailInputRef.current.isFocused

    // If the email coming from the props has changed, it means a new config
    // was loaded into the form. In that case, make sure to only select the
    // option "Other" if strictly needed, and select one of the account emails
    // otherwise.
    // If the "Other email" input field is currently focused, we won't hide it
    // from the user, to prevent annoying UI glitches.
    if (prevProps.email !== this.props.email && !isEmailInputFocused) {
      this.setState({
        emailIsOther:
          !this.isValidEmail(this.props.email) &&
          !this.props.isLoadingGitConfig,
      })
    }

    // Focus the text input that allows the user to enter a custom
    // email address when the user selects "Other".
    if (
      this.state.emailIsOther !== prevState.emailIsOther &&
      this.state.emailIsOther === true &&
      this.emailInputRef.current !== null
    ) {
      const emailInput = this.emailInputRef.current
      emailInput.focus()
      emailInput.selectAll()
    }
  }

  public render() {
    return (
      <div>
        <Row>
          <TextBox
            label="Name"
            value={this.props.name}
            disabled={this.props.disabled}
            onValueChanged={this.props.onNameChanged}
          />
        </Row>
        {this.renderEmailDropdown()}
        {this.renderEmailTextBox()}
        {this.state.emailIsOther || this.isSavedEmailSelected ? (
          <GitEmailNotFoundWarning
            accounts={this.props.accounts}
            email={this.props.email}
          />
        ) : null}
      </div>
    )
  }

  private renderEmailDropdown() {
    if (!this.hasEmailSuggestions) {
      return null
    }

    const { emailIsOther } = this.state
    const savedOnlyEmails = this.savedOnlyEmails

    return (
      <Row className="git-email-picker-row">
        <PopoverDropdown
          ref={this.emailDropdownRef}
          className="git-email-picker"
          label="Email"
          disabled={this.props.disabled}
          contentTitle="Choose an email"
          maxHeight={320}
          buttonAriaLabel={`Email: ${
            emailIsOther ? OtherEmailSelectValue : this.props.email
          }`}
          buttonContent={this.renderSelectedEmail()}
        >
          <div className="git-email-picker-content">
            <ul className="email-avatar-options">
              {this.accountEmails.map(e =>
                this.renderEmailOption(e.email, e.account.endpoint)
              )}
            </ul>
            {savedOnlyEmails.length > 0 && (
              <>
                <h4 className="git-email-picker-group">Saved emails</h4>
                <ul className="email-avatar-options">
                  {savedOnlyEmails.map(e =>
                    this.renderEmailOption(e, this.defaultAvatarEndpoint)
                  )}
                </ul>
              </>
            )}
            <Button
              className={
                emailIsOther
                  ? 'git-email-picker-other selected'
                  : 'git-email-picker-other'
              }
              ariaPressed={emailIsOther}
              onClick={this.onOtherEmailClick}
            >
              <Octicon symbol={octicons.pencil} />
              <span>{OtherEmailSelectValue}</span>
            </Button>
          </div>
        </PopoverDropdown>
        {this.isSavedEmailSelected && (
          <Button
            onClick={this.onRemoveSavedEmail}
            disabled={this.props.disabled}
            ariaLabel={`Remove saved email ${this.props.email}`}
          >
            Remove
          </Button>
        )}
      </Row>
    )
  }

  private renderSelectedEmail() {
    if (this.state.emailIsOther) {
      return (
        <span className="git-email-picker-selected">
          <Octicon symbol={octicons.pencil} />
          <span className="git-email-picker-selected-email">
            {OtherEmailSelectValue}
          </span>
        </span>
      )
    }

    const { email, name, accounts } = this.props
    const account = this.accountEmails.find(
      e => e.normalizedEmail === email.toLowerCase()
    )?.account
    const endpoint = account?.endpoint ?? this.defaultAvatarEndpoint

    return (
      <span className="git-email-picker-selected">
        <Avatar
          accounts={accounts}
          user={{ email, name, endpoint, avatarURL: undefined }}
          title={null}
        />
        <span className="git-email-picker-selected-email">{email}</span>
      </span>
    )
  }

  private renderEmailOption(email: string, endpoint: string | null) {
    return (
      <EmailAvatarOption
        key={email}
        email={email}
        name={this.props.name}
        endpoint={endpoint}
        accounts={this.props.accounts}
        isSelected={
          !this.state.emailIsOther &&
          email.toLowerCase() === this.props.email.toLowerCase()
        }
        onSelect={this.onEmailOptionSelected}
      />
    )
  }

  /** The endpoint used for the avatars of emails not tied to an account */
  private get defaultAvatarEndpoint(): string | null {
    const account =
      this.props.accounts.find(isDotComAccount) ?? this.props.accounts.at(0)
    return account?.endpoint ?? null
  }

  private renderEmailTextBox() {
    if (this.state.emailIsOther === false && this.hasEmailSuggestions) {
      return null
    }

    // Only show the "Email" label above the textbox when the textbox is
    // presented independently, without the email dropdown, not when presented
    // as a consequence of the option "Other" selected in the dropdown.
    const label = this.state.emailIsOther ? undefined : 'Email'
    // If there is not a label, provide a screen reader announcement.
    const ariaLabel = label ? undefined : 'Email'

    return (
      <Row>
        <TextBox
          ref={this.emailInputRef}
          label={label}
          type="email"
          value={this.props.email}
          disabled={this.props.disabled}
          onValueChanged={this.props.onEmailChanged}
          ariaLabel={ariaLabel}
          ariaDescribedBy="git-email-not-found-warning-for-screen-readers"
          ariaControls="git-email-not-found-warning-for-screen-readers"
        />
        {this.canSaveEmail && (
          <Button
            onClick={this.onSaveEmail}
            disabled={this.props.disabled}
            tooltip="Save this email so you can pick it from the dropdown later"
          >
            {__DARWIN__ ? 'Save Email' : 'Save email'}
          </Button>
        )}
      </Row>
    )
  }

  private get accountEmails(): ReadonlyArray<AccountEmail> {
    return this.getAccountEmailsFromAccounts(this.props.accounts)
  }

  private get hasEmailSuggestions() {
    return this.accountEmails.length > 0 || this.savedOnlyEmails.length > 0
  }

  /** Whether the custom email typed by the user can be saved */
  private get canSaveEmail() {
    const email = this.props.email.trim()
    return (
      email.includes('@') &&
      !this.isAccountEmail(email) &&
      !this.isSavedEmail(email)
    )
  }

  private onSaveEmail = () => {
    const email = this.props.email.trim()
    const savedEmails = addSavedGitEmail(email)
    this.setState({ savedEmails, emailIsOther: false })

    if (email !== this.props.email) {
      this.props.onEmailChanged(email)
    }
  }

  private onRemoveSavedEmail = () => {
    const savedEmails = removeSavedGitEmail(this.props.email)
    this.setState({ savedEmails, emailIsOther: true })
  }

  private onEmailOptionSelected = (email: string) => {
    this.emailDropdownRef.current?.closePopover()
    this.setState({ emailIsOther: false })
    this.props.onEmailChanged(email)
  }

  private onOtherEmailClick = () => {
    // Selecting "Other" doesn't change the email address itself, so there's
    // no need to emit an update notification.
    this.emailDropdownRef.current?.closePopover()
    this.setState({ emailIsOther: true })
  }
}
