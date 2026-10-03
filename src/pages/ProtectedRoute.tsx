import { Navigate } from 'react-router';
interface ProtectedRouteProps {
  children: React.ReactNode;

}
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
 

  if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
localStorage.setItem('isAuthenticated', 'true') 