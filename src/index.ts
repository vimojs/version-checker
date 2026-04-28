export { createVersionChecker } from './createVersionChecker'
export type {
  BaselineStorage,
  CheckResult,
  NotifyMode,
  UpdateAvailableContext,
  VersionChecker,
  VersionCheckerEvent,
  VersionCheckerOptions,
  VersionCheckerState
} from './types'

import type { VersionCheckerOptions } from './types'
import { createVersionChecker } from './createVersionChecker'

export function autoVersionCheck(options: VersionCheckerOptions = {}) {
  const checker = createVersionChecker(options)
  checker.start()
  return checker
}

