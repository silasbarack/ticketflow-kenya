import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../src/common/validators/password.validator';

const USAGE = `Create a TicketFlow admin account, or promote an existing account to admin.

Usage:
  npm run create-admin -- --email <email> [--first-name <name> --last-name <name>]

New accounts need --first-name and --last-name, plus a password. The password is
read from ADMIN_PASSWORD if set, otherwise you are prompted for it (input hidden).
Existing accounts are promoted to ADMIN and re-activated; their password is kept.
`;

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--help' || key === '-h') args.help = 'true';
    else if (key.startsWith('--')) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) fail(`Missing value for ${key}`, true);
      args[key.slice(2)] = value;
      i++;
    } else fail(`Unexpected argument: ${key}`, true);
  }
  return args;
}

function fail(message: string, showUsage = false): never {
  console.error(showUsage ? `Error: ${message}\n\n${USAGE}` : `Error: ${message}`);
  process.exit(1);
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      write.call(rl, s.startsWith(question) ? question : '');
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function readPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY) fail('Set ADMIN_PASSWORD when running without a terminal.');
  const password = await promptHidden('Password: ');
  const confirm = await promptHidden('Confirm password: ');
  if (password !== confirm) fail('Passwords do not match.');
  return password;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const email = args.email?.trim();
  if (!email) fail('--email is required.', true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`"${email}" is not a valid email address.`);

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role === UserRole.ADMIN && existing.isActive) {
        console.log(`${email} is already an active admin. Nothing changed.`);
        return;
      }
      await prisma.user.update({ where: { id: existing.id }, data: { role: UserRole.ADMIN, isActive: true } });
      console.log(`Promoted ${email} (was ${existing.role}${existing.isActive ? '' : ', suspended'}) to an active ADMIN.`);
      return;
    }

    const firstName = args['first-name']?.trim();
    const lastName = args['last-name']?.trim();
    if (!firstName || !lastName) fail('--first-name and --last-name are required to create a new account.', true);

    const password = await readPassword();
    if (!PASSWORD_POLICY_REGEX.test(password)) fail(PASSWORD_POLICY_MESSAGE);

    await prisma.user.create({
      data: { email, firstName, lastName, role: UserRole.ADMIN, passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Created admin account ${email}. Sign in at /login, then open /admin/dashboard.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
