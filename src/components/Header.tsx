import Link from 'next/link'

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm tracking-[0.4em] text-imperio-gold">IMPERIO BARBER</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-white/60">{subtitle}</p> : null}
      </div>
      <nav className="flex gap-2">
        <Link className="btn btn-dark" href="/employee">Pracownik</Link>
        <Link className="btn btn-dark" href="/admin">Admin</Link>
      </nav>
    </header>
  )
}
