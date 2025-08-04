import Image from "next/image"
import { Search, MapPin, Calendar, Fuel, Settings, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function AutoOportunidadIA() {
  const carData = [
    {
      id: 1,
      image: "/placeholder.svg?height=200&width=300",
      title: "BMW Serie 3 320i",
      price: "$45,900",
      year: "2022",
      mileage: "15,000 km",
      fuel: "Gasolina",
      location: "Ciudad de México",
    },
    {
      id: 2,
      image: "/placeholder.svg?height=200&width=300",
      title: "Audi A4 2.0T Quattro",
      price: "$52,500",
      year: "2023",
      mileage: "8,500 km",
      fuel: "Gasolina",
      location: "Guadalajara",
    },
    {
      id: 3,
      image: "/placeholder.svg?height=200&width=300",
      title: "Mercedes-Benz GLC 300",
      price: "$68,900",
      year: "2022",
      mileage: "22,000 km",
      fuel: "Gasolina",
      location: "Monterrey",
    },
    {
      id: 4,
      image: "/placeholder.svg?height=200&width=300",
      title: "Toyota Camry Hybrid",
      price: "$38,900",
      year: "2023",
      mileage: "12,000 km",
      fuel: "Híbrido",
      location: "Puebla",
    },
    {
      id: 5,
      image: "/placeholder.svg?height=200&width=300",
      title: "Honda Civic Type R",
      price: "$42,900",
      year: "2022",
      mileage: "18,500 km",
      fuel: "Gasolina",
      location: "Tijuana",
    },
    {
      id: 6,
      image: "/placeholder.svg?height=200&width=300",
      title: "Volkswagen Jetta GLI",
      price: "$35,900",
      year: "2023",
      mileage: "9,800 km",
      fuel: "Gasolina",
      location: "Cancún",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold">
                💎 Auto Oportunidad <span className="text-blue-400">IA</span>
              </h1>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Inicio
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Buscar
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Vender
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Financiamiento
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Contacto
                </a>
              </nav>
            </div>
            <Button className="bg-white text-gray-900 hover:bg-gray-100 font-semibold">Login</Button>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-center mb-8 text-gray-200">
                Encuentra tu próximo auto con <span className="text-blue-400">IA</span>
              </h2>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">¿Qué auto buscas?</label>
                  <Input
                    placeholder="Marca, modelo o características..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-12"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ubicación</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Ciudad o estado..."
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pl-10 h-12"
                    />
                  </div>
                </div>
                <div className="w-full md:w-auto">
                  <Button className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold h-12 px-8">
                    <Search className="w-5 h-5 mr-2" />
                    Buscar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8">Oportunidades Recientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {carData.map((car) => (
              <Card
                key={car.id}
                className="bg-gray-800 border-gray-700 hover:transform hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden"
              >
                <div className="relative">
                  <Image
                    src={car.image || "/placeholder.svg"}
                    alt={car.title}
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Oportunidad
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{car.title}</h3>
                  <p className="text-3xl font-bold text-blue-400 mb-4">{car.price}</p>

                  <hr className="border-gray-700 mb-4" />

                  <div className="space-y-2 text-gray-300 text-sm mb-6">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{car.year}</span>
                    </div>
                    <div className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      <span>{car.mileage}</span>
                    </div>
                    <div className="flex items-center">
                      <Fuel className="w-4 h-4 mr-2" />
                      <span>{car.fuel}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{car.location}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent"
                  >
                    Ver detalles
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">
                💎 Auto Oportunidad <span className="text-blue-400">IA</span>
              </h3>
              <p className="text-gray-400">La plataforma inteligente para encontrar tu auto ideal.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Explorar</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Autos usados
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Autos nuevos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Financiamiento
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Seguros
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Centro de ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Términos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacidad
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Síguenos</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <hr className="border-gray-700 my-8" />
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Auto Oportunidad IA. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
