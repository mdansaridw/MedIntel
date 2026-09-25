import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import AdminPage from '../pages/admin/AdminPage'
import ChatbotPage from '../pages/chatbot/ChatbotPage'
import CohortDetailsPage from '../pages/cohorts/CohortDetailsPage'
import CohortsPage from '../pages/cohorts/CohortsPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import HomePage from '../pages/home/HomePage'
import KnowledgeGraphPage from '../pages/knowledge-graph/KnowledgeGraphPage'
import NotFoundPage from '../pages/not-found/NotFoundPage'
import PatientsPage from '../pages/patients/PatientsPage'
import PatientWorkspacePage from '../pages/patients/PatientWorkspacePage'
import PatientIntelligencePage from '../pages/treatment-intelligence/PatientIntelligencePage'
import TreatmentIntelligencePage from '../pages/treatment-intelligence/TreatmentIntelligencePage'
import SupplyChainPage from '../pages/supply-chain/SupplyChainPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: 'patients/:patientId', element: <PatientWorkspacePage /> },
      { path: 'cohorts', element: <CohortsPage /> },
      { path: 'cohorts/:cohortId', element: <CohortDetailsPage /> },
      { path: 'treatment-intelligence', element: <TreatmentIntelligencePage /> },
      { path: 'treatment-intelligence/:patientId', element: <PatientIntelligencePage /> },
      { path: 'knowledge-graph', element: <KnowledgeGraphPage /> },
      { path: 'supply-chain', element: <SupplyChainPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'chatbot', element: <ChatbotPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
