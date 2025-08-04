# 📚 Documentación de Garage AI

## Sistema de Agentes Autónomos para Scraping Inteligente del Mercado Automotriz

### 🎯 Visión General

Garage AI es una plataforma revolucionaria que utiliza **agentes de inteligencia artificial autónomos** para automatizar completamente la extracción, análisis y presentación de datos del mercado automotriz argentino. 

A diferencia de los scrapers tradicionales, nuestro sistema aprende y se adapta continuamente, siendo capaz de:

- 🤖 **Auto-descubrir** nuevas fuentes de datos
- 🧠 **Comprender** estructuras web complejas sin programación manual
- 🔄 **Adaptarse** automáticamente a cambios en los sitios
- 📊 **Analizar** y enriquecer datos con IA avanzada
- 🎯 **Identificar** oportunidades de inversión automáticamente

### 📁 Estructura de la Documentación

1. **[Arquitectura del Sistema](./01-arquitectura.md)**
   - Diseño de agentes autónomos
   - Flujo de trabajo inteligente
   - Componentes principales

2. **[Agentes de IA](./02-agentes-ia.md)**
   - Agente Orquestador
   - Agente Explorador
   - Agente Analizador
   - Agente Extractor
   - Agente Validador

3. **[Stack Tecnológico](./03-stack-tecnologico.md)**
   - Frontend (Next.js + Vercel)
   - Backend (Edge Functions + Cloud Run)
   - IA (Claude API + DeepInfra)
   - Base de datos (Supabase)

4. **[Implementación](./04-implementacion.md)**
   - Configuración inicial
   - Despliegue
   - Variables de entorno

5. **[Costos y Escalamiento](./05-costos-escalamiento.md)**
   - Análisis de costos reales
   - Estrategia de bootstrap
   - Plan de escalamiento

6. **[API y Endpoints](./06-api-endpoints.md)**
   - Documentación de la API
   - Ejemplos de uso
   - Webhooks

7. **[Guía de Desarrollo](./07-guia-desarrollo.md)**
   - Configuración del entorno
   - Flujo de desarrollo
   - Testing

8. **[Casos de Uso](./08-casos-uso.md)**
   - Concesionarias
   - Marketplaces
   - Análisis de mercado

9. **[Roadmap](./09-roadmap.md)**
   - MVP
   - Fases de desarrollo
   - Funcionalidades futuras

10. **[FAQ y Troubleshooting](./10-faq-troubleshooting.md)**
    - Preguntas frecuentes
    - Solución de problemas
    - Optimizaciones

### 🚀 Quick Start

```bash
# Clonar el repositorio
git clone https://github.com/Montinou/garage-ai.git
cd garage-ai

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar desarrollo
pnpm dev
```

### 🎨 Características Principales

- **🤖 Agentes Autónomos**: Sistema multi-agente que trabaja de forma independiente
- **🧠 Comprensión Semántica**: Entiende el contenido, no solo extrae texto
- **🔄 Auto-adaptativo**: Aprende de errores y mejora continuamente
- **📈 Análisis Predictivo**: Identifica tendencias y oportunidades
- **🌐 Multi-fuente**: Maneja cualquier tipo de sitio web automáticamente
- **⚡ Tiempo Real**: Actualizaciones y alertas instantáneas

### 📞 Contacto y Soporte

- **GitHub Issues**: [Reportar problemas](https://github.com/Montinou/garage-ai/issues)
- **Discusiones**: [Comunidad](https://github.com/Montinou/garage-ai/discussions)

---

*Última actualización: Diciembre 2024*