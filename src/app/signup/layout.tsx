import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — Mission Control",
  description: "Create your Mission Control account",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
