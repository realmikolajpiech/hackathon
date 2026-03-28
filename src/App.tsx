import { useGameStore } from './store/gameStore'
import OfficeScene from './scenes/OfficeScene'
import CityScene from './scenes/CityScene'
import InteriorScene3D from './scenes/InteriorScene3D'
import CaseSelectionScene from './scenes/CaseSelectionScene'
import ResolutionScene from './scenes/ResolutionScene'
import DetectiveOfficeScene from './scenes/DetectiveOfficeScene'

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <>
      {phase === 'menu' && <OfficeScene />}
      {phase === 'case_selection' && <CaseSelectionScene />}
      {phase === 'city' && <CityScene />}
      {phase === 'interior' && <InteriorScene3D />}
      {phase === 'detective_office' && <DetectiveOfficeScene />}
      {phase === 'resolution' && <ResolutionScene />}
    </>
  )
}
