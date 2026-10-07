import * as React from 'react'

import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'
import {
  createCustomGroup,
  IRepositoryGroupsState,
  renameCustomGroup,
} from '../../lib/repository-groups'

interface IRepositoryGroupNameDialogProps {
  readonly dispatcher: Dispatcher
  readonly repositoryGroups: IRepositoryGroupsState

  /** The custom group to rename, or null to create a new one */
  readonly groupId: string | null
  readonly initialName: string

  /** A repository to move into the newly created group */
  readonly repositoryPath?: string
  readonly onDismissed: () => void
}

interface IRepositoryGroupNameDialogState {
  readonly name: string
}

/** Dialog to name a new custom repository group or rename an existing one */
export class RepositoryGroupNameDialog extends React.Component<
  IRepositoryGroupNameDialogProps,
  IRepositoryGroupNameDialogState
> {
  public constructor(props: IRepositoryGroupNameDialogProps) {
    super(props)
    this.state = { name: props.initialName }
  }

  public render() {
    const isNew = this.props.groupId === null
    const title = isNew
      ? __DARWIN__
        ? 'New Repository Group'
        : 'New repository group'
      : __DARWIN__
      ? 'Rename Repository Group'
      : 'Rename repository group'

    return (
      <Dialog
        id="repository-group-name"
        title={title}
        ariaDescribedBy="repository-group-name-description"
        onDismissed={this.props.onDismissed}
        onSubmit={this.onSubmit}
      >
        <DialogContent>
          <p id="repository-group-name-description">
            {isNew
              ? 'Groups let you organize the repository list. Move repositories into a group from their context menu.'
              : 'Choose a new name for the group.'}
          </p>
          <TextBox
            label="Name"
            value={this.state.name}
            onValueChanged={this.onNameChanged}
          />
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={
              isNew ? (__DARWIN__ ? 'Create Group' : 'Create group') : 'Rename'
            }
            okButtonDisabled={this.state.name.trim().length === 0}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private onNameChanged = (name: string) => {
    this.setState({ name })
  }

  private onSubmit = () => {
    const { repositoryGroups, groupId, repositoryPath } = this.props
    const name = this.state.name.trim()

    this.props.dispatcher.setRepositoryGroups(
      groupId === null
        ? createCustomGroup(repositoryGroups, name, repositoryPath)
        : renameCustomGroup(repositoryGroups, groupId, name)
    )
    this.props.onDismissed()
  }
}
