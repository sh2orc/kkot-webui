export type TimezoneItem = {
  offsetMinutes: number
  primaryCity: string
  cities: string[]
}

// Curated list of representative cities per GMT offset (handles popular zones and quarter-hour offsets)
export const TIMEZONES: TimezoneItem[] = [
  { offsetMinutes: -12 * 60, primaryCity: 'Baker Island', cities: ['Baker Island', 'Howland Island'] },
  { offsetMinutes: -11 * 60, primaryCity: 'Pago Pago', cities: ['Pago Pago', 'Midway', 'Samoa'] },
  { offsetMinutes: -10 * 60, primaryCity: 'Honolulu', cities: ['Honolulu', 'Hilo', 'Papeete', 'Tahiti'] },
  { offsetMinutes: -9 * 60, primaryCity: 'Anchorage', cities: ['Anchorage', 'Juneau', 'Fairbanks'] },
  { offsetMinutes: -9 * 60 - 30, primaryCity: 'Marquesas', cities: ['Marquesas'] },
  { offsetMinutes: -8 * 60, primaryCity: 'Los Angeles', cities: ['Los Angeles', 'San Francisco', 'Vancouver', 'Tijuana', 'Las Vegas', 'Seattle'] },
  { offsetMinutes: -7 * 60, primaryCity: 'Denver', cities: ['Denver', 'Phoenix', 'Calgary', 'Edmonton', 'Salt Lake City'] },
  { offsetMinutes: -6 * 60, primaryCity: 'Chicago', cities: ['Chicago', 'Mexico City', 'Winnipeg', 'Guatemala City', 'San José (CR)'] },
  { offsetMinutes: -5 * 60, primaryCity: 'New York', cities: ['New York', 'Toronto', 'Lima', 'Bogotá', 'Havana', 'Kingston'] },
  { offsetMinutes: -4 * 60, primaryCity: 'Santiago', cities: ['Santiago', 'Caracas', 'La Paz', 'Santo Domingo', 'Halifax'] },
  { offsetMinutes: -3 * 60 - 30, primaryCity: 'St. John’s', cities: ["St. John's", 'Newfoundland'] },
  { offsetMinutes: -3 * 60, primaryCity: 'São Paulo', cities: ['São Paulo', 'Buenos Aires', 'Montevideo', 'Brasília'] },
  { offsetMinutes: -2 * 60, primaryCity: 'South Georgia', cities: ['South Georgia', 'Fernando de Noronha'] },
  { offsetMinutes: -1 * 60, primaryCity: 'Azores', cities: ['Azores', 'Cape Verde'] },
  { offsetMinutes: 0, primaryCity: 'London', cities: ['London', 'Dublin', 'Lisbon', 'Accra', 'Abidjan', 'Casablanca'] },
  { offsetMinutes: 1 * 60, primaryCity: 'Berlin', cities: ['Berlin', 'Paris', 'Madrid', 'Rome', 'Warsaw', 'Stockholm', 'Prague', 'Vienna', 'Brussels', 'Amsterdam', 'Copenhagen', 'Oslo', 'Budapest', 'Zurich', 'Lagos'] },
  { offsetMinutes: 2 * 60, primaryCity: 'Athens', cities: ['Athens', 'Cairo', 'Johannesburg', 'Bucharest', 'Kyiv', 'Jerusalem', 'Helsinki', 'Sofia', 'Riga', 'Vilnius'] },
  { offsetMinutes: 3 * 60, primaryCity: 'Moscow', cities: ['Moscow', 'Istanbul', 'Nairobi', 'Doha', 'Riyadh', 'Minsk', 'Baghdad', 'Kuwait City'] },
  { offsetMinutes: 3 * 60 + 30, primaryCity: 'Tehran', cities: ['Tehran'] },
  { offsetMinutes: 4 * 60, primaryCity: 'Dubai', cities: ['Dubai', 'Baku', 'Tbilisi', 'Yerevan', 'Samara', 'Muscat'] },
  { offsetMinutes: 4 * 60 + 30, primaryCity: 'Kabul', cities: ['Kabul'] },
  { offsetMinutes: 5 * 60, primaryCity: 'Karachi', cities: ['Karachi', 'Tashkent', 'Yekaterinburg', 'Ashgabat'] },
  { offsetMinutes: 5 * 60 + 30, primaryCity: 'New Delhi', cities: ['New Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad'] },
  { offsetMinutes: 5 * 60 + 45, primaryCity: 'Kathmandu', cities: ['Kathmandu'] },
  { offsetMinutes: 6 * 60, primaryCity: 'Dhaka', cities: ['Dhaka', 'Almaty', 'Omsk'] },
  { offsetMinutes: 6 * 60 + 30, primaryCity: 'Yangon', cities: ['Yangon', 'Cocos Islands'] },
  { offsetMinutes: 7 * 60, primaryCity: 'Bangkok', cities: ['Bangkok', 'Jakarta', 'Hanoi', 'Ho Chi Minh City', 'Krasnoyarsk', 'Phnom Penh'] },
  { offsetMinutes: 8 * 60, primaryCity: 'Beijing', cities: ['Beijing', 'Shanghai', 'Singapore', 'Kuala Lumpur', 'Perth', 'Taipei', 'Manila', 'Hong Kong', 'Ulaanbaatar'] },
  { offsetMinutes: 8 * 60 + 45, primaryCity: 'Eucla', cities: ['Eucla'] },
  { offsetMinutes: 9 * 60, primaryCity: 'Seoul', cities: ['Seoul', 'Tokyo', 'Osaka', 'Pyongyang', 'Yakutsk'] },
  { offsetMinutes: 9 * 60 + 30, primaryCity: 'Adelaide', cities: ['Adelaide', 'Darwin'] },
  { offsetMinutes: 10 * 60, primaryCity: 'Sydney', cities: ['Sydney', 'Brisbane', 'Guam', 'Port Moresby', 'Vladivostok'] },
  { offsetMinutes: 10 * 60 + 30, primaryCity: 'Lord Howe', cities: ['Lord Howe'] },
  { offsetMinutes: 11 * 60, primaryCity: 'Noumea', cities: ['Noumea', 'Magadan', 'Solomon Islands', 'Sakhalin'] },
  { offsetMinutes: 12 * 60, primaryCity: 'Auckland', cities: ['Auckland', 'Suva', 'Fiji', 'Anadyr'] },
  { offsetMinutes: 12 * 60 + 45, primaryCity: 'Chatham', cities: ['Chatham'] },
  { offsetMinutes: 13 * 60, primaryCity: 'Nukuʻalofa', cities: ['Nukuʻalofa', 'Apia'] },
  { offsetMinutes: 14 * 60, primaryCity: 'Kiritimati', cities: ['Kiritimati'] },
]

export function getPrimaryCityForOffset(offsetMinutes: number): string | null {
  const match = TIMEZONES.find(t => t.offsetMinutes === offsetMinutes)
  return match ? match.primaryCity : null
}

export function getCitiesForOffset(offsetMinutes: number): string[] {
  const match = TIMEZONES.find(t => t.offsetMinutes === offsetMinutes)
  return match ? match.cities : []
}


