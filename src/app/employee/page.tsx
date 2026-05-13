'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { SummaryCards } from '@/components/SummaryCards'
import { money, summarizeTransactions, todayIso } from '@/lib/calculations'
import { demoEmployees, demoServices } from '@/lib/demoData'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { Employee, PaymentMethod, Service, Transaction } from '@/lib/types'

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Gotówka' },
  { value: 'card', label: 'Karta' },
  { value: 'booksy_pay', label: 'Booksy Pay' },
  { value: 'voucher', label: 'Voucher' },
]

type Product = {
  id: string
  name: string
  stock_quantity: number
  sale_price: number
  is_active: boolean
}

type ProductMovement = {
  id: string
  product_id: string
  employee_id: string
  type: 'delivery' | 'sale' | 'correction'
  quantity: number
  unit_price: number
  note: string | null
  created_at: string
}

function tomorrowIso() {
  const date = new Date(todayIso())
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>(demoEmployees)
  const [loginEmployeeId, setLoginEmployeeId] = useState(demoEmployees[0].id)
  const [employeeId, setEmployeeId] = useState(demoEmployees[0].id)

  const [services, setServices] = useState<Service[]>(demoServices)
  const [products, setProducts] = useState<Product[]>([])
  const [productSales, setProductSales] = useState<ProductMovement[]>([])

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)

  const [serviceId, setServiceId] = useState(demoServices[0].id)
  const [amount, setAmount] = useState(String(demoServices[0].price))
  const [discountValue, setDiscountValue] = useState('0')
  const [discountType, setDiscountType] = useState<'pln' | 'percent'>('pln')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [tipAmount, setTipAmount] = useState('0')
  const [note, setNote] = useState('')

  const [productId, setProductId] = useState('')
  const [productQuantity, setProductQuantity] = useState('1')

  const [closureDone, setClosureDone] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [pin, setPin] = useState('')

  const selectedEmployee = employees.find((employee) => employee.id === employeeId)
  const selectedService = services.find((service) => service.id === serviceId)

  const summary = useMemo(() => summarizeTransactions(transactions), [transactions])

  const productSalesTotal = useMemo(
    () =>
      productSales.reduce(
        (sum, sale) => sum + Number(sale.quantity || 0) * Number(sale.unit_price || 0),
        0
      ),
    [productSales]
  )

  const productCommission = productSalesTotal * 0.2

  const inputClass =
    'w-full min-h-[54px] rounded-2xl border border-white/25 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-[#7bc892] focus:ring-2 focus:ring-[#7bc892]/30'

  const darkTileClass =
    'min-h-[58px] rounded-2xl border border-white/15 bg-zinc-900 px-4 py-3 font-bold text-white shadow-md transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'

  const greenTileClass =
    'min-h-[64px] rounded-2xl border border-[#7bc892]/70 bg-[#7bc892] px-4 py-4 text-lg font-bold text-black shadow-md transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'

  const redTileClass =
    'min-h-[64px] rounded-2xl border border-red-500/50 bg-red-600 px-4 py-4 text-lg font-bold text-white shadow-md transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'

  function loginWithPin() {
    setMessage('')

    const employee = employees.find((item) => item.id === loginEmployeeId)

    if (!employee) {
      setMessage('Nie wybrano pracownika.')
      return
    }

    if (String(employee.pin).trim() !== String(pin).trim()) {
      setMessage(`Nieprawidłowy PIN dla ${employee.name}.`)
      return
    }

    sessionStorage.setItem('imperioEmployeeId', loginEmployeeId)
    setEmployeeId(loginEmployeeId)
    setIsLoggedIn(true)
    setPin('')
    setMessage('')
  }

  function logout() {
    sessionStorage.removeItem('imperioEmployeeId')
    setIsLoggedIn(false)
    setPin('')
    setMessage('')
    setEditingTransactionId(null)
  }

  async function loadData() {
    setMessage('')

    if (!isSupabaseConfigured) return

    const [employeesResult, servicesResult, productsResult] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name, role, commission_percent, is_active, pin')
        .eq('is_active', true)
        .order('name'),
      supabase.from('services').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ])

    if (employeesResult.data?.length) {
      const loadedEmployees = employeesResult.data as Employee[]
      const savedEmployeeId =
        typeof window !== 'undefined' ? sessionStorage.getItem('imperioEmployeeId') : null

      const employeeExists = savedEmployeeId
        ? loadedEmployees.some((employee) => employee.id === savedEmployeeId)
        : false

      setEmployees(loadedEmployees)

      if (savedEmployeeId && employeeExists) {
        setLoginEmployeeId(savedEmployeeId)
        setEmployeeId(savedEmployeeId)
        setIsLoggedIn(true)
      } else {
        setLoginEmployeeId(loadedEmployees[0].id)
      }
    }

    if (servicesResult.data?.length) {
      setServices(servicesResult.data as Service[])
      setServiceId(servicesResult.data[0].id)
      setAmount(String(servicesResult.data[0].price))
    }

    if (productsResult.data?.length) {
      setProducts(productsResult.data as Product[])
      setProductId(productsResult.data[0].id)
    }
  }

  async function loadTransactions(currentEmployeeId = employeeId) {
    if (!isSupabaseConfigured) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('employee_id', currentEmployeeId)
      .eq('date', todayIso())
      .order('created_at', { ascending: false })

    if (error) {
      setMessage('Nie udało się pobrać transakcji.')
      return
    }

    setTransactions((data || []) as Transaction[])

    const sales = await supabase
      .from('product_movements')
      .select('*')
      .eq('employee_id', currentEmployeeId)
      .eq('type', 'sale')
      .gte('created_at', `${todayIso()}T00:00:00`)
      .lt('created_at', `${tomorrowIso()}T00:00:00`)
      .order('created_at', { ascending: false })

    setProductSales((sales.data || []) as ProductMovement[])

    const closure = await supabase
      .from('day_closures')
      .select('*')
      .eq('employee_id', currentEmployeeId)
      .eq('date', todayIso())
      .maybeSingle()

    setClosureDone(Boolean(closure.data))
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      loadTransactions(employeeId)
    }
  }, [employeeId, isLoggedIn])

  useEffect(() => {
    const service = services.find((item) => item.id === serviceId)
    if (service) setAmount(String(service.price))
  }, [serviceId, services])

  function startEditTransaction(transaction: Transaction) {
    if (closureDone) {
      setMessage('Dzień jest już zamknięty. Nie można edytować transakcji.')
      return
    }

    setEditingTransactionId(transaction.id)
    setServiceId(transaction.service_id || serviceId)
    setAmount(String(transaction.amount))
    setDiscountValue('0')
    setDiscountType('pln')
    setPaymentMethod(transaction.payment_method)
    setTipAmount(String(transaction.tip_amount || 0))
    setNote(transaction.note || '')
    setMessage('Edytujesz transakcję. Po poprawkach kliknij „Zapisz korektę”.')
  }

  async function deleteTransaction(id: string) {
    if (closureDone) {
      setMessage('Dzień jest już zamknięty. Nie można usuwać transakcji.')
      return
    }

    if (!confirm('Usunąć tę transakcję?')) return

    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) {
      setMessage('Nie udało się usunąć transakcji.')
      return
    }

    await loadTransactions(employeeId)
    setMessage('Transakcja usunięta.')
  }

  async function addTransaction() {
    setMessage('')

    if (closureDone) {
      setMessage('Dzień jest już zamknięty. Nie można dodawać ani edytować transakcji.')
      return
    }

    if (!selectedEmployee || !selectedService) return

    const parsedAmount = Number(String(amount).replace(',', '.'))
    const parsedDiscount = Number(String(discountValue || '0').replace(',', '.'))
    const parsedTip = Number(String(tipAmount || '0').replace(',', '.'))

    const finalAmount =
      discountType === 'percent'
        ? parsedAmount - parsedAmount * (parsedDiscount / 100)
        : parsedAmount - parsedDiscount

    if (!parsedAmount || parsedAmount <= 0) {
      setMessage('Wpisz poprawną kwotę usługi.')
      return
    }

    const payload = {
      employee_id: selectedEmployee.id,
      service_id: selectedService.id.startsWith('demo-') ? null : selectedService.id,
      date: todayIso(),
      service_name: selectedService.name,
      amount: Math.max(finalAmount, 0),
      payment_method: paymentMethod,
      tip_amount: parsedTip || 0,
      note: note || null,
    }

    const { error } = editingTransactionId
      ? await supabase.from('transactions').update(payload).eq('id', editingTransactionId)
      : await supabase.from('transactions').insert(payload)

    if (error) {
      setMessage('Nie udało się zapisać transakcji.')
      return
    }

    setTipAmount('0')
    setDiscountValue('0')
    setNote('')
    setEditingTransactionId(null)

    await loadTransactions(selectedEmployee.id)

    setMessage(editingTransactionId ? 'Korekta zapisana.' : 'Transakcja dodana.')
  }

  async function sellProduct() {
    setMessage('')

    if (closureDone) {
      setMessage('Dzień jest już zamknięty. Nie można sprzedawać produktów.')
      return
    }

    if (!selectedEmployee) return

    const product = products.find((item) => item.id === productId)
    const quantity = Number(String(productQuantity).replace(',', '.'))

    if (!product) {
      setMessage('Wybierz produkt.')
      return
    }

    if (!quantity || quantity <= 0) {
      setMessage('Wpisz poprawną ilość.')
      return
    }

    if (Number(product.stock_quantity) < quantity) {
      setMessage('Brak wystarczającej ilości produktu na stanie.')
      return
    }

    const newStock = Number(product.stock_quantity) - quantity
    const totalPrice = Number(product.sale_price) * quantity

    const stockUpdate = await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', product.id)

    if (stockUpdate.error) {
      setMessage('Nie udało się zmienić stanu magazynu.')
      return
    }

    const movement = await supabase.from('product_movements').insert({
      product_id: product.id,
      employee_id: selectedEmployee.id,
      type: 'sale',
      quantity,
      unit_price: product.sale_price,
      note: `Sprzedaż produktu: ${product.name}`,
    })

    if (movement.error) {
      setMessage('Produkt zdjęty ze stanu, ale nie zapisano sprzedaży. Sprawdź magazyn.')
      return
    }

    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, stock_quantity: newStock } : item
      )
    )

    setProductQuantity('1')
    await loadTransactions(selectedEmployee.id)

    setMessage(
      `Sprzedano: ${product.name} za ${money(totalPrice)}. Prowizja pracownika: ${money(
        totalPrice * 0.2
      )}.`
    )
  }

  async function closeDay() {
    if (!selectedEmployee) return

    if (
      !confirm(
        'Czy na pewno zamknąć dzień? Po zamknięciu nie będzie można dodawać ani edytować transakcji.'
      )
    ) {
      return
    }

    const payload = {
      employee_id: selectedEmployee.id,
      date: todayIso(),
      total_cash: summary.cash,
      total_card: summary.card,
      total_booksy_pay: summary.booksy_pay,
      total_voucher: summary.voucher,
      total_tips: summary.tips,
      note: null,
    }

    const { error } = await supabase
      .from('day_closures')
      .upsert(payload, { onConflict: 'employee_id,date' })

    if (error) {
      setMessage('Nie udało się zamknąć dnia.')
      return
    }

    setClosureDone(true)
    setEditingTransactionId(null)
    setMessage('Dzień zamknięty.')
  }

  return (
    return (
  <main className="relative min-h-screen overflow-hidden bg-black text-white">

    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">
      <img
        src="/logo-bg.png"
        alt="Imperio Barber"
        className="w-[70vw] max-w-[700px] object-contain"
      />
      </div>
      <div className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
        {!isLoggedIn ? (
          <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col justify-center px-3 py-6 sm:px-4">
            <Header title="Logowanie pracownika" subtitle="Wybierz swoje konto i wpisz PIN." />

            <section className="mx-auto mt-6 w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
              <label className="mb-2 block text-sm font-bold text-white/70">Pracownik</label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setLoginEmployeeId(employee.id)}
                    className={`min-h-[64px] rounded-2xl border px-4 py-3 text-center text-base font-bold shadow-md transition active:scale-[0.98] sm:text-lg ${
                      loginEmployeeId === employee.id
                        ? 'border-[#7bc892] bg-[#7bc892] text-black'
                        : 'border-white/15 bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {employee.name}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-bold text-white/70">PIN</label>
                <input
                  className={inputClass}
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder="Wpisz PIN"
                />
              </div>

              <button
                className={`${greenTileClass} mt-6 w-full`}
                type="button"
                onClick={loginWithPin}
              >
                Zaloguj
              </button>

              {message ? (
                <p className="mt-4 text-center text-sm text-[#7bc892]">{message}</p>
              ) : null}
            </section>
          </div>
        ) : (
          <>
            <Header title="Panel pracownika" subtitle="Szybkie wpisywanie utargu na tablecie." />

            <div className="mb-4 flex justify-end">
              <button className={darkTileClass} type="button" onClick={logout}>
                Wyloguj
              </button>
            </div>

            {closureDone ? (
              <div className="mb-4 rounded-3xl border border-red-500/40 bg-red-500/10 p-4 text-red-100">
                <p className="font-bold">Dzień jest zamknięty.</p>
                <p className="text-sm opacity-80">
                  Nie można już dodawać, edytować ani usuwać transakcji.
                </p>
              </div>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">Pracownik</label>
                  <div className="flex min-h-[54px] items-center rounded-2xl border border-white/20 bg-zinc-950 px-4 py-3 text-white">
                    {selectedEmployee?.name}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-white/70">Usługa</label>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => {
                          setServiceId(service.id)
                          setAmount(String(service.price))
                        }}
                        className={`min-h-[86px] rounded-2xl border p-3 text-left shadow-md transition active:scale-[0.98] ${
                          serviceId === service.id
                            ? 'border-[#7bc892] bg-[#7bc892] text-black'
                            : 'border-white/15 bg-zinc-900 text-white hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-bold">{service.name}</div>
                        <div className="mt-1 text-sm opacity-80">{money(service.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">Cena usługi</label>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">
                    Rabat / korekta
                  </label>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">Typ rabatu</label>
                  <select
                    className={inputClass}
                    value={discountType}
                    onChange={(event) => setDiscountType(event.target.value as 'pln' | 'percent')}
                  >
                    <option value="pln">zł</option>
                    <option value="percent">%</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-white/70">Napiwek</label>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={tipAmount}
                    onChange={(event) => setTipAmount(event.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-white/70">Płatność</label>

                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`min-h-[64px] rounded-2xl border px-3 py-2 text-center text-sm font-bold shadow-md transition active:scale-[0.98] ${
                          paymentMethod === method.value
                            ? 'border-[#7bc892] bg-[#7bc892] text-black'
                            : 'border-white/15 bg-zinc-900 text-white hover:bg-zinc-800'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-white/70">Notatka</label>
                  <input
                    className={inputClass}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Opcjonalnie"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    className={`${greenTileClass} mt-2 w-full`}
                    onClick={addTransaction}
                    type="button"
                    disabled={closureDone}
                  >
                    {closureDone
                      ? 'Dzień zamknięty'
                      : editingTransactionId
                        ? 'Zapisz korektę'
                        : 'Dodaj transakcję'}
                  </button>

                  {message ? <p className="mt-3 text-sm text-[#7bc892]">{message}</p> : null}
                </div>

                <div className="md:col-span-2 rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
                  <div className="mb-3">
                    <p className="text-sm text-[#7bc892]">Produkty</p>
                    <h2 className="text-xl font-bold">Sprzedaż kosmetyku</h2>
                  </div>

                  <label className="mb-2 block text-sm font-bold text-white/70">Kosmetyk</label>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setProductId(product.id)}
                        className={`min-h-[92px] rounded-2xl border p-3 text-left shadow-md transition active:scale-[0.98] ${
                          productId === product.id
                            ? 'border-[#7bc892] bg-[#7bc892] text-black'
                            : 'border-white/15 bg-zinc-900 text-white hover:bg-zinc-800'
                        }`}
                      >
                        <p className="font-bold">{product.name}</p>
                        <p className="mt-1 text-sm opacity-70">{money(product.sale_price)}</p>
                        <p className="text-sm opacity-70">Stan: {product.stock_quantity} szt.</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px] md:items-end">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-white/70">Ilość</label>
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={productQuantity}
                        onChange={(event) => setProductQuantity(event.target.value)}
                      />
                    </div>

                    <button
                      className={greenTileClass}
                      type="button"
                      onClick={sellProduct}
                      disabled={closureDone}
                    >
                      Sprzedaj
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <SummaryCards summary={summary} />

                <div className="rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
                  <p className="text-sm text-white/55">Produkty sprzedane dzisiaj</p>
                  <p className="mt-1 text-2xl font-bold">{money(productSalesTotal)}</p>
                  <p className="text-sm text-[#7bc892]">
                    Prowizja 20%: {money(productCommission)}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-white/55">Zamknięcie dnia</p>
                      <p className="text-xl font-bold">
                        {closureDone ? 'Zamknięte' : 'Otwarte'}
                      </p>
                    </div>

                    <button
                      className={closureDone ? darkTileClass : redTileClass}
                      onClick={closeDay}
                      type="button"
                      disabled={closureDone}
                    >
                      {closureDone ? 'Zamknięte' : 'Zamknij dzień'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
              <h2 className="text-xl font-bold">Dzisiejsze transakcje</h2>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="py-2">Godzina</th>
                      <th>Usługa</th>
                      <th>Kwota</th>
                      <th>Płatność</th>
                      <th>Napiwek</th>
                      <th>Notatka</th>
                      <th>Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-white/10">
                        <td className="py-2">
                          {new Date(transaction.created_at).toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>{transaction.service_name}</td>
                        <td>{money(transaction.amount)}</td>
                        <td>
                          {
                            paymentMethods.find((m) => m.value === transaction.payment_method)
                              ?.label
                          }
                        </td>
                        <td>{money(transaction.tip_amount)}</td>
                        <td>{transaction.note || ''}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={darkTileClass}
                              onClick={() => startEditTransaction(transaction)}
                              disabled={closureDone}
                            >
                              Edytuj
                            </button>

                            <button
                              type="button"
                              className="min-h-[48px] rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 shadow-md transition hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50"
                              onClick={() => deleteTransaction(transaction.id)}
                              disabled={closureDone}
                            >
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!transactions.length ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-white/50">
                          Brak transakcji na dziś.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
              <h2 className="text-xl font-bold">Sprzedaż produktów dzisiaj</h2>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="py-2">Godzina</th>
                      <th>Produkt</th>
                      <th>Ilość</th>
                      <th>Cena szt.</th>
                      <th>Razem</th>
                      <th>Prowizja 20%</th>
                    </tr>
                  </thead>

                  <tbody>
                    {productSales.map((sale) => {
                      const product = products.find((item) => item.id === sale.product_id)
                      const total = Number(sale.quantity) * Number(sale.unit_price)

                      return (
                        <tr key={sale.id} className="border-t border-white/10">
                          <td className="py-2">
                            {new Date(sale.created_at).toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td>{product?.name || sale.note || 'Produkt'}</td>
                          <td>{sale.quantity}</td>
                          <td>{money(sale.unit_price)}</td>
                          <td>{money(total)}</td>
                          <td>{money(total * 0.2)}</td>
                        </tr>
                      )
                    })}

                    {!productSales.length ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-white/50">
                          Brak sprzedaży produktów na dziś.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}