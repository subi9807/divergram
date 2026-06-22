import swaggerUi from 'swagger-ui-express';

function collectRoutes(appInstance) {
  const routes = [];
  const stack = appInstance?._router?.stack || [];
  for (const layer of stack) {
    if (!layer?.route?.path || !layer?.route?.methods) continue;
    const path = String(layer.route.path || '');
    for (const method of Object.keys(layer.route.methods)) {
      routes.push({ method: method.toLowerCase(), path });
    }
  }
  return routes;
}

function buildOpenApiSpec(app, req) {
  const routes = collectRoutes(app);
  const paths = {};
  for (const r of routes) {
    if (!paths[r.path]) paths[r.path] = {};
    paths[r.path][r.method] = {
      tags: [r.path.startsWith('/api/admin') ? 'admin' : (r.path.startsWith('/api/auth') ? 'auth' : 'api')],
      summary: `${r.method.toUpperCase()} ${r.path}`,
      responses: {
        200: { description: 'OK' },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        500: { description: 'Server Error' },
      },
      security: [{ bearerAuth: [] }],
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Divergram Local API',
      version: '1.0.0',
      description: '개발서버 내부 API 문서 (외부 API 미사용)',
    },
    servers: [{ url: `${req.protocol}://${req.get('host')}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };
}

export function registerDocsRoutes(app) {
  app.get('/api/docs.json', (req, res) => {
    return res.json(buildOpenApiSpec(app, req));
  });

  app.use('/api/docs', swaggerUi.serve, (req, res, next) => {
    const spec = buildOpenApiSpec(app, req);
    return swaggerUi.setup(spec, { explorer: true })(req, res, next);
  });
}
