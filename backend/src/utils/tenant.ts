import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js'

export function getCompanyId(
  req: AuthenticatedRequest,
): number {
  const companyId = req.user.companyId

  if (
    !Number.isSafeInteger(companyId) ||
    companyId <= 0
  ) {
    throw new Error(
      'Company context tidak valid.',
    )
  }

  return companyId
}