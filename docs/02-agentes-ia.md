# 🤖 Agentes de Inteligencia Artificial

## Sistema Multi-Agente Autónomo

### 🎯 Filosofía de Diseño

Cada agente en Garage AI está diseñado con principios específicos:

1. **Autonomía**: Capacidad de tomar decisiones independientes
2. **Especialización**: Enfoque en tareas específicas
3. **Colaboración**: Comunicación efectiva con otros agentes
4. **Aprendizaje**: Mejora continua basada en experiencias

### 🎭 Agente Orquestador (Orchestrator Agent)

#### **Responsabilidades**
- Coordinar todos los agentes del sistema
- Tomar decisiones estratégicas de alto nivel
- Gestionar la cola de trabajos
- Optimizar el uso de recursos

#### **Implementación**

```typescript
class OrchestratorAgent extends BaseAgent {
  private agents: Map<string, BaseAgent>;
  private memory: AgentMemory;
  private strategies: StrategyEngine;
  
  async processJob(job: ScrapingJob): Promise<ScrapingResult> {
    // 1. Analizar el trabajo
    const analysis = await this.analyzeJob(job);
    
    // 2. Seleccionar estrategia óptima
    const strategy = await this.strategies.selectOptimal(analysis);
    
    // 3. Crear pipeline de ejecución
    const pipeline = this.createPipeline(strategy);
    
    // 4. Ejecutar con monitoreo
    const result = await this.executePipeline(pipeline, job);
    
    // 5. Aprender del resultado
    await this.learn(job, result);
    
    return result;
  }
  
  private async analyzeJob(job: ScrapingJob) {
    // Usar Claude para análisis profundo
    const prompt = `
      Analiza este trabajo de scraping:
      - URL: ${job.url}
      - Tipo de datos: ${job.dataType}
      - Prioridad: ${job.priority}
      
      Determina:
      1. Complejidad estimada
      2. Estrategia recomendada
      3. Recursos necesarios
      4. Riesgos potenciales
    `;
    
    return await this.claudeService.analyze(prompt);
  }
}
```

### 🔍 Agente Explorador (Explorer Agent)

#### **Responsabilidades**
- Navegación inteligente de sitios web
- Detección de estructuras y patrones
- Identificación de datos relevantes
- Manejo de desafíos (captchas, auth, etc.)

#### **Capacidades Especiales**

```typescript
class ExplorerAgent extends BaseAgent {
  private browser: PlaywrightBrowser;
  private vision: ComputerVisionService;
  
  async explore(url: string): Promise<ExplorationResult> {
    const page = await this.browser.newPage();
    
    try {
      // Configurar interceptores
      await this.setupInterceptors(page);
      
      // Navegar con estrategias de fallback
      await this.smartNavigation(page, url);
      
      // Capturar estado completo
      const state = await this.captureFullState(page);
      
      // Análisis visual
      const visualAnalysis = await this.analyzeVisually(state);
      
      // Detectar desafíos
      const challenges = await this.detectChallenges(page);
      
      return {
        state,
        visualAnalysis,
        challenges,
        recommendations: await this.generateRecommendations(state)
      };
    } finally {
      await page.close();
    }
  }
  
  private async analyzeVisually(state: PageState) {
    // Usar Computer Vision para entender la página
    const screenshot = state.screenshot;
    
    const analysis = await this.vision.analyze(screenshot, {
      detectGrids: true,
      findDataRegions: true,
      identifyNavigation: true,
      extractColorScheme: true
    });
    
    // Enriquecer con IA
    return await this.enrichWithAI(analysis, state);
  }
  
  private async detectChallenges(page: Page) {
    const challenges = [];
    
    // Detectar CAPTCHA
    if (await this.hasCaptcha(page)) {
      challenges.push({
        type: 'captcha',
        solver: 'ai_vision_solver',
        confidence: 0.85
      });
    }
    
    // Detectar login requerido
    if (await this.requiresAuth(page)) {
      challenges.push({
        type: 'authentication',
        method: await this.detectAuthMethod(page)
      });
    }
    
    // Detectar carga dinámica
    if (await this.hasDynamicLoading(page)) {
      challenges.push({
        type: 'dynamic_content',
        strategy: 'wait_and_intercept'
      });
    }
    
    return challenges;
  }
}
```

### 🧠 Agente Analizador (Analyzer Agent)

#### **Responsabilidades**
- Comprensión semántica de estructuras
- Identificación de patrones de datos
- Generación de estrategias de extracción
- Comparación con patrones conocidos

#### **Motor de Análisis**

```typescript
class AnalyzerAgent extends BaseAgent {
  private nlp: NLPService;
  private patternMatcher: PatternMatcher;
  
  async analyze(exploration: ExplorationResult): Promise<AnalysisResult> {
    // 1. Análisis multi-modal
    const analyses = await Promise.all([
      this.analyzeStructure(exploration),
      this.analyzeSemantics(exploration),
      this.analyzePatterns(exploration),
      this.analyzeSimilarity(exploration)
    ]);
    
    // 2. Fusión inteligente
    const fusedAnalysis = await this.fuseAnalyses(analyses);
    
    // 3. Generación de estrategia
    const strategy = await this.generateStrategy(fusedAnalysis);
    
    return {
      analysis: fusedAnalysis,
      strategy,
      confidence: this.calculateConfidence(fusedAnalysis),
      alternativeStrategies: await this.generateAlternatives(fusedAnalysis)
    };
  }
  
  private async analyzeSemantics(exploration: ExplorationResult) {
    const prompt = `
      Analiza semánticamente esta página web:
      
      Estructura detectada:
      ${JSON.stringify(exploration.visualAnalysis.structure)}
      
      Texto de muestra:
      ${exploration.state.text.substring(0, 2000)}
      
      Identifica:
      1. Tipo de contenido (productos, servicios, listados)
      2. Campos de datos presentes
      3. Jerarquía de información
      4. Patrones de navegación
      5. Metadatos relevantes
    `;
    
    const semanticAnalysis = await this.claudeService.analyze(prompt);
    
    return {
      ...semanticAnalysis,
      entities: await this.nlp.extractEntities(exploration.state.text),
      topics: await this.nlp.classifyTopics(exploration.state.text)
    };
  }
}
```

### ⚡ Agente Extractor (Extractor Agent)

#### **Responsabilidades**
- Ejecución de estrategias de extracción
- Manejo de múltiples técnicas de scraping
- Adaptación en tiempo real
- Optimización de rendimiento

#### **Estrategias de Extracción**

```typescript
class ExtractorAgent extends BaseAgent {
  private strategies: Map<string, ExtractionStrategy>;
  
  constructor() {
    super();
    this.strategies = new Map([
      ['visual_semantic', new VisualSemanticStrategy()],
      ['pure_ai', new PureAIStrategy()],
      ['pattern_based', new PatternBasedStrategy()],
      ['api_intercept', new APIInterceptStrategy()],
      ['hybrid_adaptive', new HybridAdaptiveStrategy()]
    ]);
  }
  
  async extract(analysis: AnalysisResult, target: DataTarget): Promise<ExtractedData> {
    const strategy = this.strategies.get(analysis.strategy.type);
    
    if (!strategy) {
      throw new Error(`Strategy ${analysis.strategy.type} not found`);
    }
    
    // Configurar estrategia
    strategy.configure({
      selectors: analysis.strategy.selectors,
      patterns: analysis.strategy.patterns,
      aiModel: analysis.strategy.aiModel || 'claude-3-opus',
      confidence: analysis.confidence
    });
    
    // Ejecutar extracción con reintentos inteligentes
    const result = await this.executeWithRetry(async () => {
      const page = await this.browser.newPage();
      
      try {
        // Navegar y preparar
        await this.preparePageForExtraction(page, analysis);
        
        // Extraer datos
        const rawData = await strategy.extract(page, target);
        
        // Post-procesar con IA
        return await this.postProcessWithAI(rawData, target);
        
      } finally {
        await page.close();
      }
    });
    
    return result;
  }
  
  private async postProcessWithAI(rawData: any[], target: DataTarget) {
    const prompt = `
      Procesa y enriquece estos datos extraídos de ${target.type}:
      
      ${JSON.stringify(rawData.slice(0, 5), null, 2)}
      
      Para cada item:
      1. Normaliza los campos
      2. Extrae información implícita
      3. Calcula campos derivados
      4. Identifica anomalías
      5. Asigna score de calidad
      
      Retorna un array de objetos procesados.
    `;
    
    const enrichedData = await this.aiService.process(prompt);
    
    return {
      data: enrichedData,
      metadata: {
        extractedAt: new Date(),
        source: target.source,
        quality: this.assessQuality(enrichedData),
        completeness: this.assessCompleteness(enrichedData, target)
      }
    };
  }
}
```

### ✅ Agente Validador (Validator Agent)

#### **Responsabilidades**
- Validación de calidad de datos
- Detección de anomalías
- Corrección automática
- Generación de reportes de calidad

#### **Sistema de Validación**

```typescript
class ValidatorAgent extends BaseAgent {
  private rules: ValidationRuleEngine;
  private ml: MLValidationService;
  
  async validate(data: ExtractedData, schema: DataSchema): Promise<ValidationResult> {
    // 1. Validación estructural
    const structural = await this.validateStructure(data, schema);
    
    // 2. Validación semántica
    const semantic = await this.validateSemantics(data, schema);
    
    // 3. Validación de negocio
    const business = await this.validateBusinessRules(data);
    
    // 4. Detección de anomalías con ML
    const anomalies = await this.detectAnomalies(data);
    
    // 5. Auto-corrección
    const corrected = await this.autoCorrect(data, [
      ...structural.errors,
      ...semantic.errors,
      ...anomalies
    ]);
    
    return {
      valid: structural.valid && semantic.valid && business.valid,
      score: this.calculateQualityScore(structural, semantic, business),
      data: corrected.data,
      corrections: corrected.corrections,
      report: this.generateReport(structural, semantic, business, anomalies)
    };
  }
  
  private async autoCorrect(data: ExtractedData, issues: ValidationIssue[]) {
    if (issues.length === 0) {
      return { data: data.data, corrections: [] };
    }
    
    const prompt = `
      Corrige automáticamente estos problemas en los datos:
      
      Datos originales:
      ${JSON.stringify(data.data.slice(0, 10), null, 2)}
      
      Problemas encontrados:
      ${JSON.stringify(issues, null, 2)}
      
      Aplica las correcciones necesarias manteniendo la integridad de los datos.
      Documenta cada corrección realizada.
    `;
    
    const result = await this.aiService.correct(prompt);
    
    return {
      data: result.correctedData,
      corrections: result.corrections
    };
  }
}
```

### 🧩 Comunicación Inter-Agentes

#### **Protocolo de Mensajería**

```typescript
interface AgentMessage {
  id: string;
  from: string;
  to: string | string[];
  type: 'request' | 'response' | 'event' | 'broadcast';
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
}

class AgentCommunicationBus {
  private subscribers: Map<string, Set<MessageHandler>>;
  
  async publish(message: AgentMessage) {
    // Enrutar mensaje a destinatarios
    const handlers = this.getHandlers(message.to);
    
    // Procesar en paralelo con prioridad
    await this.processWithPriority(message, handlers);
    
    // Log para auditoría
    await this.logMessage(message);
  }
  
  subscribe(agentId: string, handler: MessageHandler) {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }
    this.subscribers.get(agentId).add(handler);
  }
}
```

### 🎓 Sistema de Aprendizaje

#### **Memoria Compartida**

```typescript
class AgentMemory {
  private shortTerm: Cache; // Redis
  private longTerm: VectorDB; // Pinecone
  private patterns: PatternRegistry;
  
  async remember(experience: Experience) {
    // Almacenar en memoria a corto plazo
    await this.shortTerm.set(experience.id, experience, '24h');
    
    // Si es significativo, persistir
    if (experience.significance > 0.7) {
      const embedding = await this.embed(experience);
      await this.longTerm.upsert({
        id: experience.id,
        values: embedding,
        metadata: experience.metadata
      });
    }
    
    // Actualizar patrones
    if (experience.type === 'pattern') {
      await this.patterns.register(experience.pattern);
    }
  }
  
  async recall(context: Context, k: number = 5) {
    // Buscar experiencias relevantes
    const embedding = await this.embed(context);
    const similar = await this.longTerm.query({
      vector: embedding,
      topK: k,
      includeMetadata: true
    });
    
    // Enriquecer con contexto
    return similar.matches.map(match => ({
      ...match.metadata,
      relevance: match.score,
      applicability: this.assessApplicability(match.metadata, context)
    }));
  }
}
```

### 📊 Métricas y Performance

```typescript
class AgentMetrics {
  private metrics = {
    explorationSuccess: new Counter('agent_exploration_success'),
    analysisAccuracy: new Gauge('agent_analysis_accuracy'),
    extractionRate: new Histogram('agent_extraction_rate'),
    validationQuality: new Gauge('agent_validation_quality'),
    adaptationSpeed: new Histogram('agent_adaptation_speed')
  };
  
  async report() {
    return {
      exploration: {
        successRate: await this.metrics.explorationSuccess.get(),
        avgTime: await this.getAverageTime('exploration')
      },
      analysis: {
        accuracy: await this.metrics.analysisAccuracy.get(),
        patternsLearned: await this.getPatternsCount()
      },
      extraction: {
        itemsPerSecond: await this.metrics.extractionRate.get(),
        successRate: await this.getExtractionSuccess()
      },
      validation: {
        qualityScore: await this.metrics.validationQuality.get(),
        autocorrectRate: await this.getAutocorrectRate()
      }
    };
  }
}
```

---

*Siguiente: [Stack Tecnológico →](./03-stack-tecnologico.md)*