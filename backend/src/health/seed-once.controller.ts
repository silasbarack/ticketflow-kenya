import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { exec } from 'child_process';
import { Public } from '../common/decorators/public.decorator';

/**
 * Temporary one-off endpoint to run `npm run seed` against the production
 * database from a Render free-tier instance (which supports neither one-off
 * jobs nor SSH). Remove this controller once seeding is done.
 */
@Controller('admin/seed-once')
export class SeedOnceController {
  @Public()
  @Post()
  run(@Headers('x-seed-secret') secret: string) {
    if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
      throw new ForbiddenException();
    }
    return new Promise((resolve) => {
      exec('npm run seed', { cwd: process.cwd(), timeout: 120000 }, (error, stdout, stderr) => {
        resolve({ error: error?.message ?? null, stdout, stderr });
      });
    });
  }
}
