import { PaymentMethod, Transaction } from './types'

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function money(value: number) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(value || 0)
}

export function roundMoney(value: number) {
  return Math.round((value || 0) * 100) / 100
}

export function calculateNetFromGross(gross: number) {
  return roundMoney(gross / 1.08)
}

export function calculateCommissionFromNet(gross: number, percent: number) {
  return roundMoney(calculateNetFromGross(gross) * (percent / 100))
}

export function summarizeTransactions(transactions: Transaction[]) {
  const base = {
    cash: 0,
    card: 0,
    booksy_pay: 0,
    voucher: 0,
    tips: 0,
    total: 0,
  }

  for (const transaction of transactions) {
    base[transaction.payment_method as PaymentMethod] += Number(transaction.amount || 0)
    base.tips += Number(transaction.tip_amount || 0)
    base.total += Number(transaction.amount || 0)
  }

  return {
    cash: roundMoney(base.cash),
    card: roundMoney(base.card),
    booksy_pay: roundMoney(base.booksy_pay),
    voucher: roundMoney(base.voucher),
    tips: roundMoney(base.tips),
    total: roundMoney(base.total),
  }
}
