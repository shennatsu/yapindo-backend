import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * A single record of one call to POST /ai/command (or any future
 * logged action). Written once and never updated - see the "no
 * updated_at" note in this commit's design decision.
 */
export default class AuditLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @column()
  declare action: string

  @column()
  declare requestPayload: Record<string, unknown>

  @column()
  declare responsePayload: Record<string, unknown> | null

  @column()
  declare status: 'success' | 'failed'

  @column()
  declare failedReason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
