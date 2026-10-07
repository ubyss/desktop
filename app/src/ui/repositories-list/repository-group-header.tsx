import * as React from 'react'
import classNames from 'classnames'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { RepositoryListGroup } from './group-repositories'

interface IRepositoryGroupHeaderProps {
  readonly group: RepositoryListGroup
  readonly label: string

  /** Number of repositories in the group, shown while it's collapsed */
  readonly count: number
  readonly isCollapsed: boolean

  /** Whether the group can be collapsed (it can't while filtering) */
  readonly canCollapse: boolean
  readonly onToggle: (group: RepositoryListGroup) => void
  readonly onContextMenu: (
    group: RepositoryListGroup,
    event: React.MouseEvent<HTMLDivElement>
  ) => void
}

/** The header of a group in the repository list, which can be collapsed */
export class RepositoryGroupHeader extends React.Component<IRepositoryGroupHeaderProps> {
  public render() {
    const { label, count, isCollapsed, canCollapse, group } = this.props
    const className = classNames(
      'filter-list-group-header',
      'repository-group-header',
      { custom: group.kind === 'custom' }
    )

    return (
      <div className={className} onContextMenu={this.onContextMenu}>
        {canCollapse ? (
          <button
            className="repository-group-toggle"
            aria-expanded={!isCollapsed}
            aria-label={`${label}, ${count} ${
              count === 1 ? 'repository' : 'repositories'
            }`}
            onClick={this.onToggle}
          >
            <Octicon
              symbol={
                isCollapsed ? octicons.chevronRight : octicons.chevronDown
              }
            />
            <span className="repository-group-label">{label}</span>
            {isCollapsed && (
              <span className="repository-group-count">{count}</span>
            )}
          </button>
        ) : (
          <span className="repository-group-label">{label}</span>
        )}
      </div>
    )
  }

  private onToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    this.props.onToggle(this.props.group)
  }

  private onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    this.props.onContextMenu(this.props.group, event)
  }
}
