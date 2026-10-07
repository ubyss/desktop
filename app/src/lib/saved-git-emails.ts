import { getStringArray, setStringArray } from './local-storage'

/** The local storage key for the user's saved custom Git email addresses */
const SavedGitEmailsKey = 'saved-git-emails'

/**
 * Get the custom email addresses the user has saved for quickly switching
 * their Git author email.
 */
export function getSavedGitEmails(): ReadonlyArray<string> {
  return getStringArray(SavedGitEmailsKey)
}

/** Whether the given email address is in the user's saved emails */
export function isSavedGitEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase()
  return getSavedGitEmails().some(e => e.toLowerCase() === normalizedEmail)
}

/**
 * Add an email address to the user's saved emails. Duplicates (compared
 * case-insensitively) and empty values are ignored.
 *
 * @returns the updated list of saved emails
 */
export function addSavedGitEmail(email: string): ReadonlyArray<string> {
  const trimmedEmail = email.trim()
  const savedEmails = getSavedGitEmails()

  if (trimmedEmail.length === 0 || isSavedGitEmail(trimmedEmail)) {
    return savedEmails
  }

  const updatedEmails = [...savedEmails, trimmedEmail]
  setStringArray(SavedGitEmailsKey, updatedEmails)
  return updatedEmails
}

/**
 * Remove an email address (compared case-insensitively) from the user's
 * saved emails.
 *
 * @returns the updated list of saved emails
 */
export function removeSavedGitEmail(email: string): ReadonlyArray<string> {
  const normalizedEmail = email.trim().toLowerCase()
  const updatedEmails = getSavedGitEmails().filter(
    e => e.toLowerCase() !== normalizedEmail
  )
  setStringArray(SavedGitEmailsKey, updatedEmails)
  return updatedEmails
}
