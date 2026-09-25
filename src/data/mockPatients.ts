import type { Patient, PatientSex, PatientStatus } from '../types/clinical'
import { mockCohorts } from './mockCohorts'

const firstNames = [
  'Aarav',
  'Mia',
  'Noah',
  'Zoya',
  'Ethan',
  'Anaya',
  'Leo',
  'Ivy',
  'Samir',
  'Chloe',
  'Maya',
  'Daniel',
  'Nora',
  'Ravi',
  'Elena',
  'Theo',
  'Leila',
  'Owen',
  'Aisha',
  'Lucas',
  'Mei',
  'Henry',
  'Sofia',
  'Amir',
  'Clara',
  'Mateo',
  'Hana',
  'Jonah',
  'Priya',
  'Eli',
]

const lastNames = [
  'Patel',
  'Morgan',
  'Williams',
  'Rahman',
  'Chen',
  'Garcia',
  'Bennett',
  'Okafor',
  'Khan',
  'Silva',
  'Kim',
  'Walker',
  'Brown',
  'Shah',
  'Davis',
  'Wilson',
  'Hassan',
  'Clark',
  'Khan',
  'Martin',
  'Lee',
  'Taylor',
  'Martinez',
  'Ahmed',
  'White',
  'Lopez',
  'Sato',
  'Anderson',
  'Kapoor',
  'Thomas',
]

const streets = [
  'Harbor View Road',
  'Cedar Lane',
  'Maple Avenue',
  'Juniper Street',
  'Willow Court',
  'Highland Drive',
  'Garden Crescent',
  'Riverwalk Boulevard',
  'Orchard Way',
  'Chestnut Place',
]

const cities = [
  'Cambridge, MA',
  'Boston, MA',
  'Somerville, MA',
  'Newton, MA',
  'Medford, MA',
  'Quincy, MA',
]

const sexes: PatientSex[] = ['Male', 'Female', 'Other']
const statuses: PatientStatus[] = ['Stable', 'Monitoring', 'Critical']

function getConditionIds(index: number) {
  const ids = [
    mockCohorts[index % mockCohorts.length].id,
    mockCohorts[(index + 30) % mockCohorts.length].id,
  ]

  if (index % 2 === 0) {
    ids.push(mockCohorts[(index * 7 + 13) % mockCohorts.length].id)
  }

  if (index % 5 === 0) {
    ids.push(mockCohorts[(index * 11 + 3) % mockCohorts.length].id)
  }

  return [...new Set(ids)]
}

export const mockPatients: Patient[] = Array.from({ length: 30 }, (_, index) => {
  const id = `Patient${String(index + 1).padStart(3, '0')}`

  return {
    id,
    name: `${firstNames[index]} ${lastNames[index]}`,
    mobile: `(555) ${String(100 + index).padStart(3, '0')}-${String(1000 + index).padStart(4, '0')}`,
    address: `${108 + index * 7} ${streets[index % streets.length]}, ${cities[index % cities.length]}`,
    age: 24 + ((index * 7) % 46),
    sex: sexes[index % sexes.length],
    conditionIds: getConditionIds(index),
    lastConsultation: new Date(Date.UTC(2026, 8, 25 - index)).toISOString(),
    status: statuses[index % statuses.length],
  }
})

export function getPatientById(patientId: string) {
  return mockPatients.find((patient) => patient.id === patientId)
}

export function getPatientsByCondition(conditionId: string) {
  return mockPatients.filter((patient) => patient.conditionIds.includes(conditionId))
}

export function getPrimaryCondition(patient: Patient) {
  return mockCohorts.find((cohort) => cohort.id === patient.conditionIds[0]) ?? mockCohorts[0]
}
