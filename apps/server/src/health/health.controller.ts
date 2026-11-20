import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@orava/contracts';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { ok: true };
  }
}
