import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { serializeCycle } from "@/lib/serialize";
import { Cycle } from "@/models/Cycle";
import type { CycleDto } from "@/types/api";
import type { CycleStatus } from "@/types";
import mongoose from "mongoose";

export interface GoalWindowInfo {
  isOpen: boolean;
  startDate: Date;
  endDate: Date;
  message: string;
}

export class CycleService {
  /**
   * In development, auto-extends a past goal-setting window so demo data stays usable
   * without re-seeding after the window end date passes.
   */
  private static async refreshStaleGoalWindow(
    cycle: { _id: mongoose.Types.ObjectId; goalSettingWindow?: { startDate: Date; endDate: Date } | null },
  ): Promise<void> {
    if (process.env.NODE_ENV !== "development" || !cycle.goalSettingWindow) return;

    const end = new Date(cycle.goalSettingWindow.endDate);
    if (end >= new Date()) return;

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const newEnd = new Date(now);
    newEnd.setDate(newEnd.getDate() + 90);

    await Cycle.updateOne(
      { _id: cycle._id },
      {
        $set: {
          "goalSettingWindow.startDate": start,
          "goalSettingWindow.endDate": newEnd,
        },
      },
    );

    cycle.goalSettingWindow.startDate = start;
    cycle.goalSettingWindow.endDate = newEnd;
  }

  static async getActiveCycle(orgId: string) {
    await connectDB();
    const cycle = await Cycle.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      status: "active" satisfies CycleStatus,
    }).lean();

    if (!cycle) {
      throw new ApiError(404, "NO_ACTIVE_CYCLE", "No active performance cycle found");
    }

    await this.refreshStaleGoalWindow(cycle);

    return cycle;
  }

  static getGoalWindowInfo(
    cycle: { goalSettingWindow: { startDate: Date; endDate: Date } },
    now: Date = new Date(),
  ): GoalWindowInfo {
    const start = new Date(cycle.goalSettingWindow.startDate);
    const end = new Date(cycle.goalSettingWindow.endDate);
    const isOpen = now >= start && now <= end;

    let message: string;
    if (now < start) {
      message = `Goal setting opens on ${start.toLocaleDateString()}`;
    } else if (now > end) {
      message = `Goal setting closed on ${end.toLocaleDateString()}`;
    } else {
      message = `Goal setting open until ${end.toLocaleDateString()}`;
    }

    return { isOpen, startDate: start, endDate: end, message };
  }

  static isGoalSettingWindowOpen(
    cycle: { goalSettingWindow: { startDate: Date; endDate: Date } },
    now: Date = new Date(),
  ): boolean {
    return this.getGoalWindowInfo(cycle, now).isOpen;
  }

  static async assertGoalSettingWindowOpen(orgId: string): Promise<void> {
    const cycle = await this.getActiveCycle(orgId);
    if (!cycle.goalSettingWindow) {
      throw new ApiError(403, "WINDOW_CLOSED", "Goal setting window is not configured");
    }
    if (!this.isGoalSettingWindowOpen(cycle as { goalSettingWindow: { startDate: Date; endDate: Date } })) {
      const { message } = this.getGoalWindowInfo(
        cycle as { goalSettingWindow: { startDate: Date; endDate: Date } },
      );
      throw new ApiError(403, "WINDOW_CLOSED", message);
    }
  }

  static async getActiveCycleDto(orgId: string): Promise<CycleDto> {
    const cycle = await this.getActiveCycle(orgId);
    const window = cycle.goalSettingWindow;
    const isOpen = window
      ? this.isGoalSettingWindowOpen({ goalSettingWindow: window })
      : false;
    return serializeCycle(cycle, isOpen);
  }
}
