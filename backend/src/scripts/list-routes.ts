import listRoutes from 'express-list-routes'

import { routeGroups } from '../routes/index.js'

const routes = routeGroups.flatMap(({ prefix, router }) =>
  listRoutes(router, {
    prefix: `/api${prefix}`,
    logger: false,
  }),
)

console.table(routes)