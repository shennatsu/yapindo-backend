import type { HttpContext } from '@adonisjs/core/http'
import Project from '#models/project'
import Task from '#models/task'
import { createProjectValidator } from '#validators/create_project_validator'
import { updateProjectValidator } from '#validators/update_project_validator'
import cacheService from '#services/cache_service'

const CACHE_TTL_SECONDS = 60

const projectIndexKey = () => 'projects:index'
const projectKey = (id: number | string) => `projects:${id}`
const projectTasksKey = (id: number | string) => `projects:${id}:tasks`

export default class ProjectsController {
  /**
   * GET /projects
   *
   * Available to any authenticated role - Bagian 3 grants both admin
   * and user visibility into every project, not just ones they created.
   */
  async index({ response }: HttpContext) {
    const projects = await cacheService.remember(projectIndexKey(), CACHE_TTL_SECONDS, async () => {
      return Project.query().preload('creator').orderBy('id', 'asc')
    })

    return response.ok({ data: projects })
  }

  /**
   * GET /projects/:id
   *
   * Same read access as index - any authenticated role.
   */
  async show({ params, response }: HttpContext) {
    const project = await cacheService.remember(
      projectKey(params.id),
      CACHE_TTL_SECONDS,
      async () => {
        return Project.query().where('id', params.id).preload('creator').firstOrFail()
      }
    )

    return response.ok({ data: project })
  }

  /**
   * POST /projects
   *
   * Admin only (enforced at the route level). Invalidates only the
   * list cache - an existing single-project or task-list cache
   * cannot have been made stale by a *new* project being created.
   */
  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(createProjectValidator)

    const project = await Project.create({
      ...payload,
      createdBy: auth.user!.id,
    })

    await project.load('creator')
    await cacheService.forget(projectIndexKey())

    return response.created({ data: project })
  }

  /**
   * PUT /projects/:id
   *
   * Admin only. Invalidates the list and the single-project cache;
   * does not touch the task-list cache, since a name/description
   * change doesn't affect that project's tasks.
   */
  async update({ params, request, response }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    const payload = await request.validateUsing(updateProjectValidator)

    project.merge(payload)
    await project.save()
    await project.load('creator')

    await cacheService.forget(projectIndexKey())
    await cacheService.forget(projectKey(project.id))

    return response.ok({ data: project })
  }

  /**
   * DELETE /projects/:id
   *
   * Admin only. Invalidates all three keys for this project - its
   * tasks cascade-delete at the DB level (Commit 14), so the
   * task-list cache is now describing a project that no longer
   * exists at all, not just stale data.
   */
  async destroy({ params, response }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await project.delete()

    await cacheService.forget(projectIndexKey())
    await cacheService.forget(projectKey(project.id))
    await cacheService.forget(projectTasksKey(project.id))

    return response.noContent()
  }

  /**
   * GET /projects/:id/tasks
   *
   * Available to any authenticated role (Bagian 3). Confirms the
   * project exists first so a nonexistent id returns 404, not an
   * empty-array 200 indistinguishable from a real, task-less project
   * (existence check runs outside the cache, since a 404 must never
   * be cached as if it were a valid empty response).
   */
  async tasks({ params, response }: HttpContext) {
    await Project.findOrFail(params.id)

    const tasks = await cacheService.remember(
      projectTasksKey(params.id),
      CACHE_TTL_SECONDS,
      async () => {
        return Task.query().where('projectId', params.id).preload('assignee').orderBy('id', 'asc')
      }
    )

    return response.ok({ data: tasks })
  }
}
