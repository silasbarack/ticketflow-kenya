import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsIn } from "class-validator";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/roles.enum";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../../../common/decorators/current-user.decorator";
import { TaxPermissionRepository } from "../repositories/tax-permission.repository";
import { TaxAuditService } from "../repositories/tax-audit.service";
import {
  ALL_TAX_PERMISSIONS,
  TaxPermission,
} from "../../domain/permissions/tax-permission.types";

class GrantPermissionDto {
  @IsIn(ALL_TAX_PERMISSIONS)
  permission!: TaxPermission;
}

/**
 * Managing WHO holds a fine-grained tax permission is itself gated only by
 * the app's existing ADMIN role (not by a TaxPermission), since that's the
 * bootstrap authority — some ADMIN must be able to grant the very first
 * tax.* permissions. Every grant/revoke is audited.
 */
@Controller("admin/tax/permissions")
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class TaxPermissionsController {
  constructor(
    private permissions: TaxPermissionRepository,
    private audit: TaxAuditService,
  ) {}

  @Get(":userId")
  list(@Param("userId") userId: string) {
    return this.permissions.listForUser(userId);
  }

  @Post(":userId/grant")
  async grant(
    @Param("userId") userId: string,
    @Body() dto: GrantPermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const grant = await this.permissions.grant(
      userId,
      dto.permission,
      user.userId,
    );
    await this.audit.log({
      action: "TAX_PERMISSION_GRANTED",
      entityType: "TaxPermissionGrant",
      entityId: grant.id,
      actorUserId: user.userId,
      metadata: { targetUserId: userId, permission: dto.permission },
    });
    return grant;
  }

  @Post(":userId/revoke")
  async revoke(
    @Param("userId") userId: string,
    @Body() dto: GrantPermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.permissions.revoke(
      userId,
      dto.permission,
      user.userId,
    );
    await this.audit.log({
      action: "TAX_PERMISSION_REVOKED",
      entityType: "TaxPermissionGrant",
      entityId: userId,
      actorUserId: user.userId,
      metadata: { targetUserId: userId, permission: dto.permission },
    });
    return result;
  }
}
