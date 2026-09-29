import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans" style={{backgroundColor:'var(--bg)'}}>
      <div className="text-center max-w-md">
        {/* Big 404 */}
        <p className="text-[120px] font-black leading-none bg-gradient-to-br from-teal-500 to-teal-700 bg-clip-text text-transparent select-none">
          404
        </p>

        <h1 className="text-2xl font-bold text-stone-900 mt-2 mb-3">
          Page not found
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
