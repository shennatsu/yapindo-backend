import type { HttpContext } from '@adonisjs/core/http'
import Project from '#models/project'
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
   * Admin only. Note: the Commit 10 migration's created_by FK uses
   * RESTRICT, not this table's own concern - but a project with
   * existing tasks referencing project_id will hit the same kind of
   * FK protection once the tasks table exists (later commit).
   */
  async destroy({ params, response }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await project.delete()

    return response.noContent()
  }
}
