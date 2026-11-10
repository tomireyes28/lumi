# Etapa 6 · Validación final y portfolio

## C21 — Dependencias y herramientas

Se actualizaron herramientas compatibles y Next/eslint-config-next al parche 16.4.6. Se conservan Nest 11, Jest 30, TypeScript 5 y ESLint 9. brace-expansion quedó en versiones corregidas; minimatch de herramientas modernas usa 11.0.1 con override acotado (las ramas 3.x conservan su API). glob de CLI/cobertura/Jest usa 14.0.2, con reglas explícitas para las dos rutas anidadas que npm conservaba. Ambos paquetes admiten los runtimes Node del proyecto. Los cambios de mayor transitiva se validan con lint, builds, tests y cobertura; no se aplica audit fix --force ni un downgrade del runner.

Auditoría al 09/11/2026: frontend cero avisos; API ocho avisos bajos propagados desde una sola causa, deepmerge 4.3.1 (GHSA-gcqx-w48m-w2h4). La última versión publicada de deepmerge sigue siendo 4.3.1. Se consume únicamente al combinar configuración local de Jest/fork-ts-checker/Nest CLI, no en la aplicación desplegada. No se aceptan configuraciones de build/test aportadas por usuarios de la aplicación. Mantener el aviso visible y reevaluar un parche upstream; los downgrades sugeridos por audit a Jest 25/CLI 7 no constituyen una solución compatible. Fuente: https://github.com/advisories/GHSA-gcqx-w48m-w2h4. npm audit --omit=dev indica cero vulnerabilidades en ambos proyectos.

Validación inicial tras actualizar: 85 unitarios en UTC y Buenos Aires, tres escenarios HTTP, doce pruebas de frontend/BFF, 38 recorridos de Chromium escritorio/móvil, tipos, lint y ambos builds. Cobertura también se ejecuta para ejercitar la cadena de glob de Jest; no se confunde ese porcentaje unitario con la cobertura de integración.
