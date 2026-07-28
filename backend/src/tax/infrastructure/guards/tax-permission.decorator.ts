import { SetMetadata } from "@nestjs/common";
import { TaxPermission } from "../../domain/permissions/tax-permission.types";

export const TAX_PERMISSION_KEY = "taxPermission";

/** Marks a controller method as requiring the given tax permission (in addition to the ADMIN role, enforced separately by RolesGuard). */
export const RequireTaxPermission = (permission: TaxPermission) =>
  SetMetadata(TAX_PERMISSION_KEY, permission);
