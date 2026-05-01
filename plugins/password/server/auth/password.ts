import Router from "koa-router";
import { parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { User, Team } from "@server/models";
import type { APIContext } from "@server/types";
import { signIn } from "@server/utils/authentication";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";

const router = new Router();

router.get("password", (ctx) => {
  ctx.redirect("/?notice=auth-error&description=Use%20the%20password%20form");
});

router.post(
  "password",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  validate(T.PasswordSchema),
  async (ctx: APIContext<T.PasswordReq>) => {
    const { email, password, client } = ctx.input.body;
    const domain = parseDomain(ctx.request.hostname);

    let team: Team | null | undefined;
    if (!env.isCloudHosted) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        order: [["createdAt", "DESC"]],
      });
    } else if (domain.custom) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { domain: domain.host.toLowerCase() },
      });
    } else if (domain.teamSubdomain) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { subdomain: domain.teamSubdomain },
      });
    }

    if (!team) {
      Logger.info("authentication", "password login: no team found");
      return ctx.redirect(
        "/?notice=auth-error&description=Invalid%20credentials"
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      where: { teamId: team.id, email: normalizedEmail },
    });

    // Always run a verify, even with no user, so timing does not leak existence.
    const dummyUser =
      user ??
      User.build({
        teamId: team.id,
        email: normalizedEmail,
        name: "",
        passwordHash: null,
      });

    const ok = await dummyUser.verifyPassword(password);

    if (!user || !ok) {
      Logger.info("authentication", "password login failed", {
        email: normalizedEmail,
        ip: ctx.request.ip,
      });
      return ctx.redirect(
        "/?notice=auth-error&description=Invalid%20credentials"
      );
    }

    if (user.isSuspended) {
      return ctx.redirect("/?notice=user-suspended");
    }

    await signIn(ctx, "password", {
      user,
      team,
      isNewTeam: false,
      isNewUser: false,
      client,
    });
  }
);

export default router;
