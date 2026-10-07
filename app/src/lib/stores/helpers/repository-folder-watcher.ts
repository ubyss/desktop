import { FSWatcher, watch } from 'fs'

/**
 * Watches folders (non-recursively) and invokes a callback, debounced, when
 * their direct contents change, e.g. when a repository is cloned into them.
 */
export class RepositoryFolderWatcher {
  private watchers = new Array<FSWatcher>()
  private timeoutId: number | null = null

  public constructor(
    private readonly onChange: () => void,
    private readonly debounceMs: number = 3000
  ) {}

  /** Start watching the given folders, replacing any previous ones */
  public start(folders: ReadonlyArray<string>) {
    this.stop()

    for (const folder of folders) {
      try {
        const watcher = watch(folder, { persistent: false }, () =>
          this.scheduleChange()
        )
        watcher.on('error', e =>
          log.warn(`[RepositoryFolderWatcher] error watching ${folder}`, e)
        )
        this.watchers.push(watcher)
      } catch (e) {
        log.warn(`[RepositoryFolderWatcher] could not watch ${folder}`, e)
      }
    }
  }

  /** Stop watching all folders */
  public stop() {
    for (const watcher of this.watchers) {
      watcher.close()
    }
    this.watchers = []

    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  private scheduleChange() {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId)
    }

    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null
      this.onChange()
    }, this.debounceMs)
  }
}
