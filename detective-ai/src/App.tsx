import { useGameStore } from './store/gameStore'
import OfficeScene from './scenes/OfficeScene'
import CityScene from './scenes/CityScene'
import InteriorScene from './scenes/InteriorScene'
import CaseSelectionScene from './scenes/CaseSelectionScene'
import ResolutionScene from './scenes/ResolutionScene'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <>
      {phase === 'menu' && <OfficeScene apiKey={API_KEY} />}
      {phase === 'case_selection' && <CaseSelectionScene apiKey={API_KEY} />}
      {phase === 'city' && <CityScene apiKey={API_KEY} />}
      {phase === 'interior' && <InteriorScene apiKey={API_KEY} />}
      {phase === 'resolution' && <ResolutionScene />}
    </>
  )
}
