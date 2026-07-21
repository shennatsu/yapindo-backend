import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'
import User from '#models/user'
import type { TaskStatus } from '#enums/task_status'
import type { TaskPriority } from '#enums/task_priority'

export default class Task extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare projectId: number

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare status: TaskStatus

  @column()
  declare priority: TaskPriority

  @column()
  declare assigneeId: number | null

  @belongsTo(() => Project, {
    foreignKey: 'projectId',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => User, {
    foreignKey: 'assigneeId',
  })
  declare assignee: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
