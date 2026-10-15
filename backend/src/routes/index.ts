import { Router } from 'express'

import accessManagementRoutes from './access-management.routes.js'
import authRoutes from './auth.routes.js'
import employeeRoutes from './employee.routes.js'
import leaveRoutes from './leave.routes.js'
import permissionDelegationRoutes from './permission-delegation.routes.js'
import platformAuthRoutes from './platform-auth.routes.js'
import platformCompanyRoutes from './platform-company.routes.js'
import roleRoutes from './role.routes.js'
import systemRoutes from './system.routes.js'
import userRoutes from './user.routes.js'

const router = Router()

export const routeGroups = [
	{ prefix: '', router: systemRoutes },
	{ prefix: '/auth', router: authRoutes },
	{ prefix: '/platform/auth', router: platformAuthRoutes },
	{ prefix: '/platform/companies', router: platformCompanyRoutes },
	{ prefix: '/employees', router: employeeRoutes },
	{ prefix: '/users', router: userRoutes },
	{ prefix: '/roles', router: roleRoutes },
	{ prefix: '/access', router: accessManagementRoutes },
	{ prefix: '/access/delegations', router: permissionDelegationRoutes },
	{ prefix: '/leaves', router: leaveRoutes },
]

for (const { prefix, router: routeGroup } of routeGroups) {
	if (prefix) {
		router.use(prefix, routeGroup)
	} else {
		router.use(routeGroup)
	}
}

export default router