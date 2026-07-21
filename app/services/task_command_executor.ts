import db from '@adonisjs/lucid/services/db'
import Project from '#models/project'
import Task from '#models/task'
import User from '#models/user'
import type { TaskCommand } from '#ai/task_command_validator'
import TaskCommandExecutionException from '#exceptions/task_command_execution_exception'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface TaskCommandResult {
  action: TaskCommand['action']
  taskId: number
}

/**
 * Executes a validated batch of TaskCommands atomically. Every
 * command runs inside one Lucid-managed transaction - existence
 * checks run against the transaction's own client so a check and
 * its mutation always see the same snapshot. Any failure throws
 * TaskCommandExecutionException, which Lucid automatically rolls
 * the whole batch back on.
 */
class TaskCommandExecutor {
  async execute(commands: TaskCommand[]): Promise<TaskCommandResult[]> {
    return db.transaction(async (trx) => {
      const results: TaskCommandResult[] = []

      for (const command of commands) {
        results.push(await this.#executeOne(command, trx))
      }

      return results
    })
  }

  async #executeOne(
    command: TaskCommand,
    trx: TransactionClientContract
  ): Promise<TaskCommandResult> {
    if ('assigneeId' in command && command.assigneeId !== undefined) {
      const assignee = await User.query({ client: trx }).where('id', command.assigneeId).first()
      if (!assignee) {
        throw new TaskCommandExecutionException(
          `Cannot execute ${command.action}: assignee_id ${command.assigneeId} does not exist`
        )
      }
    }

    switch (command.action) {
      case 'create_task': {
        const project = await Project.query({ client: trx }).where('id', command.projectId).first()

        if (!project) {
          throw new TaskCommandExecutionException(
            `Cannot create task: project_id ${command.projectId} does not exist`
          )
        }

        const task = new Task()
        task.useTransaction(trx)
        task.merge({
          projectId: command.projectId,
          title: command.title,
          description: command.description ?? '',
          status: command.status ?? 'todo',
          priority: command.priority ?? 'medium',
          assigneeId: command.assigneeId ?? null,
        })
        await task.save()

        return { action: 'create_task', taskId: task.id }
      }

      case 'update_task': {
        const task = await Task.query({ client: trx }).where('id', command.taskId).first()

        if (!task) {
          throw new TaskCommandExecutionException(
            `Cannot update task: task_id ${command.taskId} does not exist`
          )
        }

        task.useTransaction(trx)
        task.merge({
          title: command.title,
          description: command.description,
          status: command.status,
          priority: command.priority,
          assigneeId: command.assigneeId,
        })
        await task.save()

        return { action: 'update_task', taskId: task.id }
      }

      case 'delete_task': {
        const task = await Task.query({ client: trx }).where('id', command.taskId).first()

        if (!task) {
          throw new TaskCommandExecutionException(
            `Cannot delete task: task_id ${command.taskId} does not exist`
          )
        }

        task.useTransaction(trx)
        await task.delete()

        return { action: 'delete_task', taskId: command.taskId }
      }
    }
  }
}

export default new TaskCommandExecutor()
