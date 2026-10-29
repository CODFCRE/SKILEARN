import { useState } from 'react'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'

const skills = []
const exchangeCategories = ['All', 'Tech', 'Arts', 'Academics', 'Languages']
export function Exchange() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = category === 'All' || skill.category === category
    const matchesQuery = `${skill.title} ${skill.person}`.toLowerCase().includes(normalizedQuery)
    return matchesCategory && matchesQuery
  })

  return (
    <Screen active="exchange">
      <Header />
      <main className="page exchange-page">
        <div className="search-wrap">
          <Icon>search</Icon>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search available skills..."
            aria-label="Search available skills"
          />
        </div>
        <div className="filter-row" role="group" aria-label="Skill categories">
          {exchangeCategories.map((item) => (
            <button
              key={item}
              className={category === item ? 'filter active' : 'filter'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {filteredSkills.length ? (
          <div className="skills-grid" />
        ) : (
          <EmptyState
            icon="search_off"
            title="No skills available yet"
            text="Published skill listings will appear here when they are available."
          />
        )}
      </main>
    </Screen>
  )
}

