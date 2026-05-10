import { Employee, Service } from './types'

export const demoEmployees: Employee[] = [
  { id: 'demo-michal', name: 'Michał', role: 'employee', commission_percent: 46, is_active: true },
  { id: 'demo-wiktor', name: 'Wiktor', role: 'employee', commission_percent: 46, is_active: true },
  { id: 'demo-ahmed', name: 'Ahmed', role: 'employee', commission_percent: 46, is_active: true },
  { id: 'demo-ola', name: 'Ola', role: 'employee', commission_percent: 46, is_active: true },
]

export const demoServices: Service[] = [
  { id: 'demo-strzyzenie', name: 'Strzyżenie włosów', price: 90, is_active: true },
  { id: 'demo-broda', name: 'Broda', price: 70, is_active: true },
  { id: 'demo-combo-trymer', name: 'Combo trymer', price: 140, is_active: true },
  { id: 'demo-combo-brzytwa', name: 'Combo brzytwa', price: 150, is_active: true },
  { id: 'demo-wosk', name: 'Depilacja woskiem jedna partia', price: 30, is_active: true },
]
