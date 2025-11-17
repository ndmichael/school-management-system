export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar will go here */}
      <main className="flex-1">{children}</main>
      {/* Footer will go here */}
    </div>
  );
}