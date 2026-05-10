import { money } from '@/lib/calculations'

export function SummaryCards({ summary }: { summary: { cash: number; card: number; booksy_pay: number; voucher: number; tips: number; total: number } }) {
  const cards = [
    ['Gotówka', summary.cash],
    ['Karta', summary.card],
    ['Booksy Pay', summary.booksy_pay],
    ['Voucher', summary.voucher],
    ['Napiwki', summary.tips],
    ['Razem usługi', summary.total],
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={String(label)} className="tile">
          <p className="text-sm text-white/55">{label}</p>
          <p className="mt-1 text-2xl font-bold">{money(Number(value))}</p>
        </div>
      ))}
    </div>
  )
}
