import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign in | H&M India" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/profile";
  return <AuthForm mode="login" next={next} />;
}
