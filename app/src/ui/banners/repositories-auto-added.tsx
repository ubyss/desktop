import * as React from 'react'
import { SuccessBanner } from './success-banner'

export function RepositoriesAutoAdded({
  count,
  folder,
  onDismissed,
}: {
  readonly count: number
  readonly folder: string | null
  readonly onDismissed: () => void
}) {
  const repositories = count === 1 ? 'repository' : 'repositories'

  return (
    <SuccessBanner timeout={7000} onDismissed={onDismissed}>
      <div className="banner-message">
        <span>
          {`Added ${count} ${repositories} from `}
          {folder !== null ? (
            <strong>{folder}</strong>
          ) : (
            'your repository folders'
          )}
        </span>
      </div>
    </SuccessBanner>
  )
}
