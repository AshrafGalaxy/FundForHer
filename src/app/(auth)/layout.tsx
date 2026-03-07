export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is for authentication pages.
  // It doesn't include the main header.
  return <>{children}</>;
}
