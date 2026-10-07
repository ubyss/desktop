import * as React from 'react'
import { Button } from '../lib/button'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

interface IWatchedRepositoryFolderProps {
  readonly folder: string
  readonly onRemove: (folder: string) => void
}

/** A folder in the list of watched repository folders in the preferences */
export class WatchedRepositoryFolder extends React.Component<IWatchedRepositoryFolderProps> {
  public render() {
    const { folder } = this.props

    return (
      <li className="watched-repository-folder">
        <Octicon symbol={octicons.fileDirectory} />
        <span className="watched-repository-folder-path">{folder}</span>
        <Button onClick={this.onRemove} ariaLabel={`Remove ${folder}`}>
          Remove
        </Button>
      </li>
    )
  }

  private onRemove = () => {
    this.props.onRemove(this.props.folder)
  }
}
