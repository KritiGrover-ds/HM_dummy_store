import ProfileClient from "./ProfileClient";

export const metadata = { title: "My account | LINEA India" };

const TABS = ["profile", "orders", "favourites", "rewards"] as const;
export type ProfileTab = (typeof TABS)[number];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const t = typeof sp.tab === "string" ? sp.tab : "profile";
  const tab: ProfileTab = (TABS as readonly string[]).includes(t) ? (t as ProfileTab) : "profile";
  return <ProfileClient initialTab={tab} />;
}
