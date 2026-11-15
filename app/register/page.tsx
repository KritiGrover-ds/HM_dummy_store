import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Become a member | H&M India" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/profile";
  return <AuthForm mode="register" next={next} />;
}
