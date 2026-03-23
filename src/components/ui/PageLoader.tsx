export function PageLoader({
  loading,
  children,
  fallback,
}: {
  loading: boolean;
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  if (loading) return <>{fallback}</>;
  return <>{children}</>;
}
