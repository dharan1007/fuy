export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-paper">
      <div className="container py-8 text-sm text-stone-600 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} <span className="font-medium">fuy</span> — you own your data.</div>
        <div className="flex items-center gap-3">
          <span className="pill-blue">Clarity</span>
          <span className="pill-orange">Creativity</span>
          <span className="pill-green">Connection</span>
          <span className="pill-yellow">Awe</span>
        </div>
      </div>
    </footer>
  );
}
