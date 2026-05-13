'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { SummaryCards } from '@/components/SummaryCards'
import { money, summarizeTransactions, todayIso } from '@/lib/calculations'
import { demoEmployees, demoServices } from '@/lib/demoData'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { DayClosure, Employee, PaymentMethod, Service, Transaction } from '@/lib/types'

const ADMIN_PIN = '9999'

type EmployeeRow = {
  employee: Employee
  transactions: Transaction[]
  closure?: DayClosure
}

type Product = {
  id: string
  name: string
  stock_quantity: number
  sale_price: number
  is_active: boolean
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Gotówka',
  card: 'Karta',
  booksy_pay: 'Booksy Pay',
  voucher: 'Voucher',
}

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Gotówka' },
  { value: 'card', label: 'Karta' },
  { value: 'booksy_pay', label: 'Booksy Pay' },
  { value: 'voucher', label: 'Voucher' },
]

function calculatePayout(employee: Employee, bruttoTotal: number) {
  const percent = Number(employee.commission_percent || 0)

  if (employee.name === 'Ola') {
    const netto = bruttoTotal / 1.08
    const vat = bruttoTotal - netto
    const base = netto + vat / 2
    return base * (percent / 100)
  }

  return bruttoTotal * (percent / 100)
}

export default function AdminPage() {
  const [date, setDate] = useState(todayIso())
  const [services, setServices] = useState<Service[]>(demoServices)
  const [rows, setRows] = useState<EmployeeRow[]>(
    demoEmployees.map((employee) => ({ employee, transactions: [] }))
  )

  const [message, setMessage] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [newProductQuantity, setNewProductQuantity] = useState('')

  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editServiceId, setEditServiceId] = useState('')
  const [editServiceName, setEditServiceName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash')
  const [editTipAmount, setEditTipAmount] = useState('0')
  const [editNote, setEditNote] = useState('')

  async function loadAdminData() {
    setMessage('')

    if (!isSupabaseConfigured) {
      setMessage('Tryb demo: podłącz Supabase, żeby widzieć prawdziwe dane z salonu.')
      return
    }

    const [employeesResult, transactionsResult, closuresResult, servicesResult, productsResult] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
      supabase.from('transactions').select('*').eq('date', date).order('created_at', { ascending: false }),
      supabase.from('day_closures').select('*').eq('date', date),
      supabase.from('services').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ])

    if (employeesResult.error || !employeesResult.data) {
      setMessage('Nie udało się pobrać pracowników.')
      return
    }

    if (transactionsResult.error) {
      setMessage('Nie udało się pobrać transakcji.')
      return
    }

    setServices((servicesResult.data || []) as Service[])
    setProducts((productsResult.data || []) as Product[])

    const typedTransactions = (transactionsResult.data || []) as Transaction[]
    const typedClosures = (closuresResult.data || []) as DayClosure[]

    const nextRows: EmployeeRow[] = (employeesResult.data as Employee[]).map((employee) => ({
      employee,
      transactions: typedTransactions.filter((transaction) => transaction.employee_id === employee.id),
      closure: typedClosures.find((closure) => closure.employee_id === employee.id),
    }))

    setRows(nextRows)
  }

  useEffect(() => {
    if (isLoggedIn) loadAdminData()
  }, [date, isLoggedIn])

  const allTransactions = rows.flatMap((row) => row.transactions)
  const totalSummary = useMemo(() => summarizeTransactions(allTransactions), [allTransactions])

  function loginAdmin() {
    setMessage('')

    if (adminPin !== ADMIN_PIN) {
      setMessage('Nieprawidłowy PIN administratora.')
      return
    }

    setIsLoggedIn(true)
    setAdminPin('')
    setMessage('')
  }

  function logoutAdmin() {
    setIsLoggedIn(false)
    setAdminPin('')
    setMessage('')
  }

  function startEditTransaction(transaction: Transaction) {
    const service = services.find((item) => item.id === transaction.service_id)

    setEditingTransaction(transaction)
    setEditServiceId(service?.id || '')
    setEditServiceName(transaction.service_name)
    setEditAmount(String(transaction.amount))
    setEditPaymentMethod(transaction.payment_method)
    setEditTipAmount(String(transaction.tip_amount || 0))
    setEditNote(transaction.note || '')
    setMessage('Edytujesz transakcję jako administrator.')
  }

  function handleEditServiceChange(serviceId: string) {
    setEditServiceId(serviceId)

    const service = services.find((item) => item.id === serviceId)
    if (!service) return

    setEditServiceName(service.name)
    setEditAmount(String(service.price))
  }

  function cancelEdit() {
    setEditingTransaction(null)
    setEditServiceId('')
    setEditServiceName('')
    setEditAmount('')
    setEditTipAmount('0')
    setEditNote('')
    setMessage('')
  }

  async function saveTransactionEdit() {
    if (!editingTransaction) return

    const parsedAmount = Number(String(editAmount).replace(',', '.'))
    const parsedTip = Number(String(editTipAmount || '0').replace(',', '.'))

    if (!parsedAmount || parsedAmount <= 0) {
      setMessage('Wpisz poprawną kwotę.')
      return
    }

    const { error } = await supabase
      .from('transactions')
      .update({
        service_id: editServiceId || null,
        service_name: editServiceName || editingTransaction.service_name,
        amount: parsedAmount,
        payment_method: editPaymentMethod,
        tip_amount: parsedTip || 0,
        note: editNote || null,
      })
      .eq('id', editingTransaction.id)

    if (error) {
      setMessage('Nie udało się zapisać korekty.')
      return
    }

    setEditingTransaction(null)
    await loadAdminData()
    setMessage('Korekta zapisana przez administratora.')
  }

  async function deleteTransaction(id: string) {
    if (!confirm('Usunąć tę transakcję?')) return

    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) {
      setMessage('Nie udało się usunąć transakcji.')
      return
    }

    await loadAdminData()
    setMessage('Transakcja usunięta przez administratora.')
  }

  async function closeEmployeeDay(row: EmployeeRow) {
    if (!confirm(`Zamknąć dzień pracownikowi ${row.employee.name}?`)) return

    const summary = summarizeTransactions(row.transactions)

    const payload = {
      employee_id: row.employee.id,
      date,
      total_cash: summary.cash,
      total_card: summary.card,
      total_booksy_pay: summary.booksy_pay,
      total_voucher: summary.voucher,
      total_tips: summary.tips,
      note: 'Zamknięte przez administratora',
    }

    const { error } = await supabase
      .from('day_closures')
      .upsert(payload, { onConflict: 'employee_id,date' })

    if (error) {
      setMessage('Nie udało się zamknąć dnia.')
      return
    }

    await loadAdminData()
    setMessage(`Dzień pracownika ${row.employee.name} został zamknięty.`)
  }

  async function unlockDay(employeeId: string) {
    if (!confirm('Odblokować dzień temu pracownikowi?')) return

    const { error } = await supabase
      .from('day_closures')
      .delete()
      .eq('employee_id', employeeId)
      .eq('date', date)

    if (error) {
      setMessage('Nie udało się odblokować dnia.')
      return
    }

    await loadAdminData()
    setMessage('Dzień pracownika został odblokowany.')
  }

  async function updateCommission(employeeId: string, percent: string) {
    const parsedPercent = Number(String(percent).replace(',', '.'))

    if (Number.isNaN(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      setMessage('Wpisz poprawny procent od 0 do 100.')
      return
    }

    setSavingEmployeeId(employeeId)

    const { error } = await supabase
      .from('employees')
      .update({ commission_percent: parsedPercent })
      .eq('id', employeeId)

    if (error) {
      setSavingEmployeeId(null)
      setMessage('Nie udało się zapisać prowizji.')
      return
    }

    setRows((prev) =>
      prev.map((row) =>
        row.employee.id === employeeId
          ? { ...row, employee: { ...row.employee, commission_percent: parsedPercent } }
          : row
      )
    )

    setSavingEmployeeId(null)
    setMessage('Prowizja zapisana.')
  }

  async function addProduct() {
    const price = Number(String(newProductPrice).replace(',', '.'))
    const quantity = Number(String(newProductQuantity).replace(',', '.'))

    if (!newProductName.trim()) {
      setMessage('Wpisz nazwę produktu.')
      return
    }

    if (Number.isNaN(price) || Number.isNaN(quantity)) {
      setMessage('Wpisz poprawną cenę i ilość.')
      return
    }

    const { error } = await supabase.from('products').insert({
      name: newProductName.trim(),
      sale_price: price,
      stock_quantity: quantity,
      is_active: true,
    })

    if (error) {
      setMessage('Nie udało się dodać produktu.')
      return
    }

    setNewProductName('')
    setNewProductPrice('')
    setNewProductQuantity('')

    await loadAdminData()
    setMessage('Produkt dodany.')
  }

  async function addProductQuantity(product: Product, value: string) {
    const quantity = Number(String(value).replace(',', '.'))

    if (Number.isNaN(quantity)) {
      setMessage('Wpisz poprawną ilość.')
      return
    }

    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: Number(product.stock_quantity) + quantity })
      .eq('id', product.id)

    if (error) {
      setMessage('Nie udało się dodać ilości.')
      return
    }

    await loadAdminData()
    setMessage('Ilość dodana do magazynu.')
  }

  async function correctProductStock(product: Product, value: string) {
    const quantity = Number(String(value).replace(',', '.'))

    if (Number.isNaN(quantity) || quantity < 0) {
      setMessage('Wpisz poprawny stan.')
      return
    }

    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: quantity })
      .eq('id', product.id)

    if (error) {
      setMessage('Nie udało się zapisać korekty stanu.')
      return
    }

    await loadAdminData()
    setMessage('Stan magazynowy poprawiony.')
  }

  async function updateProductPrice(product: Product, value: string) {
    const price = Number(String(value).replace(',', '.'))

    if (Number.isNaN(price) || price < 0) {
      setMessage('Wpisz poprawną cenę produktu.')
      return
    }

    const { error } = await supabase
      .from('products')
      .update({ sale_price: price })
      .eq('id', product.id)

    if (error) {
      setMessage('Nie udało się zmienić ceny produktu.')
      return
    }

    await loadAdminData()
    setMessage('Cena produktu została zmieniona.')
  }

  async function updateProductName(product: Product, value: string) {
    const name = value.trim()

    if (!name) {
      setMessage('Wpisz nazwę produktu.')
      return
    }

    const { error } = await supabase
      .from('products')
      .update({ name })
      .eq('id', product.id)

    if (error) {
      setMessage('Nie udało się zmienić nazwy produktu.')
      return
    }

    await loadAdminData()
    setMessage('Nazwa produktu została zmieniona.')
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Usunąć produkt "${product.name}" z listy magazynu?`)) return

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', product.id)

    if (error) {
      setMessage('Nie udało się usunąć produktu.')
      return
    }

    await loadAdminData()
    setMessage('Produkt usunięty z listy.')
  }

  async function addService() {
    const price = Number(String(newServicePrice).replace(',', '.'))

    if (!newServiceName.trim()) {
      setMessage('Wpisz nazwę usługi.')
      return
    }

    if (Number.isNaN(price) || price < 0) {
      setMessage('Wpisz poprawną cenę usługi.')
      return
    }

    const { error } = await supabase.from('services').insert({
      name: newServiceName.trim(),
      price,
      is_active: true,
    })

    if (error) {
      setMessage('Nie udało się dodać usługi.')
      return
    }

    setNewServiceName('')
    setNewServicePrice('')

    await loadAdminData()
    setMessage('Usługa dodana.')
  }

  async function updateServicePrice(service: Service, value: string) {
    const price = Number(String(value).replace(',', '.'))

    if (Number.isNaN(price) || price < 0) {
      setMessage('Wpisz poprawną cenę usługi.')
      return
    }

    const { error } = await supabase
      .from('services')
      .update({ price })
      .eq('id', service.id)

    if (error) {
      setMessage('Nie udało się zmienić ceny usługi.')
      return
    }

    await loadAdminData()
    setMessage('Cena usługi została zmieniona.')
  }

  async function updateServiceName(service: Service, value: string) {
    const name = value.trim()

    if (!name) {
      setMessage('Wpisz nazwę usługi.')
      return
    }

    const { error } = await supabase
      .from('services')
      .update({ name })
      .eq('id', service.id)

    if (error) {
      setMessage('Nie udało się zmienić nazwy usługi.')
      return
    }

    await loadAdminData()
    setMessage('Nazwa usługi została zmieniona.')
  }

  async function deleteService(service: Service) {
    if (!confirm(`Usunąć usługę "${service.name}" z cennika?`)) return

    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', service.id)

    if (error) {
      setMessage('Nie udało się usunąć usługi.')
      return
    }

    await loadAdminData()
    setMessage('Usługa usunięta z cennika.')
  }

  function exportCsv() {
    const header = ['data', 'pracownik', 'godzina', 'usluga', 'kwota', 'platnosc', 'napiwek', 'notatka']

    const body = rows.flatMap((row) =>
      row.transactions.map((transaction) => [
        transaction.date,
        row.employee.name,
        new Date(transaction.created_at).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        transaction.service_name,
        transaction.amount,
        paymentLabels[transaction.payment_method],
        transaction.tip_amount,
        transaction.note || '',
      ])
    )

    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `imperio-utarg-${date}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  if (!isLoggedIn) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl p-4 md:p-8">
        <Header title="Logowanie administratora" subtitle="Wpisz PIN, aby wejść do panelu." />

        <section className="tile mx-auto max-w-md">
          <div>
            <label className="label">PIN administratora</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={adminPin}
              onChange={(event) => setAdminPin(event.target.value)}
              placeholder="Wpisz PIN"
            />
          </div>

          <button className="btn btn-primary mt-5 w-full text-lg" type="button" onClick={loginAdmin}>
            Zaloguj
          </button>

          {message ? <p className="mt-3 text-sm text-imperio-gold">{message}</p> : null}
        </section>
      </main>
    )
  }

  return (
<main className="mx-auto min-h-screen w-full max-w-[1600px] overflow-x-hidden p-2 sm:p-4 md:p-6">      <Header title="Panel administratora" subtitle="Kontrola utargów, prowizji, wypłat i korekt." />

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[240px_1fr_180px_140px] lg:items-end">
        <div>
          <label className="label">Data</label>
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <div className="text-sm text-white/55">{message}</div>

        <button className="btn btn-primary" type="button" onClick={exportCsv}>
          Eksport CSV
        </button>

        <button className="btn btn-dark" type="button" onClick={logoutAdmin}>
          Wyloguj
        </button>
      </section>

      {editingTransaction ? (
        <section className="tile mb-4 border border-imperio-gold/40">
          <div className="mb-4">
            <p className="text-sm text-imperio-gold">Korekta administratora</p>
            <h2 className="text-2xl font-bold">{editServiceName || editingTransaction.service_name}</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="label">Usługa</label>
              <select
                className="input"
                value={editServiceId}
                onChange={(event) => handleEditServiceChange(event.target.value)}
              >
                <option value="">Inna / bez zmiany</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {money(service.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Kwota</label>
              <input className="input" inputMode="decimal" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} />
            </div>

            <div>
              <label className="label">Płatność</label>
              <select className="input" value={editPaymentMethod} onChange={(event) => setEditPaymentMethod(event.target.value as PaymentMethod)}>
                {paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Napiwek</label>
              <input className="input" inputMode="decimal" value={editTipAmount} onChange={(event) => setEditTipAmount(event.target.value)} />
            </div>

            <div>
              <label className="label">Notatka</label>
              <input className="input" value={editNote} onChange={(event) => setEditNote(event.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" type="button" onClick={saveTransactionEdit}>
              Zapisz korektę
            </button>

            <button className="btn btn-dark" type="button" onClick={cancelEdit}>
              Anuluj
            </button>
          </div>
        </section>
      ) : null}

      <section className="tile">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-imperio-gold">Cały salon</p>
            <h2 className="text-2xl font-bold">Podsumowanie dnia</h2>
          </div>

          <p className="text-sm text-white/50">Liczba transakcji: {allTransactions.length}</p>
        </div>

        <SummaryCards summary={totalSummary} />
      </section>

      <section className="mt-4 grid gap-4">
        {rows.map((row) => {
          const summary = summarizeTransactions(row.transactions)
          const payout = calculatePayout(row.employee, summary.total)
          const commissionPercent = Number(row.employee.commission_percent || 0)

          return (
            <div className="tile" key={row.employee.id}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-imperio-gold">Pracownik</p>
                  <h2 className="text-3xl font-bold">{row.employee.name}</h2>
                  <p className="mt-1 text-sm text-white/50">Transakcje: {row.transactions.length}</p>
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  <div className={`rounded-xl px-4 py-2 text-sm font-semibold ${row.closure ? 'bg-green-500/15 text-green-200' : 'bg-red-500/15 text-red-200'}`}>
                    {row.closure ? 'Dzień zamknięty' : 'Nie zamknięto dnia'}
                  </div>

                  {row.closure ? (
                    <button className="btn btn-dark" type="button" onClick={() => unlockDay(row.employee.id)}>
                      Odblokuj dzień
                    </button>
                  ) : (
                    <button className="btn btn-primary" type="button" onClick={() => closeEmployeeDay(row)}>
                      Zamknij dzień
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_160px_120px] lg:items-end">
                <div className="text-sm text-white/50">
                  {row.employee.name === 'Ola' ? 'Model wypłaty: procent od netto + połowa VAT.' : 'Model wypłaty: procent od brutto.'}
                </div>

                <div>
                  <label className="label">Prowizja %</label>
                  <input className="input" inputMode="decimal" defaultValue={commissionPercent} onBlur={(event) => updateCommission(row.employee.id, event.target.value)} />
                </div>

                <button className="btn btn-dark" type="button" disabled={savingEmployeeId === row.employee.id} onClick={() => loadAdminData()}>
                  Odśwież
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
                <SmallStat label="Razem" value={summary.total} />
                <SmallStat label="Gotówka" value={summary.cash} />
                <SmallStat label="Karta" value={summary.card} />
                <SmallStat label="Booksy Pay" value={summary.booksy_pay} />
                <SmallStat label="Voucher" value={summary.voucher} />
                <SmallStat label="Napiwki" value={summary.tips} />
                <SmallStat label="Wypłata" value={payout} />
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-[700px] w-full text-left text-xs sm:text-sm">
                  <thead className="bg-black/30 text-white/50">
                    <tr>
                      <th className="px-3 py-3">Godzina</th>
                      <th className="px-3 py-3">Usługa</th>
                      <th className="px-3 py-3">Kwota</th>
                      <th className="px-3 py-3">Płatność</th>
                      <th className="px-3 py-3">Napiwek</th>
                      <th className="px-3 py-3">Notatka</th>
                      <th className="px-3 py-3">Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {row.transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-white/10">
                        <td className="px-3 py-3">
                          {new Date(transaction.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-3">{transaction.service_name}</td>
                        <td className="px-3 py-3 font-bold">{money(transaction.amount)}</td>
                        <td className="px-3 py-3">{paymentLabels[transaction.payment_method]}</td>
                        <td className="px-3 py-3">{money(transaction.tip_amount)}</td>
                        <td className="px-3 py-3">{transaction.note || ''}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button className="btn btn-dark" type="button" onClick={() => startEditTransaction(transaction)}>
                              Edytuj
                            </button>

                            <button className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200" type="button" onClick={() => deleteTransaction(transaction.id)}>
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!row.transactions.length ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-white/45">
                          Brak transakcji dla tego pracownika.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </section>

      <section className="tile mt-4">
        <div className="mb-4">
          <p className="text-sm text-imperio-gold">Usługi</p>
          <h2 className="text-2xl font-bold">Cennik usług</h2>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px_160px] md:items-end">
          <div>
            <label className="label">Nazwa usługi</label>
            <input
              className="input"
              value={newServiceName}
              onChange={(event) => setNewServiceName(event.target.value)}
              placeholder="Np. Combo trymer"
            />
          </div>

          <div>
            <label className="label">Cena</label>
            <input
              className="input"
              inputMode="decimal"
              value={newServicePrice}
              onChange={(event) => setNewServicePrice(event.target.value)}
              placeholder="140"
            />
          </div>

          <button className="btn btn-primary" type="button" onClick={addService}>
            Dodaj usługę
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-black/30 text-white/50">
              <tr>
                <th className="px-3 py-3">Usługa</th>
                <th className="px-3 py-3">Cena</th>
                <th className="px-3 py-3">Usuń</th>
              </tr>
            </thead>

            <tbody>
              {services.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onNameChange={updateServiceName}
                  onPriceChange={updateServicePrice}
                  onDelete={deleteService}
                />
              ))}

              {!services.length ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-white/45">
                    Brak usług w cenniku.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tile mt-4">
        <div className="mb-4">
          <p className="text-sm text-imperio-gold">Magazyn</p>
          <h2 className="text-2xl font-bold">Produkty</h2>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px_160px_160px] md:items-end">
          <div>
            <label className="label">Nazwa produktu</label>
            <input
              className="input"
              value={newProductName}
              onChange={(event) => setNewProductName(event.target.value)}
              placeholder="Np. Pomada"
            />
          </div>

          <div>
            <label className="label">Cena</label>
            <input
              className="input"
              inputMode="decimal"
              value={newProductPrice}
              onChange={(event) => setNewProductPrice(event.target.value)}
              placeholder="69"
            />
          </div>

          <div>
            <label className="label">Ilość</label>
            <input
              className="input"
              inputMode="decimal"
              value={newProductQuantity}
              onChange={(event) => setNewProductQuantity(event.target.value)}
              placeholder="10"
            />
          </div>

          <button className="btn btn-primary" type="button" onClick={addProduct}>
            Dodaj produkt
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-black/30 text-white/50">
              <tr>
                <th className="px-3 py-3">Produkt</th>
                <th className="px-3 py-3">Cena</th>
                <th className="px-3 py-3">Stan</th>
                <th className="px-3 py-3">Dodaj ilość</th>
                <th className="px-3 py-3">Korekta stanu</th>
                <th className="px-3 py-3">Usuń</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onAdd={addProductQuantity}
                  onCorrect={correctProductStock}
                  onPriceChange={updateProductPrice}
                  onDelete={deleteProduct}
                  onNameChange={updateProductName}
                />
              ))}

              {!products.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-white/45">
                    Brak produktów w magazynie.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black/30 p-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 font-bold">{money(value)}</p>
    </div>
  )
}

function ServiceRow({
  service,
  onNameChange,
  onPriceChange,
  onDelete,
}: {
  service: Service
  onNameChange: (service: Service, value: string) => void
  onPriceChange: (service: Service, value: string) => void
  onDelete: (service: Service) => void
}) {
  const [nameValue, setNameValue] = useState(service.name)
  const [priceValue, setPriceValue] = useState(String(service.price))

  return (
    <tr className="border-t border-white/10">
      <td className="px-3 py-3">
        <div className="flex gap-2">
          <input
            className="input max-w-[260px]"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
          />

          <button className="btn btn-dark" type="button" onClick={() => onNameChange(service, nameValue)}>
            Zapisz
          </button>
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="flex gap-2">
          <input
            className="input max-w-[120px]"
            inputMode="decimal"
            value={priceValue}
            onChange={(event) => setPriceValue(event.target.value)}
          />

          <button className="btn btn-dark" type="button" onClick={() => onPriceChange(service, priceValue)}>
            Zapisz
          </button>
        </div>
      </td>

      <td className="px-3 py-3">
        <button
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200"
          type="button"
          onClick={() => onDelete(service)}
        >
          Usuń
        </button>
      </td>
    </tr>
  )
}

function ProductRow({
  product,
  onAdd,
  onCorrect,
  onPriceChange,
  onDelete,
  onNameChange,
}: {
  product: Product
  onAdd: (product: Product, value: string) => void
  onCorrect: (product: Product, value: string) => void
  onPriceChange: (product: Product, value: string) => void
  onDelete: (product: Product) => void
  onNameChange: (product: Product, value: string) => void
}) {
  const [addValue, setAddValue] = useState('')
  const [correctValue, setCorrectValue] = useState(String(product.stock_quantity))
  const [priceValue, setPriceValue] = useState(String(product.sale_price))
  const [nameValue, setNameValue] = useState(product.name)

  return (
    <tr className="border-t border-white/10">
      <td className="px-3 py-3">
        <div className="flex gap-2">
          <input
            className="input max-w-[220px]"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
          />

          <button className="btn btn-dark" type="button" onClick={() => onNameChange(product, nameValue)}>
            Zapisz
          </button>
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="flex gap-2">
          <input
            className="input max-w-[120px]"
            inputMode="decimal"
            value={priceValue}
            onChange={(event) => setPriceValue(event.target.value)}
          />

          <button className="btn btn-dark" type="button" onClick={() => onPriceChange(product, priceValue)}>
            Zapisz
          </button>
        </div>
      </td>

      <td className="px-3 py-3 font-bold">
        {product.stock_quantity} szt.
      </td>

      <td className="px-3 py-3">
        <div className="flex gap-2">
          <input
            className="input max-w-[120px]"
            inputMode="decimal"
            value={addValue}
            onChange={(event) => setAddValue(event.target.value)}
            placeholder="+ ilość"
          />

          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              onAdd(product, addValue)
              setAddValue('')
            }}
          >
            Dodaj
          </button>
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="flex gap-2">
          <input
            className="input max-w-[120px]"
            inputMode="decimal"
            value={correctValue}
            onChange={(event) => setCorrectValue(event.target.value)}
          />

          <button className="btn btn-dark" type="button" onClick={() => onCorrect(product, correctValue)}>
            Zapisz
          </button>
        </div>
      </td>

      <td className="px-3 py-3">
        <button
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200"
          type="button"
          onClick={() => onDelete(product)}
        >
          Usuń
        </button>
      </td>
    </tr>
  )
}