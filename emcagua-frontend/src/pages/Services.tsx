const services = [
  {
    title: 'Agua Potable',
    description: 'Provision continua de agua potable de alta calidad para consumo humano y domestico.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    features: ['Analisis de calidad periodico', 'Cobertura en 2 cantones', 'Red de distribucion optimizada', 'Monitoreo continuo'],
    color: 'primary',
  },
  {
    title: 'Alcantarillado',
    description: 'Sistema de recoleccion y evacuacion de aguas residuales para mantener la salud publica.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    features: ['Recoleccion eficiente', 'Tratamiento de aguas residuales', 'Red de tuberias principal', 'Mantenimiento preventivo'],
    color: 'secondary',
  },
  {
    title: 'Saneamiento',
    description: 'Programas integrales de saneamiento ambiental para el bienestar de la comunidad.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    features: ['Control de calidad sanitaria', 'Educacion sanitaria', 'Inspecciones regulares', 'Proteccion de fuentes'],
    color: 'secondary',
  },
  {
    title: 'Facturacion',
    description: 'Sistema de facturacion transparente con multiples canales de pago.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
    features: ['Facturacion electronica', 'Pagos en linea', 'Consulta de consumos', 'Planes de facilidades'],
    color: 'primary',
  },
  {
    title: 'Atencion al Cliente',
    description: 'Servicio de atencion y soporte para consultas, reclamos y solicitudes.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    features: ['Atencion personalizada', 'Linea de emergencias', 'Gestion de reclamos', 'Seguimiento de solicitudes'],
    color: 'secondary',
  },
  {
    title: 'Mantenimiento',
    description: 'Servicio tecnico especializado para la infraestructura de agua y saneamiento.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    features: ['Reparacion de fugas', 'Mantenimiento preventivo', 'Emergencias 24/7', 'Red de distribucion'],
    color: 'secondary',
  },
]

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  secondary: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
}

export default function Services() {
  return (
    <div>
      <section className="bg-gradient-to-br from-secondary-dark to-secondary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Servicios</h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Ofrecemos un portafolio completo de servicios de agua potable y saneamiento.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => {
              const colors = colorMap[service.color]
              return (
                <div
                  key={service.title}
                  className={`rounded-2xl p-8 border ${colors.border} hover:shadow-lg transition-shadow bg-white`}
                >
                  <div className={`w-16 h-16 ${colors.bg} ${colors.text} rounded-2xl flex items-center justify-center mb-6`}>
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-3">{service.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className={`w-4 h-4 ${colors.text} shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
