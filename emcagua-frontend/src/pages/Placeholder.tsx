type PlaceholderProps = {
  title: string
  description?: string
}

export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-dark mb-2">{title}</h1>
      <p className="text-gray-500 text-sm mb-8">{description ?? 'Este modulo estara disponible proximamente.'}</p>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="font-semibold text-dark mb-2">En construccion</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Estamos trabajando en el modulo de {title.toLowerCase()}. Estara disponible en la proxima actualizacion.
        </p>
      </div>
    </div>
  )
}
