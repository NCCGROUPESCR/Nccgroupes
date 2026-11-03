import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('api')
export class HealthController {
  @Get('healthz')
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
