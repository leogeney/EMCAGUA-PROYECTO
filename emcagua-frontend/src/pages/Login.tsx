import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('emcagua_user', JSON.stringify({ username: formData.username }))
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-80 h-80 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-between p-12 w-full">
          <div>
            <Logo size={52} light />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Portal Interno<br />
              <span className="text-primary-light">EMCAGUA APC</span>
            </h1>
            <p className="text-white/70 text-lg max-w-md">
              Sistema de gestión para trabajadores de El Carmen y Guamalito, Norte de Santander.
            </p>
          </div>
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} EMCAGUA APC. Acceso solo para personal autorizado.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-soft p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size={48} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-dark mb-1">Iniciar sesión</h2>
            <p className="text-gray-500 text-sm mb-8">Ingresa tus credenciales para acceder al sistema</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-dark mb-2">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="Ej: admin"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Tu contraseña"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-sm text-gray-500">Recordarme</span>
                </label>
                <a href="#" className="text-sm text-secondary hover:text-secondary-dark font-medium no-underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-secondary text-white font-semibold py-3 rounded-lg hover:bg-secondary-dark transition-colors"
              >
                Ingresar
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Acceso exclusivo para personal de EMCAGUA APC
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
