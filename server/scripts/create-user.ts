import "./bootstrap";
import { UserRole } from "@shared/types";
import { Team, User } from "@server/models";

interface Args {
  email?: string;
  password?: string;
  name?: string;
  admin?: boolean;
  team?: string;
}

function parseArgs(): Args {
  const args: Args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const next = process.argv[i + 1];

    if (arg === "--admin") {
      args.admin = true;
      continue;
    }
    if (arg === "--email" && next) {
      args.email = next;
      i++;
      continue;
    }
    if (arg === "--password" && next) {
      args.password = next;
      i++;
      continue;
    }
    if (arg === "--name" && next) {
      args.name = next;
      i++;
      continue;
    }
    if (arg === "--team" && next) {
      args.team = next;
      i++;
      continue;
    }
  }
  return args;
}

function usage(): never {
  /* eslint-disable no-console */
  console.error(
    "Usage: node build/server/scripts/create-user.js \\\n" +
      "    --email me@example.com \\\n" +
      "    --password 'a-strong-secret' \\\n" +
      "    [--name 'Display Name'] \\\n" +
      "    [--admin] \\\n" +
      "    [--team 'Workspace Name']"
  );
  /* eslint-enable no-console */
  process.exit(1);
}

async function findOrCreateTeam(name: string): Promise<Team> {
  let team = await Team.findOne({ order: [["createdAt", "ASC"]] });
  if (team) {
    return team;
  }
  // eslint-disable-next-line no-console
  console.log(`No team found. Creating new team: ${name}`);
  team = await Team.create({ name });
  return team;
}

async function main() {
  const args = parseArgs();
  if (!args.email || !args.password) {
    usage();
  }

  const email = args.email!.trim().toLowerCase();
  const password = args.password!;
  const displayName = args.name ?? email.split("@")[0];
  const teamName = args.team ?? "Workspace";

  const team = await findOrCreateTeam(teamName);

  let user = await User.findOne({ where: { teamId: team.id, email } });
  const isNew = !user;

  if (!user) {
    user = await User.create({
      teamId: team.id,
      email,
      name: displayName,
      role: args.admin ? UserRole.Admin : UserRole.Member,
    });
  } else if (args.admin && user.role !== UserRole.Admin) {
    user.role = UserRole.Admin;
    await user.save();
  }

  await user.setPassword(password);

  /* eslint-disable no-console */
  console.log(
    `${isNew ? "Created" : "Updated"} user ${user.email} ` +
      `(id=${user.id}, role=${user.role}, team=${team.name})`
  );
  /* eslint-enable no-console */
}

void main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
