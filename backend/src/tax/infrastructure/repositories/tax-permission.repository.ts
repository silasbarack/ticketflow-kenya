import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxPermission } from "../../domain/permissions/tax-permission.types";

@Injectable()
export class TaxPermissionRepository {
  constructor(private prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    permission: TaxPermission,
  ): Promise<boolean> {
    const grant = await this.prisma.taxPermissionGrant.findFirst({
      where: { userId, permission, revoked: false },
    });
    return !!grant;
  }

  async grant(userId: string, permission: TaxPermission, grantedBy: string) {
    return this.prisma.taxPermissionGrant.upsert({
      where: { userId_permission: { userId, permission } },
      update: { revoked: false, revokedAt: null, revokedBy: null, grantedBy },
      create: { userId, permission, grantedBy },
    });
  }

  async revoke(userId: string, permission: TaxPermission, revokedBy: string) {
    return this.prisma.taxPermissionGrant.updateMany({
      where: { userId, permission, revoked: false },
      data: { revoked: true, revokedBy, revokedAt: new Date() },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.taxPermissionGrant.findMany({
      where: { userId, revoked: false },
    });
  }
}
