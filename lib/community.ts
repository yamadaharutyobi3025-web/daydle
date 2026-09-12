import { communityMissions } from "@/data/community";
import type { CommunityMission } from "@/types/mission";
import { dayNumber } from "@/lib/date";

const DAILY_COUNT = 5;

/** その日ごとに、みんなの遠回りサンプルから決まった5件を選ぶ（日替わり・最大5件）。 */
export function getDailyCommunityMissions(dateKey: string): CommunityMission[] {
  const pool = communityMissions;
  const start = dayNumber(dateKey) % pool.length;
  const picked: CommunityMission[] = [];
  for (let i = 0; i < Math.min(DAILY_COUNT, pool.length); i++) {
    picked.push(pool[(start + i) % pool.length]);
  }
  return picked;
}
