import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import CourseDetail from './pages/CourseDetail'
import Courses from './pages/Courses'
import Dashboard from './pages/Dashboard'
import Exams from './pages/Exams'
import GamePlay from './pages/GamePlay'
import Games from './pages/Games'
import MockExam from './pages/MockExam'
import Progress from './pages/Progress'
import Review from './pages/Review'
import StudySession from './pages/StudySession'
import Tutor from './pages/Tutor'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/study" element={<StudySession />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:mode" element={<GamePlay />} />
          <Route path="/review" element={<Review />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/exams/:id/mock" element={<MockExam />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/tutor" element={<Tutor />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
