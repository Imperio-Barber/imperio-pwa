export type PaymentMethod = 'cash' | 'card' | 'booksy_pay' | 'voucher'

export type Employee = {
  id: string
  name: string
  role: string
  commission_percent: number
  is_active: boolean
}

export type Service = {
  id: string
  name: string
  price: number
  is_active: boolean
}

export type Transaction = {
  id: string
  employee_id: string
  service_id: string | null
  date: string
  service_name: string
  amount: number
  payment_method: PaymentMethod
  tip_amount: number
  note: string | null
  created_at: string
}

export type DayClosure = {
  id: string
  employee_id: string
  date: string
  total_cash: number
  total_card: number
  total_booksy_pay: number
  total_voucher: number
  total_tips: number
  note: string | null
  closed_at: string
}
