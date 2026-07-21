/**
 * Thrown by TaskCommandExecutor when a command fails for a business
 * reason (referenced project/task/assignee doesn't exist) - distinct
 * from an unexpected infrastructure error. The controller catches
 * this specific type and maps it to a 400; anything else propagates
 * as a genuine 500.
 */
export default class TaskCommandExecutionException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskCommandExecutionException'
  }
}
