import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TaxPermissionRepository } from "../repositories/tax-permission.repository";
import { TAX_PERMISSION_KEY } from "./tax-permission.decorator";
import { TaxPermission } from "../../domain/permissions/tax-permission.types";

/**
 * Fine-grained permission check layered on top of the app's existing
 * RolesGuard (still required to be ADMIN). A route with no
 * @RequireTaxPermission() decorator is allowed through unchanged so this
 * guard can be applied module-wide without over-restricting read-only
 * endpoints that only need @Roles(Role.ADMIN).
 */
@Injectable()
export class TaxPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissions: TaxPermissionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      TaxPermission | undefined
    >(TAX_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId) {
      throw new ForbiddenException("Authentication required");
    }
    const allowed = await this.permissions.hasPermission(user.userId, required);
    if (!allowed) {
      throw new ForbiddenException(
        `Missing required tax permission: ${required}`,
      );
    }
    return true;
  }
}
