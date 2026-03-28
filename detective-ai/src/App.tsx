import { useGameStore } from './store/gameStore'
import OfficeScene from './scenes/OfficeScene'
import CityScene from './scenes/CityScene'
import ResolutionScene from './scenes/ResolutionScene'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <>
      {(phase === 'menu' || phase === 'office') && <OfficeScene apiKey={API_KEY} />}
      {phase === 'city' && <CityScene apiKey={API_KEY} />}
      {phase === 'dialogue' && <CityScene apiKey={API_KEY} />}
      {phase === 'resolution' && <ResolutionScene />}
    </>
  )
}
