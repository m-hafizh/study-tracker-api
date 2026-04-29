export const openApiRefs = {
  errorResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Validation failed' },
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      details: { type: 'object', additionalProperties: true }
    },
    required: ['message', 'code', 'details']
  },
  noContentResponse: {
    type: 'null',
    description: 'Request processed successfully. No response body.'
  }
} as const;
