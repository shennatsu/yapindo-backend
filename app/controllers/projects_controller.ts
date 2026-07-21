import type { HttpContext } from '@adonisjs/core/http'
import Project from '#models/project'
import Task from '#models/task'
import { createProjectValidator } from '#validators/create_project_validator'
import { updateProjectValidator } from '#validators/update_project_validator'

export default class ProjectsController {
  /**
   * GET /projects
   *
   * Available to any authenticated role - Bagian 3 grants both admin
   * and user visibility into every project, not just ones they created.
   */
  async index({ response }: HttpContext) {
    const projects = await Project.query().preload('creator').orderBy('id', 'asc')

    return response.ok({ data: projects })
  }

  /**
   * GET /projects/:id
   *
   * Same read access as index - any authenticated role.
   */
  async show({ params, response }: HttpContext) {
    const project = await Project.query().where('id', params.id).preload('creator').firstOrFail()

    return response.ok({ data: project })
  }

  /**
   * POST /projects
   *
   * Admin only (enforced at the route level). createdBy always comes
   * from the authenticated admin, never from the request body - the
   * validator already strips any client-supplied created_by.
   */
  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(createProjectValidator)

    const project = await Project.create({
      ...payload,
      createdBy: auth.user.id,
    })

    await project.load('creator')

    return response.created({ data: project })
  }

  /**
   * PUT /projects/:id
   *
   * Admin only. Full-replace update - createdBy is immutable via
   * the API, same reasoning as store().
   */
  async update({ params, request, response }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    const payload = await request.validateUsing(updateProjectValidator)

    project.merge(payload)
    await project.save()
    await project.load('creator')

    return response.ok({ data: project })
  }

  /**
   * DELETE /projects/:id
   *
   * Admin only. Cascades to the project's tasks at the DB level
   * (see Commit 14's tasks migration, project_id FK ON DELETE CASCADE).
   */
  async destroy({ params, response }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await project.delete()

    return response.noContent()
  }

  /**
   * GET /projects/:id/tasks
   *
   * Available to any authenticated role (Bagian 3). Confirms the
   * project exists first so a nonexistent id returns 404, not an
   * empty-array 200 indistinguishable from a real, task-less project.
   */
  async tasks({ params, response }: HttpContext) {
    await Project.findOrFail(params.id)

    const tasks = await Task.query()
      .where('projectId', params.id)
      .preload('assignee')
      .orderBy('id', 'asc')

    return response.ok({ data: tasks })
  }
}
