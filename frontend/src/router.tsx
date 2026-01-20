import { createBrowserRouter } from 'react-router-dom';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/news/:id',
    element: <Detail />,
  },
]);
