import { Router, type IRouter } from "express";
import { and, eq, lt } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import {
  clearSessionCookie,
  createSession,
  createUser,
  emailOf,
  findUserByEmail,
  getUserFromRequest,
  hashPassword,
  requireUser,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 12) return false;
  current.count += 1;
  return true;
}

router.get("/auth/me", async (req, res, next) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ message: "로그인이 필요합니다." });
      return;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const name = stringField(req.body?.name);
    const email = emailOf(stringField(req.body?.email));
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (name.length < 2 || name.length > 40) {
      res.status(400).json({ message: "이름은 2자 이상 40자 이하로 입력해 주세요." });
      return;
    }
    if (!email.includes("@") || email.length > 160) {
      res.status(400).json({ message: "올바른 이메일 주소를 입력해 주세요." });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ message: "비밀번호는 8자 이상으로 설정해 주세요." });
      return;
    }
    if (!checkRateLimit(`register:${req.ip}`)) {
      res.status(429).json({ message: "잠시 후 다시 시도해 주세요." });
      return;
    }
    if (await findUserByEmail(email)) {
      res.status(409).json({ message: "이미 가입된 이메일입니다." });
      return;
    }
    const user = await createUser(name, email, password);
    const session = await createSession(user.id);
    setSessionCookie(res, session.id, session.expiresAt);
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ message: "이미 가입된 이메일입니다." });
      return;
    }
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = emailOf(stringField(req.body?.email));
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!checkRateLimit(`login:${req.ip}:${email}`)) {
      res.status(429).json({ message: "잠시 후 다시 시도해 주세요." });
      return;
    }
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ message: "이메일 또는 비밀번호가 맞지 않습니다." });
      return;
    }
    const session = await createSession(user.id);
    setSessionCookie(res, session.id, session.expiresAt);
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", requireUser, async (req, res, next) => {
  try {
    const sessionId = req.cookies?.livi_session as string | undefined;
    if (sessionId) await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    clearSessionCookie(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;