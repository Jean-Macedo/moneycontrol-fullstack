export default function AppShell({ children }) {
  return (
    <div className="min-h-full flex justify-center">
      <main className="w-full max-w-md px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
