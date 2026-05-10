import Link from 'next/link'
import { Header } from '@/components/Header'

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4 md:p-8">
      <Header title="Panel utargów" subtitle="Lekka aplikacja PWA do pracy na tablecie w salonie." />
      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/employee" className="tile block hover:bg-white/10">
          <p className="text-sm text-imperio-gold">Panel pracownika</p>
          <h2 className="mt-3 text-2xl font-bold">Dodawanie transakcji</h2>
          <p className="mt-2 text-white/60">Usługi, gotówka, karta, Booksy Pay, voucher, napiwki i zamknięcie dnia.</p>
        </Link>
        <Link href="/admin" className="tile block hover:bg-white/10">
          <p className="text-sm text-imperio-gold">Panel administratora</p>
          <h2 className="mt-3 text-2xl font-bold">Kontrola dzienna</h2>
          <p className="mt-2 text-white/60">Suma pracowników, metody płatności, napiwki i status zamknięcia dnia.</p>
        </Link>
      </section>
    </main>
  )
}
