import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userDataTable } from "@workspace/db";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/data", requireUser, async (req, res, next) => {
  try {
    const user = res.locals.user as { id: string };
    const [record] = await db
      .select({ data: userDataTable.data })
      .from(userDataTable)
      .where(eq(userDataTable.userId, user.id))
      .limit(1);
    res.json({ data: record?.data ?? {} });
  } catch (error) {
    next(error);
  }
});

router.put("/data", requireUser, async (req, res, next) => {
  try {
    const user = res.locals.user as { id: string };
    const data = req.body?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      res.status(400).json({ message: "저장할 데이터 형식이 올바르지 않습니다." });
      return;
    }
    const [record] = await db
      .insert(userDataTable)
      .values({ userId: user.id, data })
      .onConflictDoUpdate({
        target: userDataTable.userId,
        set: { data, updatedAt: new Date() },
      })
      .returning({ data: userDataTable.data });
    res.json({ data: record?.data ?? data });
  } catch (error) {
    next(error);
  }
});

export default router;