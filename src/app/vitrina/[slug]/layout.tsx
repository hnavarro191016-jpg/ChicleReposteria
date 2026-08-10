export default function VitrinaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#fdf2f8]">
      {children}
    </div>
  );
}
